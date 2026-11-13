import { Router } from 'express';
import { prisma } from '../../config/database';
import { authorize } from '../../middleware/authorize';
import { asyncHandler, paginated } from '../../shared/utils/response';

export const auditRoutes = Router();
// Read-only by design (FR-AUD-06): no update/delete endpoints exist.
auditRoutes.get('/', authorize('audit.view'), asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Number(req.query.limit) || 20);
  const where = { organizationId: req.orgId };
  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { timestamp: 'desc' }, skip: (page - 1) * limit, take: limit }),
    prisma.auditLog.count({ where }),
  ]);
  paginated(res, data, page, limit, total);
}));
