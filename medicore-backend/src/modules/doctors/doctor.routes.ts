import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { AppError, NotFound } from '../../shared/errors/AppError';
import { asyncHandler, ok } from '../../shared/utils/response';
import { audit } from '../audit-logs/audit.service';
import { hashPassword } from '../auth/auth.service';
import { Prisma } from '@prisma/client';
import {
  getLocalDate,
  getLocalTime,
  validateTimezone,
} from '../../shared/utils/timezone';

export const doctorRoutes = Router();

const timeSchema = z.string().regex(
  /^([01]\d|2[0-3]):[0-5]\d$/,
  'Time must be in 24-hour HH:mm format',
);

const createDoctorSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  password: z.string().min(10, 'Password must be at least 10 characters'),
  departmentId: z.string().min(1),
  licenseNumber: z.string().trim().min(2).max(100),
  specialization: z.string().trim().min(2).max(120),
  qualification: z.string().trim().max(200).optional(),
  consultationFee: z.coerce.number().finite().min(0).default(0),
  experienceYears: z.coerce.number().int().min(0).max(80).default(0),
});

const updateDoctorSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  departmentId: z.string().min(1).optional(),
  licenseNumber: z.string().trim().min(2).max(100).optional(),
  specialization: z.string().trim().min(2).max(120).optional(),
  qualification: z.string().trim().max(200).nullable().optional(),
  consultationFee: z.coerce.number().finite().min(0).optional(),
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
}).refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
});

const listDoctorsSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ALL']).default('ACTIVE'),
  search: z.string().trim().max(100).optional(),
});

const scheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeSchema,
  endTime: timeSchema,
  slotMinutes: z.number().int().min(5).max(120).default(15),
}).refine((s) => s.startTime < s.endTime, {
  message: 'End time must be later than start time',
  path: ['endTime'],
});

const updateScheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  slotMinutes: z.number().int().min(5).max(120).optional(),
}).refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

function hasCompleteScheduleSlots(
  startTime: string,
  endTime: string,
  slotMinutes: number,
): boolean {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const duration = end - start;

  return duration > 0 && duration % slotMinutes === 0;
}
type ScheduleWindow = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

