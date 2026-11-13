import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok, paginated } from '../../shared/utils/response';
import { audit } from '../audit-logs/audit.service';
import { consultationService as svc } from './consultation.service';

export const consultationRoutes = Router();

const diagnosisSchema = z.object({
  code: z.string().trim().max(40).optional(),
  description: z.string().trim().min(1).max(500),
});

const createSchema = z.object({
  patientId: z.string().trim().min(1),
  doctorId: z.string().trim().min(1),
  appointmentId: z.string().trim().min(1).optional(),
  chiefComplaint: z.string().trim().max(2000).optional(),
  clinicalNotes: z.string().trim().max(12000).optional(),
  diagnosis: z.string().trim().max(4000).optional(),
  treatmentPlan: z.string().trim().max(8000).optional(),
  diagnoses: z.array(diagnosisSchema).max(30).optional(),
});

const updateSchema = z.object({
  chiefComplaint: z.string().trim().max(2000).nullable().optional(),
  clinicalNotes: z.string().trim().max(12000).nullable().optional(),
  diagnosis: z.string().trim().max(4000).nullable().optional(),
  treatmentPlan: z.string().trim().max(8000).nullable().optional(),
  diagnoses: z.array(diagnosisSchema).max(30).optional(),
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided',
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  patientId: z.string().optional(),
  doctorId: z.string().optional(),
  status: z.enum(['DRAFT', 'FINALIZED', 'AMENDED']).optional(),
});

consultationRoutes.get(
  '/',
  authorize('consultations.view'),
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    const query = listSchema.parse(req.query);
    const { data, total } = await svc.list(req.orgId!, req.user!.id, query);
    paginated(res, data, query.page, query.limit, total);
  }),
);

consultationRoutes.get(
  '/:id',
  authorize('consultations.view'),
  asyncHandler(async (req, res) => {
    ok(res, await svc.get(req.orgId!, req.user!.id, req.params.id));
  }),
);

consultationRoutes.post(
  '/',
  authorize('consultations.create'),
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const consultation = await svc.create(req.orgId!, req.user!.id, req.body);

    await audit(req, {
      action: 'consultation.create',
      resourceType: 'consultation',
      resourceId: consultation.id,
      metadata: { encounterId: consultation.encounterId },
    });

    ok(res, consultation, 'Consultation created', 201);
  }),
);

consultationRoutes.patch(
  '/:id',
  authorize('consultations.create'),
  validate(updateSchema),
  asyncHandler(async (req, res) => {
    const consultation = await svc.update(
      req.orgId!,
      req.user!.id,
      req.params.id,
      req.body,
    );

    await audit(req, {
      action: 'consultation.update',
      resourceType: 'consultation',
      resourceId: consultation.id,
    });

    ok(res, consultation, 'Draft consultation updated');
  }),
);

consultationRoutes.post(
  '/:id/finalize',
  authorize('consultations.finalize'),
  asyncHandler(async (req, res) => {
    const consultation = await svc.finalize(
      req.orgId!,
      req.user!.id,
      req.params.id,
    );

    await audit(req, {
      action: 'consultation.finalize',
      resourceType: 'consultation',
      resourceId: consultation.id,
    });

    ok(res, consultation, 'Consultation finalized');
  }),
);