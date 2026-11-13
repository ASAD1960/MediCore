import { z } from 'zod';

export const overviewQuerySchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
  })
  .refine((value) => value.to > value.from, {
    message: 'The end date must be after the start date',
    path: ['to'],
  })
  .refine(
    (value) =>
      value.to.getTime() - value.from.getTime() <=
      26 * 60 * 60 * 1000,
    {
      message: 'The requested date range cannot exceed 26 hours',
      path: ['to'],
    },
  );
