import { Request } from 'express';
import { prisma } from '../../config/database';

interface AuditInput {
  action: string; resourceType?: string; resourceId?: string;
  userId?: string | null; organizationId?: string | null; metadata?: Record<string, unknown>;
}
/** Never put passwords, tokens or clinical content into metadata. */
export async function audit(req: Request, input: AuditInput) {
  await prisma.auditLog.create({
    data: {
      action: input.action, resourceType: input.resourceType, resourceId: input.resourceId,
      userId: input.userId ?? req.user?.id, organizationId: input.organizationId ?? req.orgId ?? req.user?.organizationId,
      ipAddress: req.ip, userAgent: req.headers['user-agent'], requestId: req.headers['x-request-id']?.toString(),
      metadata: input.metadata as any,
    },
  });
}
