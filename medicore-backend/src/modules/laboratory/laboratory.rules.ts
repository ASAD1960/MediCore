import { LabOrderStatus } from '@prisma/client';

export function hasLabTests(items: unknown[]): boolean {
  return items.length > 0;
}

export function canCollectSample(status: LabOrderStatus): boolean {
  return status === 'REQUESTED';
}

export function canStartProcessing(status: LabOrderStatus): boolean {
  return status === 'SAMPLE_COLLECTED';
}

export function canEnterLabResult(
  status: LabOrderStatus,
  alreadyHasResult: boolean,
): boolean {
  return status === 'PROCESSING' && !alreadyHasResult;
}

export function canVerifyLabResult(
  status: LabOrderStatus,
  alreadyVerified: boolean,
): boolean {
  return status === 'RESULT_ENTERED' && !alreadyVerified;
}

export function allLabResultsPresent(totalItems: number, results: number): boolean {
  return totalItems > 0 && totalItems === results;
}

export function allLabResultsVerified(
  totalResults: number,
  verifiedResults: number,
): boolean {
  return totalResults > 0 && totalResults === verifiedResults;
}
