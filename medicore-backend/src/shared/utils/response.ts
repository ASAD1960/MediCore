import { Response, Request, NextFunction, RequestHandler } from 'express';

export const ok = (res: Response, data: unknown, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });

export const paginated = (res: Response, data: unknown[], page: number, limit: number, total: number) =>
  res.json({ success: true, data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => { fn(req, res, next).catch(next); };
