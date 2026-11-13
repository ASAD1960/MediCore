import { ConsultationStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, NotFound } from '../../shared/errors/AppError';
import {
  canEditConsultation,
  canFinalizeConsultation,
  hasClinicalContent,
} from './consultation.rules';

const consultationInclude = {
  encounter: {
    include: {
      patient: {
        select: {
          id: true,
          patientNumber: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          gender: true,
          phone: true,
          bloodGroup: true,
        },
      },
    },
  },
  doctor: {
    include: {
      user: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  },
  diagnoses: true,
  prescriptions: {
    select: {
      id: true,
      prescriptionNumber: true,
      status: true,
      issuedAt: true,
    },
  },
} satisfies Prisma.ConsultationInclude;

type ScopeDb = Pick<Prisma.TransactionClient, 'user' | 'doctor'>;

export interface DiagnosisInput {
  code?: string;
  description: string;
}

export interface CreateConsultationInput {
  patientId: string;
  doctorId: string;
  appointmentId?: string;
  chiefComplaint?: string;
  clinicalNotes?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  diagnoses?: DiagnosisInput[];
}

export interface UpdateConsultationInput {
  chiefComplaint?: string | null;
  clinicalNotes?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  diagnoses?: DiagnosisInput[];
}

interface ListQuery {
  page: number;
  limit: number;
  patientId?: string;
  doctorId?: string;
  status?: ConsultationStatus;
}

async function getDoctorScope(
  orgId: string,
  userId: string,
  db: ScopeDb = prisma,
): Promise<{ doctorId: string | null }> {
  const user = await db.user.findFirst({
    where: { id: userId, organizationId: orgId },
    select: {
      userRoles: {
        select: {
          role: { select: { name: true } },
        },
      },
    },
  });

  if (!user) throw NotFound('User');

  const roles = user.userRoles.map((item) => item.role.name);

  if (roles.includes('Organization Administrator')) {
    return { doctorId: null };
  }

  if (!roles.includes('Doctor')) {
    throw new AppError(403, 'You are not permitted to access clinical consultations');
  }

  const doctor = await db.doctor.findFirst({
    where: {
      organizationId: orgId,
      userId,
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  if (!doctor) throw NotFound('Active doctor profile');

  return { doctorId: doctor.id };
}

export const consultationService = {
  async list(orgId: string, userId: string, query: ListQuery) {
    const scope = await getDoctorScope(orgId, userId);

    if (scope.doctorId && query.doctorId && query.doctorId !== scope.doctorId) {
      return { data: [], total: 0 };
    }

    const where: Prisma.ConsultationWhereInput = {
      organizationId: orgId,
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(scope.doctorId
        ? { doctorId: scope.doctorId }
        : query.doctorId
          ? { doctorId: query.doctorId }
          : {}),
      ...(query.status ? { consultationStatus: query.status } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: consultationInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.consultation.count({ where }),
    ]);

    return { data, total };
  },

  async get(orgId: string, userId: string, id: string) {
    const scope = await getDoctorScope(orgId, userId);

    const consultation = await prisma.consultation.findFirst({
      where: {
        id,
        organizationId: orgId,
        ...(scope.doctorId ? { doctorId: scope.doctorId } : {}),
      },
      include: consultationInclude,
    });

    if (!consultation) throw NotFound('Consultation');

    return consultation;
  },

  async create(orgId: string, userId: string, dto: CreateConsultationInput) {
    return prisma.$transaction(async (tx) => {
      const scope = await getDoctorScope(orgId, userId, tx);

      if (scope.doctorId && scope.doctorId !== dto.doctorId) {
        throw new AppError(403, 'Doctors can only create their own consultations');
      }

      const [patient, doctor] = await Promise.all([
        tx.patient.findFirst({
          where: {
            id: dto.patientId,
            organizationId: orgId,
            status: 'ACTIVE',
          },
          select: { id: true },
        }),
        tx.doctor.findFirst({
          where: {
            id: dto.doctorId,
            organizationId: orgId,
            status: 'ACTIVE',
          },
          select: { id: true },
        }),
      ]);

      if (!patient) throw NotFound('Active patient');
      if (!doctor) throw NotFound('Active doctor');

      let appointmentId: string | null = null;

      if (dto.appointmentId) {
        const appointment = await tx.appointment.findFirst({
          where: {
            id: dto.appointmentId,
            organizationId: orgId,
          },
          select: {
            id: true,
            patientId: true,
            doctorId: true,
            status: true,
          },
        });

        if (!appointment) throw NotFound('Appointment');

        if (
          appointment.patientId !== dto.patientId ||
          appointment.doctorId !== dto.doctorId
        ) {
          throw new AppError(
            422,
            'Appointment, patient and doctor must belong to the same visit',
          );
        }

        if (!['CHECKED_IN', 'WAITING'].includes(appointment.status)) {
          throw new AppError(
            409,
            'Only checked-in or waiting appointments can start a consultation',
          );
        }

        const transition = await tx.appointment.updateMany({
          where: {
            id: appointment.id,
            organizationId: orgId,
            status: appointment.status,
          },
          data: { status: 'IN_CONSULTATION' },
        });

        if (transition.count !== 1) {
          throw new AppError(
            409,
            'Appointment status changed concurrently. Refresh and try again.',
          );
        }

        appointmentId = appointment.id;
      }

      const encounter = await tx.encounter.create({
        data: {
          organizationId: orgId,
          patientId: dto.patientId,
          appointmentId,
          encounterType: appointmentId ? 'OUTPATIENT' : 'WALK_IN',
        },
      });

      return tx.consultation.create({
        data: {
          organizationId: orgId,
          encounterId: encounter.id,
          doctorId: dto.doctorId,
          patientId: dto.patientId,
          chiefComplaint: dto.chiefComplaint,
          clinicalNotes: dto.clinicalNotes,
          diagnosis: dto.diagnosis,
          treatmentPlan: dto.treatmentPlan,
          diagnoses: dto.diagnoses?.length
            ? {
                create: dto.diagnoses.map((item) => ({
                  organizationId: orgId,
                  code: item.code || null,
                  description: item.description,
                })),
              }
            : undefined,
        },
        include: consultationInclude,
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },

  async update(
    orgId: string,
    userId: string,
    id: string,
    dto: UpdateConsultationInput,
  ) {
    return prisma.$transaction(async (tx) => {
      const scope = await getDoctorScope(orgId, userId, tx);

      const ownership = scope.doctorId
        ? { doctorId: scope.doctorId }
        : {};

      const current = await tx.consultation.findFirst({
        where: { id, organizationId: orgId, ...ownership },
        select: { id: true, consultationStatus: true },
      });

      if (!current) throw NotFound('Consultation');

      if (!canEditConsultation(current.consultationStatus)) {
        throw new AppError(409, 'Only draft consultations can be edited');
      }

      const updated = await tx.consultation.updateMany({
        where: {
          id,
          organizationId: orgId,
          ...ownership,
          consultationStatus: 'DRAFT',
        },
        data: {
          ...(dto.chiefComplaint !== undefined && {
            chiefComplaint: dto.chiefComplaint,
          }),
          ...(dto.clinicalNotes !== undefined && {
            clinicalNotes: dto.clinicalNotes,
          }),
          ...(dto.diagnosis !== undefined && {
            diagnosis: dto.diagnosis,
          }),
          ...(dto.treatmentPlan !== undefined && {
            treatmentPlan: dto.treatmentPlan,
          }),
        },
      });

      if (updated.count !== 1) {
        throw new AppError(
          409,
          'Consultation was modified concurrently. Refresh and try again.',
        );
      }

      if (dto.diagnoses !== undefined) {
        await tx.diagnosis.deleteMany({
          where: { organizationId: orgId, consultationId: id },
        });

        if (dto.diagnoses.length) {
          await tx.diagnosis.createMany({
            data: dto.diagnoses.map((item) => ({
              organizationId: orgId,
              consultationId: id,
              code: item.code || null,
              description: item.description,
            })),
          });
        }
      }

      return tx.consultation.findFirstOrThrow({
        where: { id, organizationId: orgId, ...ownership },
        include: consultationInclude,
      });
    });
  },

  async finalize(orgId: string, userId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const scope = await getDoctorScope(orgId, userId, tx);
      const ownership = scope.doctorId
        ? { doctorId: scope.doctorId }
        : {};

      const current = await tx.consultation.findFirst({
        where: { id, organizationId: orgId, ...ownership },
        select: {
          id: true,
          consultationStatus: true,
          chiefComplaint: true,
          clinicalNotes: true,
          diagnosis: true,
          treatmentPlan: true,
          encounter: {
            select: {
              id: true,
              appointmentId: true,
              endedAt: true,
            },
          },
          diagnoses: {
            select: { description: true },
          },
        },
      });

      if (!current) throw NotFound('Consultation');

      if (!canFinalizeConsultation(current.consultationStatus)) {
        throw new AppError(
          409,
          `Consultation cannot be finalized from status ${current.consultationStatus}`,
        );
      }

      if (!hasClinicalContent({
        chiefComplaint: current.chiefComplaint,
        clinicalNotes: current.clinicalNotes,
        diagnosis: current.diagnosis,
        treatmentPlan: current.treatmentPlan,
        diagnoses: current.diagnoses,
      })) {
        throw new AppError(
          422,
          'Add clinical documentation or at least one diagnosis before finalizing',
        );
      }

      if (current.encounter.endedAt) {
        throw new AppError(409, 'This encounter has already been closed');
      }

      const finalizedAt = new Date();

      const result = await tx.consultation.updateMany({
        where: {
          id,
          organizationId: orgId,
          ...ownership,
          consultationStatus: 'DRAFT',
        },
        data: {
          consultationStatus: 'FINALIZED',
          finalizedAt,
        },
      });

      if (result.count !== 1) {
        throw new AppError(
          409,
          'Consultation changed concurrently. Refresh and try again.',
        );
      }

      const encounterResult = await tx.encounter.updateMany({
        where: {
          id: current.encounter.id,
          organizationId: orgId,
          endedAt: null,
        },
        data: { endedAt: finalizedAt },
      });

      if (encounterResult.count !== 1) {
        throw new AppError(
          409,
          'Encounter could not be closed. Finalization was rolled back.',
        );
      }

      if (current.encounter.appointmentId) {
        const appointmentResult = await tx.appointment.updateMany({
          where: {
            id: current.encounter.appointmentId,
            organizationId: orgId,
            status: 'IN_CONSULTATION',
          },
          data: { status: 'COMPLETED' },
        });

        if (appointmentResult.count !== 1) {
          throw new AppError(
            409,
            'Linked appointment is no longer in consultation. Finalization was rolled back.',
          );
        }
      }

      return tx.consultation.findFirstOrThrow({
        where: { id, organizationId: orgId, ...ownership },
        include: consultationInclude,
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },
};