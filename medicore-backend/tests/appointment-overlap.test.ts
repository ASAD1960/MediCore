import { describe, expect, it } from 'vitest';

// Interval-overlap rule used by appointmentService.create (BR-04).
const overlaps = (aS: number, aE: number, bS: number, bE: number) => aS < bE && aE > bS;

describe('appointment overlap rule', () => {
  it('detects partial overlap', () => expect(overlaps(10, 20, 15, 25)).toBe(true));
  it('allows back-to-back slots', () => expect(overlaps(10, 20, 20, 30)).toBe(false));
  it('detects containment', () => expect(overlaps(10, 40, 15, 20)).toBe(true));
});
