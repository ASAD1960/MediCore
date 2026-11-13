import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { ListPatientsQuery } from './patient.types';

// Every function takes organizationId and scopes by it: tenant isolation lives here.
export const patientRepository = {
  async list(orgId: string, q: ListPatientsQuery) {
    const where: Prisma.PatientWhereInput = {
      organizationId: orgId,
      ...(q.status && { status: q.status }),
      ...(q.search && {
        OR: [
          { firstName: { contains: q.search, mode: 'insensitive' } },
          { lastName: { contains: q.search, mode: 'insensitive' } },
          { patientNumber: { contains: q.search, mode: 'insensitive' } },
          { phone: { contains: q.search } },
        ],
      }),
    };
    const [data, total] = await Promise.all([
      prisma.patient.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.limit, take: q.limit }),
      prisma.patient.count({ where }),
    ]);
    return { data, total };
  },

  findById: (orgId: string, id: string) =>
    prisma.patient.findFirst({ where: { id, organizationId: orgId }, include: { allergies: true } }),

  findPotentialDuplicates: (orgId: string, p: { firstName: string; lastName: string; dateOfBirth: Date; phone: string }) =>
    prisma.patient.findMany({
      where: {
        organizationId: orgId,
        OR: [
          { phone: p.phone },
          { firstName: { equals: p.firstName, mode: 'insensitive' }, lastName: { equals: p.lastName, mode: 'insensitive' }, dateOfBirth: p.dateOfBirth },
        ],
      },
      select: { id: true, patientNumber: true, firstName: true, lastName: true, dateOfBirth: true, phone: true },
      take: 5,
    }),

  /** Atomic sequence: increments the org counter inside the same transaction as the insert. */
  createWithNumber(orgId: string, data: Omit<Prisma.PatientUncheckedCreateInput, 'organizationId' | 'patientNumber'>) {
    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.update({ where: { id: orgId }, data: { patientSeq: { increment: 1 } }, select: { patientSeq: true } });
      const patientNumber = `PAT-${String(org.patientSeq).padStart(5, '0')}`;
      return tx.patient.create({ data: { ...data, organizationId: orgId, patientNumber } });
    });
  },

  async update(orgId: string, id: string, data: Prisma.PatientUpdateInput) {
    const r = await prisma.patient.updateMany({ where: { id, organizationId: orgId }, data });
    return r.count ? prisma.patient.findFirst({ where: { id, organizationId: orgId } }) : null;
  },
};
