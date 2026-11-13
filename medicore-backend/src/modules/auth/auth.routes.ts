import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/environment';
import { authenticate } from '../../middleware/authenticate';
import { authLimiter } from '../../middleware/rate-limit';
import { validate } from '../../middleware/validate';
import { asyncHandler, ok } from '../../shared/utils/response';
import { audit } from '../audit-logs/audit.service';
import * as service from './auth.service';

export const authRoutes = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/',
};

const clearCookieOpts = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: env.NODE_ENV === 'production',
  path: '/',
};

authRoutes.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    try {
      const { token, user } = await service.login(
        req.body.email,
        req.body.password,
      );

      // Complete the audit operation before issuing the session cookie.
      await audit(req, {
        action: 'auth.login',
        userId: user.id,
        organizationId: user.organizationId,
      });

      res.cookie('access_token', token, cookieOpts);

      ok(
        res,
        {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: user.organizationId,
        },
        'Login successful',
      );
    } catch (e) {
      await audit(req, {
        action: 'auth.login_failed',
      }).catch(() => {});

      throw e;
    }
  }),
);

authRoutes.post(
  '/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    // Clear the browser session even if audit logging is unavailable.
    res.clearCookie('access_token', clearCookieOpts);

    await audit(req, {
      action: 'auth.logout',
    }).catch(() => {});

    ok(res, null, 'Logged out');
  }),
);

authRoutes.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const u = await prisma.user.findUniqueOrThrow({
      where: {
        id: req.user!.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        organization: {
          select: {
            id: true,
            name: true,
            timezone: true,
          },
        },
      },
    });

    ok(res, {
      ...u,
      permissions: [...req.user!.permissions],
    });
  }),
);