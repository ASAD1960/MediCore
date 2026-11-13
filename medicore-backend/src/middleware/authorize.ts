import { Request, Response, NextFunction } from 'express';
import { Forbidden } from '../shared/errors/AppError';
import { PermissionKey } from '../shared/constants/permissions';

export const authorize = (...required: PermissionKey[]) => (req: Request, _res: Response, next: NextFunction) => {
  const perms = req.user?.permissions;
  if (!perms || !required.every((p) => perms.has(p))) return next(Forbidden());
  next();
};
