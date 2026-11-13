import { InvoiceStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError, NotFound } from '../../shared/errors/AppError';
import {
  BillingLineInput,
  canAcceptPayment,
  canIssueInvoice,
  canRefundPayment,
  canVoidInvoice,
  calculateInvoiceTotals,
  decimal,
  getInvoiceStatusAfterPayment,
  money,
} from './billing.rules';

const invoiceInclude = {
  patient: {
    select: {
      id: true,
      patientNumber: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  },
  items: true,
  payments: {
    orderBy: { paidAt: 'desc' as const },
    include: {
      refunds: {
        orderBy: { createdAt: 'desc' as const },
      },
    },
  },
};

export interface CreateInvoiceInput {
  patientId: string;
  dueDate?: Date;
  discountAmount?: number;
  taxAmount?: number;
  items: BillingLineInput[];
}

export interface InvoiceListQuery {
  page: number;
  limit: number;
  patientId?: string;
  status?: InvoiceStatus;
}

export interface PaymentInput {
  paymentReference: string;
  amount: number;
  paymentMethod: string;
}

export interface RefundInput {
  amount: number;
  reason: string;
}

export const billingService = {
  async listInvoices(orgId: string, query: InvoiceListQuery) {
    const where: Prisma.InvoiceWhereInput = {
      organizationId: orgId,
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.invoice.findMany({
        where,
        include: invoiceInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    return { data, total };
  },

  async getInvoice(orgId: string, id: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: invoiceInclude,
    });

    if (!invoice) throw NotFound('Invoice');

    return invoice;
  },

  async createInvoice(orgId: string, input: CreateInvoiceInput) {
    if (!input.items.length) {
      throw new AppError(422, 'At least one invoice item is required');
    }

    if (input.items.length > 100) {
      throw new AppError(422, 'An invoice cannot contain more than 100 items');
    }

    for (const item of input.items) {
      if (!item.description.trim() || !item.itemType.trim()) {
        throw new AppError(422, 'Every invoice item requires a type and description');
      }

      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 100000
      ) {
        throw new AppError(422, 'Item quantity must be between 1 and 100000');
      }

      if (!Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
        throw new AppError(422, 'Item unit price must be a valid non-negative amount');
      }
    }

    const totals = calculateInvoiceTotals(
      input.items,
      input.discountAmount ?? 0,
      input.taxAmount ?? 0,
    );

    if (totals.totalAmount.lessThan(0)) {
      throw new AppError(422, 'Invoice total cannot be negative');
    }

    return prisma.$transaction(async (tx) => {
      const patient = await tx.patient.findFirst({
        where: {
          id: input.patientId,
          organizationId: orgId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (!patient) throw NotFound('Active patient');

      const organization = await tx.organization.update({
        where: { id: orgId },
        data: { invoiceSeq: { increment: 1 } },
        select: { invoiceSeq: true },
      });

      const invoiceNumber = `INV-${String(organization.invoiceSeq).padStart(6, '0')}`;

      return tx.invoice.create({
        data: {
          organizationId: orgId,
          patientId: patient.id,
          invoiceNumber,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          paidAmount: totals.paidAmount,
          balanceAmount: totals.balanceAmount,
          status: 'DRAFT',
          dueDate: input.dueDate,
          items: {
            create: totals.lines.map((item) => ({
              itemType: item.itemType.trim(),
              description: item.description.trim(),
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              lineTotal: item.lineTotal,
            })),
          },
        },
        include: invoiceInclude,
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },

  async issueInvoice(orgId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, organizationId: orgId },
        select: { id: true, status: true, totalAmount: true },
      });

      if (!invoice) throw NotFound('Invoice');

      if (!canIssueInvoice(invoice.status)) {
        throw new AppError(409, 'Only draft invoices can be issued');
      }

      if (invoice.totalAmount.lessThan(0)) {
        throw new AppError(422, 'Invoice total is invalid');
      }

      const changed = await tx.invoice.updateMany({
        where: {
          id,
          organizationId: orgId,
          status: 'DRAFT',
        },
        data: {
          status: 'ISSUED',
          issuedAt: new Date(),
        },
      });

      if (changed.count !== 1) {
        throw new AppError(409, 'Invoice changed before it could be issued');
      }

      return tx.invoice.findFirst({
        where: { id, organizationId: orgId },
        include: invoiceInclude,
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },

  async voidInvoice(orgId: string, id: string) {
    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, organizationId: orgId },
        select: { id: true, status: true, paidAmount: true },
      });

      if (!invoice) throw NotFound('Invoice');

      if (!canVoidInvoice(invoice.status, invoice.paidAmount)) {
        throw new AppError(
          409,
          'Only unpaid draft or issued invoices can be voided',
        );
      }

      const changed = await tx.invoice.updateMany({
        where: {
          id,
          organizationId: orgId,
          status: invoice.status,
          paidAmount: 0,
        },
        data: { status: 'VOIDED' },
      });

      if (changed.count !== 1) {
        throw new AppError(409, 'Invoice changed before it could be voided');
      }

      return tx.invoice.findFirst({
        where: { id, organizationId: orgId },
        include: invoiceInclude,
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },

  async listPayments(
    orgId: string,
    query: { page: number; limit: number; invoiceId?: string },
  ) {
    const where: Prisma.PaymentWhereInput = {
      organizationId: orgId,
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
    };

    const [data, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where,
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
              patient: {
                select: { firstName: true, lastName: true, patientNumber: true },
              },
            },
          },
          refunds: true,
        },
        orderBy: { paidAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return { data, total };
  },

  async recordPayment(
    orgId: string,
    userId: string,
    invoiceId: string,
    input: PaymentInput,
  ) {
    const amount = money(decimal(input.amount));

    if (!amount.greaterThan(0)) {
      throw new AppError(422, 'Payment amount must be greater than zero');
    }

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: invoiceId, organizationId: orgId },
      });

      if (!invoice) throw NotFound('Invoice');

      if (!canAcceptPayment(invoice.status)) {
        throw new AppError(409, 'Payments can only be recorded against issued invoices');
      }

      if (amount.greaterThan(invoice.balanceAmount)) {
        throw new AppError(422, 'Payment cannot exceed the outstanding invoice balance');
      }

      const newPaidAmount = money(invoice.paidAmount.add(amount));
      const newBalance = money(invoice.totalAmount.sub(newPaidAmount));
      const nextStatus = getInvoiceStatusAfterPayment(
        newPaidAmount,
        invoice.totalAmount,
      );

      const changed = await tx.invoice.updateMany({
        where: {
          id: invoiceId,
          organizationId: orgId,
          status: { in: ['ISSUED', 'PARTIALLY_PAID'] },
          balanceAmount: { gte: amount },
        },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: nextStatus,
        },
      });

      if (changed.count !== 1) {
        throw new AppError(409, 'Invoice balance changed. Refresh and try again.');
      }

      const payment = await tx.payment.create({
        data: {
          organizationId: orgId,
          invoiceId,
          paymentReference: input.paymentReference.trim(),
          amount,
          paymentMethod: input.paymentMethod.trim(),
          paymentStatus: 'COMPLETED',
          receivedBy: userId,
        },
        include: { refunds: true },
      });

      return {
        payment,
        invoice: await tx.invoice.findFirst({
          where: { id: invoiceId, organizationId: orgId },
        }),
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },

  async refundPayment(
    orgId: string,
    userId: string,
    paymentId: string,
    input: RefundInput,
  ) {
    const amount = money(decimal(input.amount));

    if (!amount.greaterThan(0)) {
      throw new AppError(422, 'Refund amount must be greater than zero');
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id: paymentId, organizationId: orgId },
        include: { invoice: true },
      });

      if (!payment) throw NotFound('Payment');

      if (payment.paymentStatus === 'FAILED') {
        throw new AppError(409, 'Failed payments cannot be refunded');
      }

      const previousRefunds = await tx.refund.aggregate({
        where: { paymentId, organizationId: orgId },
        _sum: { amount: true },
      });

      const refundedBefore = previousRefunds._sum.amount ?? decimal(0);

      if (!canRefundPayment(payment.amount, refundedBefore, amount)) {
        throw new AppError(
          422,
          'Refund exceeds the remaining refundable payment amount',
        );
      }

      const refund = await tx.refund.create({
        data: {
          organizationId: orgId,
          paymentId,
          amount,
          reason: input.reason.trim(),
          processedBy: userId,
        },
      });

      const refundedAfter = money(refundedBefore.add(amount));

      if (refundedAfter.equals(payment.amount)) {
        await tx.payment.updateMany({
          where: {
            id: paymentId,
            organizationId: orgId,
          },
          data: { paymentStatus: 'REFUNDED' },
        });
      }

      const [payments, refunds] = await Promise.all([
        tx.payment.aggregate({
          where: {
            invoiceId: payment.invoiceId,
            organizationId: orgId,
            paymentStatus: { in: ['COMPLETED', 'REFUNDED'] },
          },
          _sum: { amount: true },
        }),
        tx.refund.aggregate({
          where: {
            organizationId: orgId,
            payment: { invoiceId: payment.invoiceId },
          },
          _sum: { amount: true },
        }),
      ]);

      const grossPaid = payments._sum.amount ?? decimal(0);
      const totalRefunded = refunds._sum.amount ?? decimal(0);
      const netPaid = money(grossPaid.sub(totalRefunded));
      const balance = money(payment.invoice.totalAmount.sub(netPaid));

      if (netPaid.lessThan(0) || balance.lessThan(0)) {
        throw new AppError(409, 'Refund would produce an invalid invoice balance');
      }

      const nextStatus = getInvoiceStatusAfterPayment(
        netPaid,
        payment.invoice.totalAmount,
      );

      const changed = await tx.invoice.updateMany({
        where: {
          id: payment.invoiceId,
          organizationId: orgId,
          status: { not: 'VOIDED' },
        },
        data: {
          paidAmount: netPaid,
          balanceAmount: balance,
          status: nextStatus,
        },
      });

      if (changed.count !== 1) {
        throw new AppError(409, 'Invoice could not be updated for this refund');
      }

      return {
        refund,
        payment: await tx.payment.findFirst({
          where: { id: paymentId, organizationId: orgId },
          include: { refunds: true },
        }),
        invoice: await tx.invoice.findFirst({
          where: { id: payment.invoiceId, organizationId: orgId },
        }),
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  },
};