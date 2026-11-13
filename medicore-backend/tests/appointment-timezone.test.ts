import { describe, expect, it } from 'vitest';
import {
  getLocalDate,
  localDateTimeToUtc,
  nextCalendarDate,
  validateTimezone,
} from '../src/shared/utils/timezone';

describe('Organization timezone utilities', () => {
  it('uses the first canonical occurrence of an ambiguous autumn DST time', () => {
    const canonical = localDateTimeToUtc(
      '2026-11-01',
      '01:30',
      'America/New_York',
    );

    const secondOccurrence = new Date('2026-11-01T06:30:00.000Z');

    expect(canonical.toISOString()).toBe('2026-11-01T05:30:00.000Z');
    expect(secondOccurrence.getTime()).not.toBe(canonical.getTime());
    expect(getLocalDate(secondOccurrence, 'America/New_York')).toBe('2026-11-01');
  });
  it('converts Karachi clinic time to the correct UTC instant', () => {
    const result = localDateTimeToUtc(
      '2026-11-10',
      '09:00',
      'Asia/Karachi',
    );

    expect(result.toISOString()).toBe('2026-11-10T04:00:00.000Z');
  });

  it('preserves the time when the organization uses UTC', () => {
    const result = localDateTimeToUtc(
      '2026-11-10',
      '09:30',
      'UTC',
    );

    expect(result.toISOString()).toBe('2026-11-10T09:30:00.000Z');
  });

  it('calculates the organization-local date instead of the UTC date', () => {
    const instant = new Date('2026-11-10T20:00:00.000Z');

    expect(getLocalDate(instant, 'Asia/Karachi')).toBe('2026-11-11');
  });

  it('handles calendar dates across month and year boundaries', () => {
    expect(nextCalendarDate('2026-11-30')).toBe('2026-12-01');
    expect(nextCalendarDate('2026-12-31')).toBe('2027-01-01');
  });

  it('handles leap-year dates', () => {
    expect(nextCalendarDate('2028-02-28')).toBe('2028-02-29');
    expect(nextCalendarDate('2028-02-29')).toBe('2028-03-01');
  });

  it('rejects invalid calendar dates', () => {
    expect(() =>
      localDateTimeToUtc('2026-02-31', '09:00', 'Asia/Karachi'),
    ).toThrow('Invalid calendar date');
  });

  it('rejects invalid timezone identifiers', () => {
    expect(() => validateTimezone('Invalid/Clinic_Timezone')).toThrow();
  });

  it('rejects a local time that does not exist during a DST transition', () => {
    expect(() =>
      localDateTimeToUtc('2026-03-08', '02:30', 'America/New_York'),
    ).toThrow();
  });
});
