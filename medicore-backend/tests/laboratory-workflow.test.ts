import { describe, expect, it } from 'vitest';
import {
  allLabResultsPresent,
  allLabResultsVerified,
  canCollectSample,
  canEnterLabResult,
  canStartProcessing,
  canVerifyLabResult,
  hasLabTests,
} from '../src/modules/laboratory/laboratory.rules';

describe('laboratory workflow rules', () => {
  it('requires at least one test', () => {
    expect(hasLabTests([])).toBe(false);
    expect(hasLabTests(['test-1'])).toBe(true);
  });

  it('allows sample collection only for requested orders', () => {
    expect(canCollectSample('REQUESTED')).toBe(true);
    expect(canCollectSample('SAMPLE_COLLECTED')).toBe(false);
    expect(canCollectSample('PROCESSING')).toBe(false);
    expect(canCollectSample('CANCELLED')).toBe(false);
  });

  it('allows processing only after sample collection', () => {
    expect(canStartProcessing('SAMPLE_COLLECTED')).toBe(true);
    expect(canStartProcessing('REQUESTED')).toBe(false);
    expect(canStartProcessing('PROCESSING')).toBe(false);
  });

  it('allows one result per item while the order is processing', () => {
    expect(canEnterLabResult('PROCESSING', false)).toBe(true);
    expect(canEnterLabResult('PROCESSING', true)).toBe(false);
    expect(canEnterLabResult('REQUESTED', false)).toBe(false);
    expect(canEnterLabResult('RESULT_ENTERED', false)).toBe(false);
  });

  it('requires a result-entered order before verification', () => {
    expect(canVerifyLabResult('RESULT_ENTERED', false)).toBe(true);
    expect(canVerifyLabResult('RESULT_ENTERED', true)).toBe(false);
    expect(canVerifyLabResult('PROCESSING', false)).toBe(false);
    expect(canVerifyLabResult('VERIFIED', false)).toBe(false);
  });

  it('marks results complete only when every item has a result', () => {
    expect(allLabResultsPresent(2, 2)).toBe(true);
    expect(allLabResultsPresent(2, 1)).toBe(false);
    expect(allLabResultsPresent(0, 0)).toBe(false);
  });

  it('marks an order verified only when every result is verified', () => {
    expect(allLabResultsVerified(2, 2)).toBe(true);
    expect(allLabResultsVerified(2, 1)).toBe(false);
    expect(allLabResultsVerified(0, 0)).toBe(false);
  });
});
