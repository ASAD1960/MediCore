import { Router } from 'express';
import { asyncHandler, ok } from '../../shared/utils/response';
import { getDashboardOverview } from './dashboard.service';
import { overviewQuerySchema } from './dashboard.validation';

export const dashboardRoutes = Router();

dashboardRoutes.get(
  '/overview',
  asyncHandler(async (req, res) => {
    const { from, to } = overviewQuerySchema.parse(req.query);
    const permissions = req.user?.permissions;

    const overview = await getDashboardOverview(
      req.orgId!,
      {
        patients: permissions?.has('patients.view') ?? false,
        doctors: permissions?.has('doctors.view') ?? false,
        appointments: permissions?.has('appointments.view') ?? false,
      },
      { from, to },
    );

    ok(res, overview, 'Dashboard overview retrieved');
  }),
);
