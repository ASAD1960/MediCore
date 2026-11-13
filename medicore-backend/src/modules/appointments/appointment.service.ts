import { AppointmentStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, NotFound } from '../../shared/errors/AppError';
import {
  getLocalDate,
  getLocalTime,
  localDateTimeToUtc,
  nextCalendarDate,
  validateTimezone,
} from '../../shared/utils/timezone';

const BLOCKING: AppointmentStatus[] = [
  'SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION',
];

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ['CONFIRMED', 'CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'NO_SHOW'],
  CHECKED_IN: ['WAITING', 'IN_CONSULTATION', 'CANCELLED'],
  WAITING: ['IN_CONSULTATION', 'CANCELLED'],
  IN_CONSULTATION: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export interface CreateAppointmentInput {
  patientId: string;
  doctorId: string;
  startTime: Date;
  durationMinutes: number;
  reason?: string;
  appointmentType?: string;
  branchId?: string;
}

export const appointmentService = {
  async create(orgId: string, userId: string, dto: CreateAppointmentInput) {
    const startTime = dto.startTime;

    if (typeof dto.patientId !== 'string' || !dto.patientId.trim()) {
      throw new AppError(422, 'Patient ID is required');
    }

    if (typeof dto.doctorId !== 'string' || !dto.doctorId.trim()) {
      throw new AppError(422, 'Doctor ID is required');
    }

    if (
      !Number.isInteger(dto.durationMinutes) ||
      dto.durationMinutes < 5 ||
      dto.durationMinutes > 240
    ) {
      throw new AppError(422, 'Appointment duration must be between 5 and 240 minutes');
    }

    if (
      dto.branchId !== undefined &&
      (typeof dto.branchId !== 'string' || !dto.branchId.trim())
    ) {
      throw new AppError(422, 'Invalid branch ID');
    }

    if (!(startTime instanceof Date) || isNaN(startTime.getTime())) {
      throw new AppError(422, 'Invalid appointment start time');
    }

    const endTime = new Date(startTime.getTime() + dto.durationMinutes * 60_000);

    return prisma.$transaction(async (tx) => {
      const [organization, patient, doctor] = await Promise.all([
        tx.organization.findUnique({ where: { id: orgId }, select: { timezone: true } }),
        tx.patient.findFirst({
          where: { id: dto.patientId, organizationId: orgId, status: 'ACTIVE' },
        }),
        tx.doctor.findFirst({
          where: { id: dto.doctorId, organizationId: orgId, status: 'ACTIVE' },
        }),
      ]);

      if (!organization) throw NotFound('Organization');
      if (!patient) throw NotFound('Patient');
      if (!doctor) throw NotFound('Doctor');

      if (dto.branchId) {
        const branch = await tx.branch.findFirst({
          where: {
            id: dto.branchId,
            organizationId: orgId,
            status: 'ACTIVE',
          },
          select: { id: true },
        });

        if (!branch) throw NotFound('Branch');
      }

      validateTimezone(organization.timezone);

      if (startTime < new Date()) {
        throw new AppError(422, 'Cannot book an appointment in the past');
      }

      const localDate = getLocalDate(startTime, organization.timezone);
      const localTime = getLocalTime(startTime, organization.timezone);
      const canonicalStart = localDateTimeToUtc(
        localDate,
        localTime,
        organization.timezone,
      );

      if (
        startTime.getUTCSeconds() !== 0 ||
        startTime.getUTCMilliseconds() !== 0 ||
        canonicalStart.getTime() !== startTime.getTime()
      ) {
        throw new AppError(
          422,
          'Appointment must start at an available clinic-local slot',
        );
      }

      const weekday = new Date(`${localDate}T00:00:00.000Z`).getUTCDay();

      const schedules = await tx.doctorSchedule.findMany({
        where: {
          organizationId: orgId,
          doctorId: dto.doctorId,
          dayOfWeek: weekday,
        },
      });

      const [localHour, localMinute] = localTime.split(':').map(Number);
      const requestedMinute = localHour * 60 + localMinute;

      const validSchedule = schedules.some((schedule) => {
        const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
        const [endHour, endMinute] = schedule.endTime.split(':').map(Number);

        const scheduleStart = startHour * 60 + startMinute;
        const scheduleEnd = endHour * 60 + endMinute;

        return (
          dto.durationMinutes === schedule.slotMinutes &&
          requestedMinute >= scheduleStart &&
          requestedMinute + dto.durationMinutes <= scheduleEnd &&
          (requestedMinute - scheduleStart) % schedule.slotMinutes === 0
        );
      });

      if (!validSchedule) {
        throw new AppError(
          422,
          'Selected time is not a valid appointment slot in the doctor schedule',
        );
      }

      const conflict = await tx.appointment.findFirst({
        where: {
          organizationId: orgId,
          doctorId: dto.doctorId,
          status: { in: BLOCKING },
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (conflict) {
        throw new AppError(409, 'Doctor already has an appointment in this time slot');
      }

      return tx.appointment.create({
        data: {
          organizationId: orgId,
          patientId: dto.patientId,
          doctorId: dto.doctorId,
          branchId: dto.branchId,
          appointmentDate: new Date(`${localDate}T00:00:00.000Z`),
          startTime,
          endTime,
          reason: dto.reason,
          appointmentType: dto.appointmentType ?? 'CONSULTATION',
          createdBy: userId,
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  },

  async list(
    orgId: string,
    q: {
      page: number;
      limit: number;
      doctorId?: string;
      patientId?: string;
      from?: Date;
      to?: Date;
      status?: AppointmentStatus;
    },
  ) {
    const where: Prisma.AppointmentWhereInput = {
      organizationId: orgId,
      ...(q.doctorId && { doctorId: q.doctorId }),
      ...(q.patientId && { patientId: q.patientId }),
      ...(q.status && { status: q.status }),
      ...((q.from || q.to) && {
        startTime: {
          ...(q.from && { gte: q.from }),
          ...(q.to && { lte: q.to }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { startTime: 'asc' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          patient: {
            select: { firstName: true, lastName: true, patientNumber: true },
          },
          doctor: {
            select: {
              specialization: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      prisma.appointment.count({ where }),
    ]);

    return { data, total };
  },

  async changeStatus(orgId: string, id: string, next: AppointmentStatus) {
    const appt = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!appt) throw NotFound('Appointment');

    if (!TRANSITIONS[appt.status].includes(next)) {
      throw new AppError(409, `Cannot change status from ${appt.status} to ${next}`);
    }

    const result = await prisma.appointment.updateMany({
      where: {
        id,
        organizationId: orgId,
        status: appt.status,
      },
      data: { status: next },
    });

    if (result.count !== 1) {
      const current = await prisma.appointment.findFirst({
        where: { id, organizationId: orgId },
        select: { status: true },
      });

      if (!current) throw NotFound('Appointment');

      throw new AppError(
        409,
        `Appointment status changed concurrently to ${current.status}. Refresh and try again.`,
      );
    }

    const updated = await prisma.appointment.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!updated) throw NotFound('Appointment');

    return updated;
  },

  async availability(orgId: string, doctorId: string, date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError(422, 'Invalid date (use YYYY-MM-DD)');
    }

    const [organization, doctor] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { timezone: true },
      }),
      prisma.doctor.findFirst({
        where: { id: doctorId, organizationId: orgId, status: 'ACTIVE' },
        select: { id: true },
      }),
    ]);

    if (!organization) throw NotFound('Organization');
    if (!doctor) throw NotFound('Doctor');

    const timezone = organization.timezone;
    validateTimezone(timezone);

    const nextDate = nextCalendarDate(date);
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();

    let dayStart: Date;
    let dayEnd: Date;

    try {
      dayStart = localDateTimeToUtc(date, '00:00', timezone);
      dayEnd = localDateTimeToUtc(nextDate, '00:00', timezone);
    } catch {
      throw new AppError(422, 'Could not calculate clinic-local date boundaries');
    }

    const [schedules, booked] = await Promise.all([
      prisma.doctorSchedule.findMany({
        where: {
          organizationId: orgId,
          doctorId,
          dayOfWeek: weekday,
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.appointment.findMany({
        where: {
          organizationId: orgId,
          doctorId,
          status: { in: BLOCKING },
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const slots: { start: string; end: string }[] = [];

    for (const schedule of schedules) {
      const [sh, sm] = schedule.startTime.split(':').map(Number);
      const [eh, em] = schedule.endTime.split(':').map(Number);

      for (
        let minute = sh * 60 + sm;
        minute + schedule.slotMinutes <= eh * 60 + em;
        minute += schedule.slotMinutes
      ) {
        const startLocal =
          `${String(Math.floor(minute / 60)).padStart(2, '0')}:` +
          `${String(minute % 60).padStart(2, '0')}`;

        const endMinute = minute + schedule.slotMinutes;
        const endLocal =
          `${String(Math.floor(endMinute / 60)).padStart(2, '0')}:` +
          `${String(endMinute % 60).padStart(2, '0')}`;

        try {
          const start = localDateTimeToUtc(date, startLocal, timezone);
          const end = new Date(
            start.getTime() + schedule.slotMinutes * 60_000,
          );

          if (
            getLocalDate(end, timezone) === date &&
            getLocalTime(end, timezone) === endLocal &&
            start >= new Date() &&
            !booked.some((b) => b.startTime < end && b.endTime > start)
          ) {
            slots.push({
              start: start.toISOString(),
              end: end.toISOString(),
            });
          }
        } catch {
          // A local slot that does not exist during a daylight-saving transition is skipped.
        }
      }
    }

    return slots;
  },
};
