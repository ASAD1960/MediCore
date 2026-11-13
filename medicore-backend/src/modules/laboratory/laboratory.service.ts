import { randomBytes } from 'crypto';
import {
  LabOrderStatus,
  Prisma,
  RecordStatus,
} from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, Forbidden, NotFound } from '../../shared/errors/AppError';
import {
  allLabResultsPresent,
  allLabResultsVerified,
  canCollectSample,
  canEnterLabResult,
  canStartProcessing,
  canVerifyLabResult,
  hasLabTests,
} from './laboratory.rules';

const labOrderInclude = {
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
  items: {
    include: {
      test: true,
      result: {
        select: {
          id: true,
          value: true,
          unit: true,
          enteredBy: true,
          verifiedBy: true,
          verifiedAt: true,
          createdAt: true,
        },
      },
    },
  },
} satisfies Prisma.LabOrderInclude;

type ScopeDb = Pick<Prisma.TransactionClient, 'user'>;

interface LabScope {
  requestedBy?: string;
}

interface ListOrdersQuery {
  page: number;
  limit: number;
  patientId?: string;
  status?: LabOrderStatus;
}

interface ListTestsQuery {
  search?: string;
  status?: RecordStatus;
}

interface CreateTestInput {
  code: string;
  name: string;
  price?: number;
  referenceRange?: string;
}

interface UpdateTestInput {
  code?: string;
  name?: string;
  price?: number;
  referenceRange?: string | null;
  status?: RecordStatus;
}

interface CreateOrderInput {
  patientId: string;
  labTestIds: string[];
}

async function getLabScope(
  orgId: string,
  userId: string,
  db: ScopeDb = prisma,
): Promise<LabScope> {
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
    return {};
  }

  if (roles.includes('Doctor')) {
    return { requestedBy: userId };
  }

  if (
    roles.includes('Receptionist') ||
    roles.includes('Laboratory Technician')
  ) {
    return {};
  }

  throw Forbidden('You are not permitted to access laboratory records');
}

function makeRequestNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `LAB-${date}-${suffix}`;
}

async function findOrder(
  orgId: string,
  userId: string,
  id: string,
  db: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const scope = await getLabScope(orgId, userId, db);

  const order = await db.labOrder.findFirst({
    where: {
      id,
      organizationId: orgId,
      ...scope,
    },
    include: labOrderInclude,
  });

  if (!order) throw NotFound('Laboratory order');

  return order;
}

async function validateLabTests(
  orgId: string,
  ids: string[],
  db: Prisma.TransactionClient,
) {
  if (!hasLabTests(ids)) {
    throw new AppError(422, 'At least one laboratory test is required');
  }

  if (ids.length > 30) {
    throw new AppError(422, 'An order cannot contain more than 30 tests');
  }

  if (new Set(ids).size !== ids.length) {
    throw new AppError(422, 'Duplicate laboratory tests are not allowed');
  }

  const tests = await db.labTest.findMany({
    where: {
      organizationId: orgId,
      id: { in: ids },
      status: 'ACTIVE',
    },
    select: { id: true },
  });

  if (tests.length !== ids.length) {
    throw new AppError(
      422,
      'One or more laboratory tests are unavailable in this organization',
    );
  }
}

