import { PrescriptionStatus } from '@prisma/client';

export function canEditPrescription(status: PrescriptionStatus | string) {
  return status === 'DRAFT';
}

export function canIssuePrescription(status: PrescriptionStatus | string) {
  return status === 'DRAFT';
}

export function hasPrescriptionItems(items: unknown[]) {
  return Array.isArray(items) && items.length > 0;
}
