import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import pino from 'pino';
import { AppError } from '../shared/errors/AppError';

const log = pino();

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ success: false, message: err.message, errors: err.errors });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Duplicate resource' });
    if (err.code === 'P2034') return res.status(409).json({ success: false, message: 'Conflict, please retry' });
  }
  log.error(err); // internal details are logged, never returned (NFR-REL-05)
  res.status(500).json({ success: false, message: 'Internal server error' });
}
