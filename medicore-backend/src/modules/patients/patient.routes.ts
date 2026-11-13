import { Router } from 'express';
import { authorize } from '../../middleware/authorize';
import { validate } from '../../middleware/validate';
import { asyncHandler } from '../../shared/utils/response';
import { patientController as c } from './patient.controller';
import { createPatientSchema, listPatientsSchema, updatePatientSchema } from './patient.validation';

export const patientRoutes = Router();
patientRoutes.get('/', authorize('patients.view'), validate(listPatientsSchema, 'query'), asyncHandler(c.list));
patientRoutes.post('/', authorize('patients.create'), validate(createPatientSchema), asyncHandler(c.create));
patientRoutes.get('/:id', authorize('patients.view'), asyncHandler(c.get));
patientRoutes.patch('/:id', authorize('patients.update'), validate(updatePatientSchema), asyncHandler(c.update));