async function assertScheduleSupportsActiveAppointments(
  tx: Prisma.TransactionClient,
  organizationId: string,
  doctorId: string,
  schedules: ScheduleWindow[],
): Promise<void> {
  const [organization, appointments] = await Promise.all([
    tx.organization.findUnique({
      where: { id: organizationId },
      select: { timezone: true },
    }),
    tx.appointment.findMany({
      where: {
        organizationId,
        doctorId,
        status: {
          in: [
            'SCHEDULED',
            'CONFIRMED',
            'CHECKED_IN',
            'WAITING',
            'IN_CONSULTATION',
          ],
        },
        endTime: { gt: new Date() },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    }),
  ]);

  if (!organization) {
    throw NotFound('Organization');
  }

  validateTimezone(organization.timezone);

  for (const appointment of appointments) {
    const localDate = getLocalDate(
      appointment.startTime,
      organization.timezone,
    );
    const localEndDate = getLocalDate(
      appointment.endTime,
      organization.timezone,
    );

    if (localDate !== localEndDate) {
      throw new AppError(
        409,
        'This schedule change would affect an existing appointment that crosses midnight',
      );
    }

    const localStartTime = getLocalTime(
      appointment.startTime,
      organization.timezone,
    );
    const localEndTime = getLocalTime(
      appointment.endTime,
      organization.timezone,
    );

    const [startHour, startMinute] = localStartTime.split(':').map(Number);
    const [endHour, endMinute] = localEndTime.split(':').map(Number);

    const appointmentStart = startHour * 60 + startMinute;
    const appointmentEnd = endHour * 60 + endMinute;
    const durationMinutes =
      (appointment.endTime.getTime() - appointment.startTime.getTime()) / 60_000;

    const dayOfWeek = new Date(`${localDate}T00:00:00.000Z`).getUTCDay();

    const hasExactMinuteBoundaries =
      appointment.startTime.getUTCSeconds() === 0 &&
      appointment.startTime.getUTCMilliseconds() === 0 &&
      appointment.endTime.getUTCSeconds() === 0 &&
      appointment.endTime.getUTCMilliseconds() === 0;

    const isCovered = hasExactMinuteBoundaries && schedules.some((schedule) => {
      const [blockStartHour, blockStartMinute] =
        schedule.startTime.split(':').map(Number);
      const [blockEndHour, blockEndMinute] =
        schedule.endTime.split(':').map(Number);

      const blockStart = blockStartHour * 60 + blockStartMinute;
      const blockEnd = blockEndHour * 60 + blockEndMinute;

      return (
        schedule.dayOfWeek === dayOfWeek &&
        durationMinutes === schedule.slotMinutes &&
        appointmentStart >= blockStart &&
        appointmentEnd <= blockEnd &&
        (appointmentStart - blockStart) % schedule.slotMinutes === 0
      );
    });

    if (!isCovered) {
      throw new AppError(
        409,
        'This schedule change would invalidate an existing appointment. Reschedule or cancel the appointment first.',
      );
    }
  }
}
const doctorInclude = {
  user: { select: { name: true, email: true } },
  department: { select: { id: true, name: true } },
} as const;

/**
 * Departments available to the current organization.
 * This endpoint is used by the doctor registration form.
 */
doctorRoutes.get('/departments', authorize('doctors.view'), asyncHandler(async (req, res) => {
  const departments = await prisma.department.findMany({
    where: { organizationId: req.orgId, status: 'ACTIVE' },
    select: { id: true, name: true, description: true },
    orderBy: { name: 'asc' },
  });

  ok(res, departments);
}));

/**
 * Doctor directory.
 * Default status remains ACTIVE to preserve existing appointment-page behaviour.
 * Use status=ALL to include every status.
 */
doctorRoutes.get('/', authorize('doctors.view'), validate(listDoctorsSchema, 'query'), asyncHandler(async (req, res) => {
  const { status, search } = req.query as z.infer<typeof listDoctorsSchema>;

  const doctors = await prisma.doctor.findMany({
    where: {
      organizationId: req.orgId,
      ...(status !== 'ALL' ? { status } : {}),
      ...(search ? {
        OR: [
          { specialization: { contains: search, mode: 'insensitive' } },
          { licenseNumber: { contains: search, mode: 'insensitive' } },
          { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
          { department: { is: { name: { contains: search, mode: 'insensitive' } } } },
        ],
      } : {}),
    },
    include: doctorInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });

  ok(res, doctors);
}));

/**
 * Register a doctor and the associated login account atomically.
 */
doctorRoutes.post('/', authorize('doctors.manage'), validate(createDoctorSchema), asyncHandler(async (req, res) => {
  const b = req.body;

  const department = await prisma.department.findFirst({
    where: { id: b.departmentId, organizationId: req.orgId, status: 'ACTIVE' },
  });
  if (!department) throw NotFound('Active department');

  const existingUser = await prisma.user.findUnique({
    where: { email: b.email.toLowerCase() },
    select: { id: true },
  });
  if (existingUser) throw new AppError(409, 'An account with this email address already exists');

  const existingLicense = await prisma.doctor.findFirst({
    where: { organizationId: req.orgId, licenseNumber: b.licenseNumber },
    select: { id: true },
  });
  if (existingLicense) throw new AppError(409, 'This doctor license number is already registered in this organization');

  const passwordHash = await hashPassword(b.password);

  const doctor = await prisma.$transaction(async (tx) => {
    const role = await tx.role.findFirst({
      where: { organizationId: req.orgId, name: 'Doctor' },
    });
    if (!role) throw new AppError(500, 'The Doctor role is not configured for this organization');

    const user = await tx.user.create({
      data: {
        organizationId: req.orgId,
        name: b.name,
        email: b.email.toLowerCase(),
        passwordHash,
        userRoles: { create: { roleId: role.id } },
      },
    });

    return tx.doctor.create({
      data: {
        organizationId: req.orgId!,
        userId: user.id,
        departmentId: b.departmentId,
        licenseNumber: b.licenseNumber,
        specialization: b.specialization,
        qualification: b.qualification,
        consultationFee: b.consultationFee,
        experienceYears: b.experienceYears,
      },
      include: doctorInclude,
    });
  });

  await audit(req, {
    action: 'doctor.create',
    resourceType: 'doctor',
    resourceId: doctor.id,
    metadata: { departmentId: doctor.departmentId },
  });

  ok(res, doctor, 'Doctor registered', 201);
}));

/**
 * Update professional and directory information.
 * Login email and password are intentionally managed separately.
 */
doctorRoutes.patch('/:id', authorize('doctors.manage'), validate(updateDoctorSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.doctor.findFirst({
    where: { id: req.params.id, organizationId: req.orgId },
    select: { id: true, userId: true },
  });
  if (!existing) throw NotFound('Doctor');

  const b = req.body;

  if (b.departmentId) {
    const department = await prisma.department.findFirst({
      where: { id: b.departmentId, organizationId: req.orgId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!department) throw NotFound('Active department');
  }

  const doctor = await prisma.$transaction(async (tx) => {
    if (b.name !== undefined) {
      await tx.user.update({
        where: { id: existing.userId },
        data: { name: b.name },
      });
    }

    return tx.doctor.update({
      where: { id: existing.id },
      data: {
        ...(b.departmentId !== undefined ? { departmentId: b.departmentId } : {}),
        ...(b.licenseNumber !== undefined ? { licenseNumber: b.licenseNumber } : {}),
        ...(b.specialization !== undefined ? { specialization: b.specialization } : {}),
        ...(b.qualification !== undefined ? { qualification: b.qualification } : {}),
        ...(b.consultationFee !== undefined ? { consultationFee: b.consultationFee } : {}),
        ...(b.experienceYears !== undefined ? { experienceYears: b.experienceYears } : {}),
      },
      include: doctorInclude,
    });
  });

  await audit(req, {
    action: 'doctor.update',
    resourceType: 'doctor',
    resourceId: doctor.id,
    metadata: { updatedFields: Object.keys(b) },
  });

  ok(res, doctor, 'Doctor updated');
}));

/**
 * Change doctor status without deleting the doctor or clinical history.
 * The associated login account receives the same status.
 */
doctorRoutes.patch('/:id/status', authorize('doctors.manage'), validate(statusSchema), asyncHandler(async (req, res) => {
  const existing = await prisma.doctor.findFirst({
    where: { id: req.params.id, organizationId: req.orgId },
    select: { id: true, userId: true },
  });
  if (!existing) throw NotFound('Doctor');

  const { status } = req.body;

  const doctor = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: existing.userId },
      data: { status },
    });

    return tx.doctor.update({
      where: { id: existing.id },
      data: { status },
      include: doctorInclude,
    });
  });

  await audit(req, {
    action: 'doctor.status_change',
    resourceType: 'doctor',
    resourceId: doctor.id,
    metadata: { status },
  });

  ok(res, doctor, 'Doctor status updated');
}));

