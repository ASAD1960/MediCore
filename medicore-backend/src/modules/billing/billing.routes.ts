import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok, paginated } from '../../shared/utils/response';
import { audit } from '../audit-logs/audit.service';
import { billingService as svc } from './billing.service';

export const billingRoutes = Router();

const moneySchema = z.number()
  .finite()
  .min(0)
  .max(9999999999.99);

const itemSchema = z.object({
  itemType: z.string().trim().min(1).max(40),
  description: z.string().trim().min(1).max(500),
  quantity: z.number().int().min(1).max(100000),
  unitPrice: moneySchema,
});

const createInvoiceSchema = z.object({
  patientId: z.string().trim().min(1),
  dueDate: z.coerce.date().optional(),
  discountAmount: moneySchema.optional().default(0),
  taxAmount: moneySchema.optional().default(0),
  items: z.array(itemSchema).min(1).max(100),
});

const invoiceListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  patientId: z.string().optional(),
  status: z.enum([
    'DRAFT',
    'ISSUED',
    'PARTIALLY_PAID',
    'PAID',
    'VOIDED',
  ]).optional(),
});

const paymentListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  invoiceId: z.string().optional(),
});

const paymentSchema = z.object({
  paymentReference: z.string().trim().min(1).max(100),
  amount: moneySchema.refine((value) => value > 0, 'Payment must be greater than zero'),
  paymentMethod: z.string().trim().min(1).max(40),
});

const refundSchema = z.object({
  amount: moneySchema.refine((value) => value > 0, 'Refund must be greater than zero'),
  reason: z.string().trim().min(3).max(500),
});

billingRoutes.get(
  '/invoices',
  authorize('billing.view'),
  validate(invoiceListSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = invoiceListSchema.parse(req.query);
    const result = await svc.listInvoices(req.orgId!, query);
    paginated(res, result.data, query.page, query.limit, result.total);
  }),
);

billingRoutes.get(
  '/invoices/:id',
  authorize('billing.view'),
  asyncHandler(async (req, res) => {
    const data = await svc.getInvoice(req.orgId!, req.params.id);
    ok(res, data);
  }),
);

billingRoutes.post(
  '/invoices',
  authorize('billing.create'),
  validate(createInvoiceSchema),
  asyncHandler(async (req, res) => {
    const data = await svc.createInvoice(req.orgId!, req.body);
    await audit(req, {
      action: 'INVOICE_CREATED',
      resourceType: 'Invoice',
      resourceId: data.id,
      metadata: { status: data.status, invoiceNumber: data.invoiceNumber },
    });
    ok(res, data, 'Invoice draft created', 201);
  }),
);

billingRoutes.post(
  '/invoices/:id/issue',
  authorize('billing.create'),
  asyncHandler(async (req, res) => {
    const data = await svc.issueInvoice(req.orgId!, req.params.id);
    await audit(req, {
      action: 'INVOICE_ISSUED',
      resourceType: 'Invoice',
      resourceId: data!.id,
    });
    ok(res, data, 'Invoice issued');
  }),
);

billingRoutes.post(
  '/invoices/:id/void',
  authorize('billing.create'),
  asyncHandler(async (req, res) => {
    const data = await svc.voidInvoice(req.orgId!, req.params.id);
    await audit(req, {
      action: 'INVOICE_VOIDED',
      resourceType: 'Invoice',
      resourceId: data!.id,
    });
    ok(res, data, 'Invoice voided');
  }),
);

billingRoutes.get(
  '/payments',
  authorize('billing.view'),
  validate(paymentListSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = paymentListSchema.parse(req.query);
    const result = await svc.listPayments(req.orgId!, query);
    paginated(res, result.data, query.page, query.limit, result.total);
  }),
);

billingRoutes.post(
  '/invoices/:id/payments',
  authorize('billing.create'),
  validate(paymentSchema),
  asyncHandler(async (req, res) => {
    const result = await svc.recordPayment(
      req.orgId!,
      req.user!.id,
      req.params.id,
      req.body,
    );

    await audit(req, {
      action: 'PAYMENT_RECORDED',
      resourceType: 'Payment',
      resourceId: result.payment.id,
      metadata: {
        invoiceId: req.params.id,
        amount: result.payment.amount.toString(),
        paymentMethod: result.payment.paymentMethod,
      },
    });

    ok(res, result, 'Payment recorded', 201);
  }),
);

billingRoutes.post(
  '/payments/:id/refunds',
  authorize('billing.refund'),
  validate(refundSchema),
  asyncHandler(async (req, res) => {
    const result = await svc.refundPayment(
      req.orgId!,
      req.user!.id,
      req.params.id,
      req.body,
    );

    await audit(req, {
      action: 'PAYMENT_REFUNDED',
      resourceType: 'Refund',
      resourceId: result.refund.id,
      metadata: {
        paymentId: req.params.id,
        amount: result.refund.amount.toString(),
      },
    });

    ok(res, result, 'Refund processed', 201);
  }),
);