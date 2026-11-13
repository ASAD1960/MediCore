import { prisma } from '../../config/database';

const PENDING_STATUSES = [
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'WAITING',
] as const;

interface DashboardPermissions {
  patients: boolean;
  doctors: boolean;
  appointments: boolean;
}

interface DashboardDateRange {
  from: Date;
  to: Date;
}

export async function getDashboardOverview(
  organizationId: string,
  permissions: DashboardPermissions,
  range: DashboardDateRange,
) {
  const [
    totalPatients,
    activeDoctors,
    todayAppointments,
    pendingAppointments,
    completedAppointments,
    recentAppointments,
  ] = await Promise.all([
    permissions.patients
      ? prisma.patient.count({
          where: { organizationId },
        })
      : Promise.resolve(null),

    permissions.doctors
      ? prisma.doctor.count({
          where: {
            organizationId,
            status: 'ACTIVE',
          },
        })
      : Promise.resolve(null),

    permissions.appointments
      ? prisma.appointment.count({
          where: {
            organizationId,
            startTime: {
              gte: range.from,
              lt: range.to,
            },
          },
        })
      : Promise.resolve(null),

    permissions.appointments
      ? prisma.appointment.count({
          where: {
            organizationId,
            startTime: {
              gte: range.from,
              lt: range.to,
            },
            status: { in: [...PENDING_STATUSES] },
          },
        })
      : Promise.resolve(null),

    permissions.appointments
      ? prisma.appointment.count({
          where: {
            organizationId,
            startTime: {
              gte: range.from,
              lt: range.to,
            },
            status: 'COMPLETED',
          },
        })
      : Promise.resolve(null),

    permissions.appointments
      ? prisma.appointment.findMany({
          where: {
            organizationId,
            startTime: {
              gte: range.from,
              lt: range.to,
            },
          },
          orderBy: { startTime: 'asc' },
          take: 6,
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            patient: {
              select: {
                firstName: true,
                lastName: true,
                patientNumber: true,
              },
            },
            doctor: {
              select: {
                specialization: true,
                user: {
                  select: { name: true },
                },
              },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    patients:
      totalPatients === null ? null : { total: totalPatients },

    doctors:
      activeDoctors === null ? null : { active: activeDoctors },

    appointments:
      todayAppointments === null
        ? null
        : {
            today: todayAppointments,
            pending: pendingAppointments,
            completed: completedAppointments,
            schedule: recentAppointments,
          },
  };
}
