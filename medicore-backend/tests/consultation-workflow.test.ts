import { describe, expect, it } from 'vitest';
import {
  canEditConsultation,
  canFinalizeConsultation,
  hasClinicalContent,
} from '../src/modules/consultations/consultation.rules';

describe('consultation workflow rules', () => {
  it('allows editing a draft', () => {
    expect(canEditConsultation('DRAFT')).toBe(true);
  });

  it('prevents editing finalized consultations', () => {
    expect(canEditConsultation('FINALIZED')).toBe(false);
  });

  it('prevents editing amended consultations through the draft endpoint', () => {
    expect(canEditConsultation('AMENDED')).toBe(false);
  });

  it('allows finalization only from draft', () => {
    expect(canFinalizeConsultation('DRAFT')).toBe(true);
    expect(canFinalizeConsultation('FINALIZED')).toBe(false);
    expect(canFinalizeConsultation('AMENDED')).toBe(false);
  });

  it('rejects empty clinical documentation', () => {
    expect(hasClinicalContent({})).toBe(false);
    expect(hasClinicalContent({
      chiefComplaint: '   ',
      clinicalNotes: '',
      diagnosis: null,
      treatmentPlan: '',
    })).toBe(false);
  });

  it('accepts a documented clinical field', () => {
    expect(hasClinicalContent({
      chiefComplaint: 'Persistent headache',
    })).toBe(true);
  });

  it('accepts a diagnosis entry as clinical content', () => {
    expect(hasClinicalContent({
      diagnoses: [{ description: 'Migraine' }],
    })).toBe(true);
  });

  it('rejects blank diagnosis entries', () => {
    expect(hasClinicalContent({
      diagnoses: [{ description: '   ' }],
    })).toBe(false);
  });
});