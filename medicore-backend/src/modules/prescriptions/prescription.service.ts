import { randomBytes } from 'crypto';
import { Prisma, PrescriptionStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, NotFound } from '../../shared/errors/AppError';
import {
  canEditPrescription,
  canIssuePrescription,
  hasPrescriptionItems,
} from './prescription.rules';

const prescriptionInclude = {
  consultation: {
    include: {
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
    },
  },
  doctor: {
    include: {
      user: { select: { id: true, name: true } },
    },
  },
  items: {
    include: {
      medicine: {
        select: {
          id: true,
          name: true,
          genericName: true,
          category: true,
          unit: true,
          unitPrice: true,
        },
      },
    },
  },
} satisfies Prisma.PrescriptionInclude;

type ScopeDb = Pick<Prisma.TransactionClient, 'user' | 'doctor'>;

interface PrescriptionItemInput {
  medicineId: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  notes?: string;
}

interface CreatePrescriptionInput {
  consultationId: string;
  instructions?: string;
  items: PrescriptionItemInput[];
}

interface UpdatePrescriptionInput {
  instructions?: string | null;
  items: PrescriptionItemInput[];
}

interface ListQuery {
  page: number;
  limit: number;
  patientId?: string;
  status?: PrescriptionStatus;
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
    throw new AppError(403, 'You are not permitted to access prescriptions');
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

function validateItems(items: PrescriptionItemInput[]) {
  if (!hasPrescriptionItems(items)) {
    throw new AppError(422, 'At least one medicine is required');
  }

  if (items.length > 50) {
    throw new AppError(422, 'A prescription cannot contain more than 50 items');
  }

  for (const item of items) {
    if (!item.medicineId?.trim()) {
      throw new AppError(422, 'Every prescription item requires a medicine');
    }

    if (!item.dosage?.trim() || !item.frequency?.trim()) {
      throw new AppError(422, 'Dosage and frequency are required');
    }

    if (!Number.isInteger(item.durationDays) || item.durationDays < 1 || item.durationDays > 365) {
      throw new AppError(422, 'Duration must be between 1 and 365 days');
    }

    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 100000) {
      throw new AppError(422, 'Medicine quantity must be a positive integer');
    }
  }
}

