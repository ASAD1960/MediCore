import { Request, Response } from 'express';
import { ok, paginated } from '../../shared/utils/response';
import { audit } from '../audit-logs/audit.service';
import { patientService } from './patient.service';

export const patientController = {
  async list(req: Request, res: Response) {
    const q = req.query as any;
    const { data, total } = await patientService.list(req.orgId!, q);
    paginated(res, data, q.page, q.limit, total);
  },
  async get(req: Request, res: Response) {
    const p = await patientService.get(req.orgId!, req.params.id);
    await audit(req, { action: 'patient.view', resourceType: 'patient', resourceId: p.id }); // FR-EMR-10
    ok(res, p);
  },
  async create(req: Request, res: Response) {
    const p = await patientService.register(req.orgId!, req.body);
    await audit(req, { action: 'patient.create', resourceType: 'patient', resourceId: p.id });
    ok(res, p, 'Patient registered successfully', 201);
  },
  async update(req: Request, res: Response) {
    const p = await patientService.update(req.orgId!, req.params.id, req.body);
    await audit(req, { action: 'patient.update', resourceType: 'patient', resourceId: p.id, metadata: { fields: Object.keys(req.body) } });
    ok(res, p, 'Patient updated');
  },
};
