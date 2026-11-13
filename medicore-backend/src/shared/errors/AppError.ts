export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: { field?: string; message: string }[],
  ) {
    super(message);
  }
}
export const NotFound = (what = 'Resource') => new AppError(404, `${what} not found`);
export const Forbidden = (msg = 'Permission denied') => new AppError(403, msg);
export const Unauthorized = (msg = 'Authentication required') => new AppError(401, msg);
