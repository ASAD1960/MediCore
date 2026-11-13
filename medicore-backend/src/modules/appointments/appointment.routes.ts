import { Router } from 'express';
import { z } from 'zod';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok, paginated } from '../../shared/utils/response';
import { audit } from '../audit-logs/audit.service';
import { appointmentService as svc } from './appointment.service';

export const appointmentRoutes = Router();

const createSchema = z.object({
  patientId: z.string().trim().min(1), doctorId: z.string().trim().min(1), startTime: z.coerce.date(),
  durationMinutes: z.number().int().min(5).max(240).default(15),
  reason: z.string().max(500).optional(), appointmentType: z.string().max(40).optional(), branchId: z.string().trim().min(1).optional(),
});
const availabilitySchema = z.object({
  doctorId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD'),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
  doctorId: z.string().optional(), patientId: z.string().optional(),
  from: z.coerce.date().optional(), to: z.coerce.date().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'WAITING', 'IN_CONSULTATION', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
});

appointmentRoutes.get('/availability', authorize('appointments.view'), validate(availabilitySchema, 'query'), asyncHandler(async (req, res) => {
  const q = req.query as z.infer<typeof availabilitySchema>;
  ok(res, await svc.availability(req.orgId!, q.doctorId, q.date));
}));

appointmentRoutes.get('/', authorize('appointments.view'), validate(listSchema, 'query'), asyncHandler(async (req, res) => {
  const q = req.query as any;
  const { data, total } = await svc.list(req.orgId!, q);
  paginated(res, data, q.page, q.limit, total);
}));

appointmentRoutes.post('/', authorize('appointments.create'), validate(createSchema), asyncHandler(async (req, res) => {
  const a = await svc.create(req.orgId!, req.user!.id, req.body);
  await audit(req, { action: 'appointment.create', resourceType: 'appointment', resourceId: a.id });
  ok(res, a, 'Appointment created', 201);
}));

appointmentRoutes.post('/:id/cancel', authorize('appointments.cancel'), asyncHandler(async (req, res) => {
  const a = await svc.changeStatus(req.orgId!, req.params.id, 'CANCELLED');
  await audit(req, { action: 'appointment.cancel', resourceType: 'appointment', resourceId: a.id });
  ok(res, a, 'Appointment cancelled');
}));

appointmentRoutes.post('/:id/check-in', authorize('appointments.check_in'), asyncHandler(async (req, res) => {
  const a = await svc.changeStatus(req.orgId!, req.params.id, 'CHECKED_IN');
  await audit(req, { action: 'appointment.check_in', resourceType: 'appointment', resourceId: a.id });
  ok(res, a, 'Patient checked in');
}));