async function validateMedicines(
  orgId: string,
  items: PrescriptionItemInput[],
  tx: Prisma.TransactionClient,
) {
  validateItems(items);

  const ids = [...new Set(items.map((item) => item.medicineId))];

  const medicines = await tx.medicine.findMany({
    where: {
      organizationId: orgId,
      id: { in: ids },
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  if (medicines.length !== ids.length) {
    throw new AppError(422, 'One or more medicines are unavailable in this organization');
  }
}

function makePrescriptionNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `RX-${date}-${suffix}`;
}

async function findPrescription(
  orgId: string,
  id: string,
  doctorId: string | null,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const prescription = await db.prescription.findFirst({
    where: {
      id,
      organizationId: orgId,
      ...(doctorId ? { doctorId } : {}),
    },
    include: prescriptionInclude,
  });

  if (!prescription) throw NotFound('Prescription');

  return prescription;
}

export const prescriptionService = {
  async list(orgId: string, userId: string, query: ListQuery) {
    const scope = await getDoctorScope(orgId, userId);

    const where: Prisma.PrescriptionWhereInput = {
      organizationId: orgId,
      ...(scope.doctorId ? { doctorId: scope.doctorId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.prescription.findMany({
        where,
        include: prescriptionInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.prescription.count({ where }),
    ]);

    return { data, total };
  },

  async get(orgId: string, userId: string, id: string) {
    const scope = await getDoctorScope(orgId, userId);
    return findPrescription(orgId, id, scope.doctorId);
  },

  async medicines(orgId: string, userId: string) {
    await getDoctorScope(orgId, userId);

    return prisma.medicine.findMany({
      where: {
        organizationId: orgId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        genericName: true,
        category: true,
        unit: true,
        unitPrice: true,
      },
      orderBy: { name: 'asc' },
      take: 500,
    });
  },

  async create(
    orgId: string,
    userId: string,
    input: CreatePrescriptionInput,
  ) {
    const scope = await getDoctorScope(orgId, userId);

    return prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.findFirst({
        where: {
          id: input.consultationId,
          organizationId: orgId,
          ...(scope.doctorId ? { doctorId: scope.doctorId } : {}),
        },
        select: {
          id: true,
          patientId: true,
          doctorId: true,
          doctor: {
            select: {
              id: true,
              organizationId: true,
            },
          },
        },
      });

      if (!consultation) throw NotFound('Consultation');

      if (consultation.doctor.organizationId !== orgId) {
        throw new AppError(422, 'Consultation doctor does not belong to this organization');
      }

      await validateMedicines(orgId, input.items, tx);

      return tx.prescription.create({
        data: {
          organizationId: orgId,
          patientId: consultation.patientId,
          consultationId: consultation.id,
          doctorId: consultation.doctorId,
          prescriptionNumber: makePrescriptionNumber(),
          instructions: input.instructions?.trim() || null,
          items: {
            create: input.items.map((item) => ({
              medicineId: item.medicineId,
              dosage: item.dosage.trim(),
              frequency: item.frequency.trim(),
              durationDays: item.durationDays,
              quantity: item.quantity,
              notes: item.notes?.trim() || null,
            })),
          },
        },
        include: prescriptionInclude,
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },

  async update(
    orgId: string,
    userId: string,
    id: string,
    input: UpdatePrescriptionInput,
  ) {
    const scope = await getDoctorScope(orgId, userId);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.prescription.findFirst({
        where: {
          id,
          organizationId: orgId,
          ...(scope.doctorId ? { doctorId: scope.doctorId } : {}),
        },
        select: { id: true, status: true },
      });

      if (!existing) throw NotFound('Prescription');

      if (!canEditPrescription(existing.status)) {
        throw new AppError(409, 'Only draft prescriptions can be edited');
      }

      await validateMedicines(orgId, input.items, tx);

      const changed = await tx.prescription.updateMany({
        where: {
          id,
          organizationId: orgId,
          status: 'DRAFT',
          ...(scope.doctorId ? { doctorId: scope.doctorId } : {}),
        },
        data: {
          instructions: input.instructions?.trim() || null,
        },
      });

      if (changed.count !== 1) {
        throw new AppError(409, 'Prescription changed before the update could be completed');
      }

      await tx.prescriptionItem.deleteMany({
        where: { prescriptionId: id },
      });

      await tx.prescriptionItem.createMany({
        data: input.items.map((item) => ({
          prescriptionId: id,
          medicineId: item.medicineId,
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          durationDays: item.durationDays,
          quantity: item.quantity,
          notes: item.notes?.trim() || null,
        })),
      });

      return findPrescription(orgId, id, scope.doctorId, tx);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },

  async issue(orgId: string, userId: string, id: string) {
    const scope = await getDoctorScope(orgId, userId);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.prescription.findFirst({
        where: {
          id,
          organizationId: orgId,
          ...(scope.doctorId ? { doctorId: scope.doctorId } : {}),
        },
        select: {
          id: true,
          status: true,
          _count: { select: { items: true } },
        },
      });

      if (!existing) throw NotFound('Prescription');

      if (!canIssuePrescription(existing.status)) {
        throw new AppError(409, 'Only draft prescriptions can be issued');
      }

      if (existing._count.items < 1) {
        throw new AppError(422, 'A prescription must contain at least one medicine before issuing');
      }

      const changed = await tx.prescription.updateMany({
        where: {
          id,
          organizationId: orgId,
          status: 'DRAFT',
          ...(scope.doctorId ? { doctorId: scope.doctorId } : {}),
        },
        data: {
          status: 'ISSUED',
          issuedAt: new Date(),
        },
      });

      if (changed.count !== 1) {
        throw new AppError(409, 'Prescription was changed by another operation');
      }

      return findPrescription(orgId, id, scope.doctorId, tx);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },
};
