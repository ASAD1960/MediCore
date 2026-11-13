import { z } from 'zod';
import { createPatientSchema, updatePatientSchema, listPatientsSchema } from './patient.validation';
export type CreatePatientDto = z.infer<typeof createPatientSchema>;
export type UpdatePatientDto = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsSchema>;
