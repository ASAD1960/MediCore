import { describe, expect, it } from 'vitest';
import {
  canEditPrescription,
  canIssuePrescription,
  hasPrescriptionItems,
} from '../src/modules/prescriptions/prescription.rules';

describe('prescription workflow rules', () => {
  it('allows editing drafts only', () => {
    expect(canEditPrescription('DRAFT')).toBe(true);
    expect(canEditPrescription('ISSUED')).toBe(false);
    expect(canEditPrescription('DISPENSED')).toBe(false);
    expect(canEditPrescription('VOIDED')).toBe(false);
  });

  it('allows issuing drafts only', () => {
    expect(canIssuePrescription('DRAFT')).toBe(true);
    expect(canIssuePrescription('ISSUED')).toBe(false);
    expect(canIssuePrescription('DISPENSED')).toBe(false);
    expect(canIssuePrescription('VOIDED')).toBe(false);
  });

  it('requires at least one medicine item', () => {
    expect(hasPrescriptionItems([])).toBe(false);
    expect(hasPrescriptionItems([{ medicineId: 'medicine-1' }])).toBe(true);
  });
});
