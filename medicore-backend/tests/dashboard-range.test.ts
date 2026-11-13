import { describe, expect, it } from 'vitest';
import { overviewQuerySchema } from '../src/modules/dashboard/dashboard.validation';

describe('dashboard overview date validation', () => {
  it('accepts a valid one-day range', () => {
    const result = overviewQuerySchema.safeParse({
      from: '2026-11-10T00:00:00.000Z',
      to: '2026-11-11T00:00:00.000Z',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an end date before the start date', () => {
    const result = overviewQuerySchema.safeParse({
      from: '2026-11-11T00:00:00.000Z',
      to: '2026-11-10T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects ranges longer than 26 hours', () => {
    const result = overviewQuerySchema.safeParse({
      from: '2026-11-10T00:00:00.000Z',
      to: '2026-11-11T03:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid date values', () => {
    const result = overviewQuerySchema.safeParse({
      from: 'not-a-date',
      to: '2026-11-11T00:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});
