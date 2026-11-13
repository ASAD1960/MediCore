import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../shared/errors/AppError';

export const validate = (schema: ZodSchema, source: 'body' | 'query' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(new AppError(422, 'Validation failed',
        result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))));
    }
    (req as any)[source] = result.data;
    next();
  };
