import { Request, Response, NextFunction } from 'express';
import { Forbidden } from '../shared/errors/AppError';

/** Resolves the organization from the authenticated user ONLY (never from client input). */
export function tenantContext(req: Request, _res: Response, next: NextFunction) {
  const orgId = req.user?.organizationId;
  if (!orgId) return next(Forbidden('No organization context'));
  req.orgId = orgId;
  next();
}