/**
 * Retrieve a doctor's weekly schedule.
 */
doctorRoutes.get('/:id/schedule', authorize('doctors.view'), asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findFirst({
    where: { id: req.params.id, organizationId: req.orgId },
    select: { id: true },
  });
  if (!doctor) throw NotFound('Doctor');

  const schedules = await prisma.doctorSchedule.findMany({
    where: { organizationId: req.orgId, doctorId: doctor.id },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  ok(res, schedules);
}));

/**
 * Add a weekly schedule block.
 */
doctorRoutes.post('/:id/schedule', authorize('doctors.manage'), validate(scheduleSchema), asyncHandler(async (req, res) => {
  const doctor = await prisma.doctor.findFirst({
    where: { id: req.params.id, organizationId: req.orgId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!doctor) throw NotFound('Active doctor');

  if (!hasCompleteScheduleSlots(
    req.body.startTime,
    req.body.endTime,
    req.body.slotMinutes,
  )) {
    throw new AppError(422, 'Schedule duration must be divisible by the appointment slot length');
  }

  const clash = await prisma.doctorSchedule.findFirst({
    where: {
      organizationId: req.orgId,
      doctorId: doctor.id,
      dayOfWeek: req.body.dayOfWeek,
      startTime: { lt: req.body.endTime },
      endTime: { gt: req.body.startTime },
    },
  });
  if (clash) throw new AppError(409, 'This schedule overlaps an existing schedule block');

  const schedule = await prisma.doctorSchedule.create({
    data: {
      ...req.body,
      organizationId: req.orgId!,
      doctorId: doctor.id,
    },
  });

  await audit(req, {
    action: 'doctor.schedule_create',
    resourceType: 'doctor_schedule',
    resourceId: schedule.id,
    metadata: { doctorId: doctor.id, dayOfWeek: schedule.dayOfWeek },
  });

  ok(res, schedule, 'Schedule created', 201);
}));

/**
 * Edit a schedule block. Existing values are merged before overlap validation.
 */
doctorRoutes.patch('/:id/schedule/:scheduleId', authorize('doctors.manage'), validate(updateScheduleSchema), asyncHandler(async (req, res) => {
  const schedule = await prisma.$transaction(async (tx) => {
    const existing = await tx.doctorSchedule.findFirst({
      where: {
        id: req.params.scheduleId,
        doctorId: req.params.id,
        organizationId: req.orgId,
      },
    });

    if (!existing) throw NotFound('Schedule');

    const next = {
      dayOfWeek: req.body.dayOfWeek ?? existing.dayOfWeek,
      startTime: req.body.startTime ?? existing.startTime,
      endTime: req.body.endTime ?? existing.endTime,
      slotMinutes: req.body.slotMinutes ?? existing.slotMinutes,
    };

    if (next.startTime >= next.endTime) {
      throw new AppError(422, 'End time must be later than start time');
    }

    if (!hasCompleteScheduleSlots(
      next.startTime,
      next.endTime,
      next.slotMinutes,
    )) {
      throw new AppError(422, 'Schedule duration must be divisible by the appointment slot length');
    }

    const clash = await tx.doctorSchedule.findFirst({
      where: {
        id: { not: existing.id },
        organizationId: req.orgId,
        doctorId: existing.doctorId,
        dayOfWeek: next.dayOfWeek,
        startTime: { lt: next.endTime },
        endTime: { gt: next.startTime },
      },
    });

    if (clash) {
      throw new AppError(409, 'This schedule overlaps an existing schedule block');
    }

    const remainingSchedules = await tx.doctorSchedule.findMany({
      where: {
        organizationId: req.orgId,
        doctorId: existing.doctorId,
        id: { not: existing.id },
      },
    });

    await assertScheduleSupportsActiveAppointments(
      tx,
      req.orgId!,
      existing.doctorId,
      [...remainingSchedules, next],
    );

    return tx.doctorSchedule.update({
      where: { id: existing.id },
      data: next,
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  await audit(req, {
    action: 'doctor.schedule_update',
    resourceType: 'doctor_schedule',
    resourceId: schedule.id,
    metadata: {
      doctorId: schedule.doctorId,
      dayOfWeek: schedule.dayOfWeek,
    },
  });

  ok(res, schedule, 'Schedule updated');
}));
/**
 * Delete a schedule block, not the doctor.
 */
doctorRoutes.delete('/:id/schedule/:scheduleId', authorize('doctors.manage'), asyncHandler(async (req, res) => {
  const deletedSchedule = await prisma.$transaction(async (tx) => {
    const existing = await tx.doctorSchedule.findFirst({
      where: {
        id: req.params.scheduleId,
        doctorId: req.params.id,
        organizationId: req.orgId,
      },
      select: {
        id: true,
        doctorId: true,
        dayOfWeek: true,
      },
    });

    if (!existing) throw NotFound('Schedule');

    const remainingSchedules = await tx.doctorSchedule.findMany({
      where: {
        organizationId: req.orgId,
        doctorId: existing.doctorId,
        id: { not: existing.id },
      },
    });

    await assertScheduleSupportsActiveAppointments(
      tx,
      req.orgId!,
      existing.doctorId,
      remainingSchedules,
    );

    await tx.doctorSchedule.delete({
      where: { id: existing.id },
    });

    return existing;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  await audit(req, {
    action: 'doctor.schedule_delete',
    resourceType: 'doctor_schedule',
    resourceId: deletedSchedule.id,
    metadata: {
      doctorId: deletedSchedule.doctorId,
      dayOfWeek: deletedSchedule.dayOfWeek,
    },
  });

  ok(res, null, 'Schedule deleted');
}));
