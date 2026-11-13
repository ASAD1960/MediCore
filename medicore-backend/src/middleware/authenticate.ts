import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/environment';
import { prisma } from '../config/database';
import { Unauthorized } from '../shared/errors/AppError';

export interface AuthUser {
  id: string;
  organizationId: string | null;
  isPlatformAdmin: boolean;
  permissions: Set<string>;
}
declare global { namespace Express { interface Request { user?: AuthUser; orgId?: string } } }

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    const token = req.cookies?.access_token ?? (header?.startsWith('Bearer ') ? header.slice(7) : undefined);
    if (!token) throw Unauthorized();

    let payload: { sub: string };
    try { payload = jwt.verify(token, env.JWT_SECRET) as { sub: string }; }
    catch { throw Unauthorized('Session expired or invalid'); }

    // Always reload from DB so deactivation / role changes apply immediately.
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organization: { select: { status: true } },
        userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
      },
    });
    if (!user || user.status !== 'ACTIVE') throw Unauthorized('Account inactive');
    if (user.organization && user.organization.status !== 'ACTIVE') throw Unauthorized('Organization inactive');

    const permissions = new Set(
      user.userRoles.flatMap((ur) => ur.role.rolePermissions.map((rp) => rp.permission.key)),
    );
    req.user = { id: user.id, organizationId: user.organizationId, isPlatformAdmin: user.isPlatformAdmin, permissions };
    next();
  } catch (e) { next(e); }
}
