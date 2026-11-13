import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok, paginated } from '../../shared/utils/response';
import { audit } from '../audit-logs/audit.service';
import { laboratoryService as svc } from './laboratory.service';

export const laboratoryRoutes = Router();

const testCreateSchema = z.object({
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(160),
  price: z.number().finite().min(0).max(9999999999.99).optional(),
  referenceRange: z.string().trim().max(300).optional(),
});

const testUpdateSchema = z.object({
  code: z.string().trim().min(1).max(40).optional(),
  name: z.string().trim().min(1).max(160).optional(),
  price: z.number().finite().min(0).max(9999999999.99).optional(),
  referenceRange: z.string().trim().max(300).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided',
});

const listTestsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
});

const listOrdersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  patientId: z.string().optional(),
  status: z.enum([
    'REQUESTED',
    'SAMPLE_COLLECTED',
    'PROCESSING',
    'RESULT_ENTERED',
    'VERIFIED',
    'CANCELLED',
  ]).optional(),
});

const createOrderSchema = z.object({
  patientId: z.string().trim().min(1),
  labTestIds: z.array(z.string().trim().min(1)).min(1).max(30),
});

const resultSchema = z.object({
  value: z.string().trim().min(1).max(4000),
  unit: z.string().trim().max(80).optional(),
});

laboratoryRoutes.get(
  '/tests',
  authorize('lab.tests.view'),
  validate(listTestsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = listTestsSchema.parse(req.query);
    ok(res, await svc.listTests(req.orgId!, query));
  }),
);

laboratoryRoutes.post(
  '/tests',
  authorize('lab.tests.manage'),
  validate(testCreateSchema),
  asyncHandler(async (req, res) => {
    const data = await svc.createTest(req.orgId!, req.body);
    await audit(req, {
      action: 'LAB_TEST_CREATED',
      resourceType: 'LabTest',
      resourceId: data.id,
      metadata: { code: data.code },
    });
    ok(res, data, 'Laboratory test created', 201);
  }),
);

laboratoryRoutes.patch(
  '/tests/:id',
  authorize('lab.tests.manage'),
  validate(testUpdateSchema),
  asyncHandler(async (req, res) => {
    const data = await svc.updateTest(req.orgId!, req.params.id, req.body);
    await audit(req, {
      action: 'LAB_TEST_UPDATED',
      resourceType: 'LabTest',
      resourceId: data.id,
      metadata: { status: data.status },
    });
    ok(res, data, 'Laboratory test updated');
  }),
);

laboratoryRoutes.get(
  '/orders',
  authorize('lab.orders.view'),
  validate(listOrdersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = listOrdersSchema.parse(req.query);
    const result = await svc.listOrders(req.orgId!, req.user!.id, query);
    paginated(res, result.data, query.page, query.limit, result.total);
  }),
);

laboratoryRoutes.get(
  '/orders/:id',
  authorize('lab.orders.view'),
  asyncHandler(async (req, res) => {
    ok(res, await svc.getOrder(req.orgId!, req.user!.id, req.params.id));
  }),
);

laboratoryRoutes.post(
  '/orders',
  authorize('lab.orders.create'),
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const data = await svc.createOrder(req.orgId!, req.user!.id, req.body);
    await audit(req, {
      action: 'LAB_ORDER_CREATED',
      resourceType: 'LabOrder',
      resourceId: data.id,
      metadata: { status: data.status, itemCount: data.items.length },
    });
    ok(res, data, 'Laboratory order created', 201);
  }),
);

laboratoryRoutes.post(
  '/orders/:id/collect-sample',
  authorize('lab.samples.collect'),
  asyncHandler(async (req, res) => {
    const data = await svc.collectSample(req.orgId!, req.user!.id, req.params.id);
    await audit(req, {
      action: 'LAB_SAMPLE_COLLECTED',
      resourceType: 'LabOrder',
      resourceId: data.id,
      metadata: { status: data.status },
    });
    ok(res, data, 'Sample collection recorded');
  }),
);

laboratoryRoutes.post(
  '/orders/:id/start-processing',
  authorize('lab.orders.process'),
  asyncHandler(async (req, res) => {
    const data = await svc.startProcessing(req.orgId!, req.user!.id, req.params.id);
    await audit(req, {
      action: 'LAB_PROCESSING_STARTED',
      resourceType: 'LabOrder',
      resourceId: data.id,
      metadata: { status: data.status },
    });
    ok(res, data, 'Laboratory processing started');
  }),
);

laboratoryRoutes.post(
  '/orders/:id/items/:itemId/result',
  authorize('lab.results.enter'),
  validate(resultSchema),
  asyncHandler(async (req, res) => {
    const data = await svc.enterResult(
      req.orgId!,
      req.user!.id,
      req.params.id,
      req.params.itemId,
      req.body,
    );
    await audit(req, {
      action: 'LAB_RESULT_ENTERED',
      resourceType: 'LabOrder',
      resourceId: data.id,
      metadata: { status: data.status, itemId: req.params.itemId },
    });
    ok(res, data, 'Laboratory result recorded');
  }),
);

laboratoryRoutes.post(
  '/results/:resultId/verify',
  authorize('lab.results.verify'),
  asyncHandler(async (req, res) => {
    const data = await svc.verifyResult(
      req.orgId!,
      req.user!.id,
      req.params.resultId,
    );
    await audit(req, {
      action: 'LAB_RESULT_VERIFIED',
      resourceType: 'LabOrder',
      resourceId: data.id,
      metadata: { status: data.status, resultId: req.params.resultId },
    });
    ok(res, data, 'Laboratory result verified');
  }),
);
