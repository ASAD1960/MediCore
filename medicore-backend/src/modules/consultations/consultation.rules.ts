export type ConsultationWorkflowStatus = 'DRAFT' | 'FINALIZED' | 'AMENDED';

export interface ClinicalContent {
  chiefComplaint?: string | null;
  clinicalNotes?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  diagnoses?: { description: string }[];
}

export function canEditConsultation(status: ConsultationWorkflowStatus): boolean {
  return status === 'DRAFT';
}

export function canFinalizeConsultation(status: ConsultationWorkflowStatus): boolean {
  return status === 'DRAFT';
}

export function hasClinicalContent(content: ClinicalContent): boolean {
  return Boolean(
    content.chiefComplaint?.trim() ||
    content.clinicalNotes?.trim() ||
    content.diagnosis?.trim() ||
    content.treatmentPlan?.trim() ||
    content.diagnoses?.some((item) => item.description.trim()),
  );
}