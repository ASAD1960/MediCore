import { z } from 'zod';

export const createPatientSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  dateOfBirth: z.coerce.date().max(new Date(), 'Date of birth cannot be in the future'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().trim().regex(/^[+\d][\d\s-]{6,19}$/, 'Invalid phone number'),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  address: z.string().max(300).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  emergencyContactName: z.string().max(120).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
  confirmDuplicate: z.boolean().optional(),
});
export const updatePatientSchema = createPatientSchema.omit({ confirmDuplicate: true }).partial()
  .extend({ status: z.enum(['ACTIVE', 'INACTIVE']).optional() });

export const listPatientsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});