export const laboratoryService = {
  async listTests(orgId: string, query: ListTestsQuery) {
    return prisma.labTest.findMany({
      where: {
        organizationId: orgId,
        ...(query.status ? { status: query.status } : {}),
        ...(query.search
          ? {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { code: { contains: query.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take: 500,
    });
  },

  async createTest(orgId: string, input: CreateTestInput) {
    const code = input.code.trim().toUpperCase();
    const name = input.name.trim();

    if (!code || !name) {
      throw new AppError(422, 'Test code and name are required');
    }

    return prisma.labTest.create({
      data: {
        organizationId: orgId,
        code,
        name,
        price: input.price ?? 0,
        referenceRange: input.referenceRange?.trim() || null,
      },
    });
  },

  async updateTest(orgId: string, id: string, input: UpdateTestInput) {
    const existing = await prisma.labTest.findFirst({
      where: { id, organizationId: orgId },
      select: { id: true },
    });

    if (!existing) throw NotFound('Laboratory test');

    const changed = await prisma.labTest.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...(input.code !== undefined
          ? { code: input.code.trim().toUpperCase() }
          : {}),
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.referenceRange !== undefined
          ? { referenceRange: input.referenceRange?.trim() || null }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    if (changed.count !== 1) throw NotFound('Laboratory test');

    return prisma.labTest.findFirstOrThrow({
      where: { id, organizationId: orgId },
    });
  },

  async listOrders(
    orgId: string,
    userId: string,
    query: ListOrdersQuery,
  ) {
    const scope = await getLabScope(orgId, userId);

    const where: Prisma.LabOrderWhereInput = {
      organizationId: orgId,
      ...scope,
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.labOrder.findMany({
        where,
        include: labOrderInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.labOrder.count({ where }),
    ]);

    return { data, total };
  },

  async getOrder(orgId: string, userId: string, id: string) {
    return findOrder(orgId, userId, id);
  },

  async createOrder(
    orgId: string,
    userId: string,
    input: CreateOrderInput,
  ) {
    const scope = await getLabScope(orgId, userId);

    return prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: {
          id: input.patientId,
          organizationId: orgId,
        },
        select: { id: true },
      });

      if (!patient) throw NotFound('Patient');

      await validateLabTests(orgId, input.labTestIds, tx);

      const order = await tx.labOrder.create({
        data: {
          organizationId: orgId,
          patientId: patient.id,
          requestedBy: userId,
          requestNumber: makeRequestNumber(),
          status: 'REQUESTED',
          items: {
            create: input.labTestIds.map((labTestId) => ({ labTestId })),
          },
        },
        include: labOrderInclude,
      });

      if (scope.requestedBy && order.requestedBy !== scope.requestedBy) {
        throw Forbidden();
      }

      return order;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },

  async collectSample(orgId: string, userId: string, id: string) {
    const scope = await getLabScope(orgId, userId);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.labOrder.findFirst({
        where: { id, organizationId: orgId, ...scope },
        select: { id: true, status: true },
      });

      if (!existing) throw NotFound('Laboratory order');
      if (!canCollectSample(existing.status)) {
        throw new AppError(409, 'Only requested orders can have samples collected');
      }

      const changed = await tx.labOrder.updateMany({
        where: {
          id,
          organizationId: orgId,
          status: 'REQUESTED',
          ...scope,
        },
        data: { status: 'SAMPLE_COLLECTED' },
      });

      if (changed.count !== 1) {
        throw new AppError(409, 'Order changed before sample collection completed');
      }

      return findOrder(orgId, userId, id, tx);
    });
  },

  async startProcessing(orgId: string, userId: string, id: string) {
    const scope = await getLabScope(orgId, userId);

    return prisma.$transaction(async (tx) => {
      const existing = await tx.labOrder.findFirst({
        where: { id, organizationId: orgId, ...scope },
        select: { id: true, status: true },
      });

      if (!existing) throw NotFound('Laboratory order');
      if (!canStartProcessing(existing.status)) {
        throw new AppError(409, 'Only orders with collected samples can enter processing');
      }

      const changed = await tx.labOrder.updateMany({
        where: {
          id,
          organizationId: orgId,
          status: 'SAMPLE_COLLECTED',
          ...scope,
        },
        data: { status: 'PROCESSING' },
      });

      if (changed.count !== 1) {
        throw new AppError(409, 'Order changed before processing could start');
      }

      return findOrder(orgId, userId, id, tx);
    });
  },

  async enterResult(
    orgId: string,
    userId: string,
    orderId: string,
    itemId: string,
    input: { value: string; unit?: string },
  ) {
    const scope = await getLabScope(orgId, userId);

    return prisma.$transaction(async (tx) => {
      const item = await tx.labOrderItem.findFirst({
        where: {
          id: itemId,
          labOrderId: orderId,
          order: {
            is: {
              organizationId: orgId,
              ...scope,
            },
          },
        },
        include: {
          order: { select: { id: true, status: true } },
          result: { select: { id: true } },
        },
      });

      if (!item) throw NotFound('Laboratory order item');

      if (!canEnterLabResult(item.order.status, Boolean(item.result))) {
        throw new AppError(
          409,
          'Results can only be entered once for an item in a processing order',
        );
      }

      await tx.labResult.create({
        data: {
          organizationId: orgId,
          labOrderItemId: item.id,
          value: input.value.trim(),
          unit: input.unit?.trim() || null,
          enteredBy: userId,
        },
      });

      const items = await tx.labOrderItem.findMany({
        where: { labOrderId: orderId },
        select: { result: { select: { id: true } } },
      });

      const resultCount = items.filter((entry) => entry.result !== null).length;

      if (allLabResultsPresent(items.length, resultCount)) {
        const changed = await tx.labOrder.updateMany({
          where: {
            id: orderId,
            organizationId: orgId,
            status: 'PROCESSING',
            ...scope,
          },
          data: { status: 'RESULT_ENTERED' },
        });

        if (changed.count !== 1) {
          throw new AppError(409, 'Order changed while results were being entered');
        }
      }

      return findOrder(orgId, userId, orderId, tx);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },

  async verifyResult(orgId: string, userId: string, resultId: string) {
    const scope = await getLabScope(orgId, userId);

    return prisma.$transaction(async (tx) => {
      const result = await tx.labResult.findFirst({
        where: {
          id: resultId,
          organizationId: orgId,
        },
        include: {
          item: {
            include: {
              order: {
                select: {
                  id: true,
                  organizationId: true,
                  requestedBy: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      if (
        !result ||
        result.item.order.organizationId !== orgId ||
        (scope.requestedBy && result.item.order.requestedBy !== scope.requestedBy)
      ) {
        throw NotFound('Laboratory result');
      }

      if (!canVerifyLabResult(result.item.order.status, Boolean(result.verifiedAt))) {
        throw new AppError(409, 'This result is not ready for verification');
      }

      if (result.enteredBy === userId) {
        throw new AppError(403, 'A result must be verified by a different user');
      }

      const changed = await tx.labResult.updateMany({
        where: {
          id: resultId,
          organizationId: orgId,
          verifiedAt: null,
          verifiedBy: null,
        },
        data: {
          verifiedBy: userId,
          verifiedAt: new Date(),
        },
      });

      if (changed.count !== 1) {
        throw new AppError(409, 'Result was already verified or changed');
      }

      const items = await tx.labOrderItem.findMany({
        where: { labOrderId: result.item.labOrderId },
        select: {
          result: {
            select: {
              id: true,
              verifiedAt: true,
            },
          },
        },
      });

      const totalResults = items.filter((item) => item.result !== null).length;
      const verifiedResults = items.filter(
        (item) => item.result?.verifiedAt !== null && item.result !== null,
      ).length;

      if (allLabResultsVerified(totalResults, verifiedResults) &&
          totalResults === items.length) {
        const orderChanged = await tx.labOrder.updateMany({
          where: {
            id: result.item.labOrderId,
            organizationId: orgId,
            status: 'RESULT_ENTERED',
          },
          data: { status: 'VERIFIED' },
        });

        if (orderChanged.count !== 1) {
          throw new AppError(409, 'Order changed while verification was completing');
        }
      }

      return findOrder(orgId, userId, result.item.labOrderId, tx);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },
};
