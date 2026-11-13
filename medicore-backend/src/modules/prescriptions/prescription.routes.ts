import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok, paginated } from '../../shared/utils/response';

import { audit } from '../audit-logs/audit.service';
import { prescriptionService } from './prescription.service';

export const prescriptionRoutes = Router();

const itemSchema = z.object({
  medicineId: z.string().min(1),
  dosage: z.string().trim().min(1).max(200),
  frequency: z.string().trim().min(1).max(200),
  durationDays: z.number().int().min(1).max(365),
  quantity: z.number().int().min(1).max(100000),
  notes: z.string().trim().max(1000).optional(),
});

const createSchema = z.object({
  consultationId: z.string().min(1),
  instructions: z.string().trim().max(4000).optional(),
  items: z.array(itemSchema).min(1).max(50),
});

const updateSchema = z.object({
  instructions: z.string().trim().max(4000).nullable().optional(),
  items: z.array(itemSchema).min(1).max(50),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  patientId: z.string().optional(),
  status: z.enum(['DRAFT', 'ISSUED', 'DISPENSED', 'VOIDED']).optional(),
});

prescriptionRoutes.get(
  '/medicines',
  authorize('prescriptions.view'),
  asyncHandler(async (req, res) => {
    const data = await prescriptionService.medicines(req.orgId!, req.user!.id);
    ok(res, data);
  }),
);

prescriptionRoutes.get(
  '/',
  authorize('prescriptions.view'),
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = listSchema.parse(req.query);
    const result = await prescriptionService.list(req.orgId!, req.user!.id, query);
    paginated(res, result.data, query.page, query.limit, result.total);
  }),
);

prescriptionRoutes.get(
  '/:id',
  authorize('prescriptions.view'),
  asyncHandler(async (req, res) => {
    const data = await prescriptionService.get(req.orgId!, req.user!.id, req.params.id);
    ok(res, data);
  }),
);

prescriptionRoutes.post(
  '/',
  authorize('prescriptions.create'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const data = await prescriptionService.create(req.orgId!, req.user!.id, req.body);
    await audit(req, {
      action: 'PRESCRIPTION_CREATED',
      resourceType: 'Prescription',
      resourceId: data.id,
      metadata: { status: data.status },
    });
    ok(res, data, 'Prescription draft created', 201);
  }),
);

prescriptionRoutes.patch(
  '/:id',
  authorize('prescriptions.create'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const data = await prescriptionService.update(
      req.orgId!,
      req.user!.id,
      req.params.id,
      req.body,
    );
    await audit(req, {
      action: 'PRESCRIPTION_UPDATED',
      resourceType: 'Prescription',
      resourceId: data.id,
      metadata: { status: data.status },
    });
    ok(res, data, 'Prescription draft updated');
  }),
);

prescriptionRoutes.post(
  '/:id/issue',
  authorize('prescriptions.create'),
  asyncHandler(async (req, res) => {
    const data = await prescriptionService.issue(req.orgId!, req.user!.id, req.params.id);
    await audit(req, {
      action: 'PRESCRIPTION_ISSUED',
      resourceType: 'Prescription',
      resourceId: data.id,
      metadata: { status: data.status },
    });
    ok(res, data, 'Prescription issued');
  }),
);
