import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantContext } from '../middleware/tenant-context';
import { appointmentRoutes } from '../modules/appointments/appointment.routes';
import { auditRoutes } from '../modules/audit-logs/audit.routes';
import { authRoutes } from '../modules/auth/auth.routes';
import { dashboardRoutes } from '../modules/dashboard/dashboard.routes';
import { consultationRoutes } from '../modules/consultations/consultation.routes';
import { prescriptionRoutes } from '../modules/prescriptions/prescription.routes';
import { doctorRoutes } from '../modules/doctors/doctor.routes';
import { patientRoutes } from '../modules/patients/patient.routes';
import { billingRoutes } from '../modules/billing/billing.routes';
import { laboratoryRoutes } from '../modules/laboratory/laboratory.routes';

export const router = Router();
router.use('/auth', authRoutes);

// Everything below: authenticate -> resolve tenant -> (per-route) authorize -> validate.
router.use(authenticate, tenantContext);
router.use('/dashboard', dashboardRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/consultations', consultationRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/billing', billingRoutes);
router.use('/laboratory', laboratoryRoutes);
router.use('/audit-logs', auditRoutes);
