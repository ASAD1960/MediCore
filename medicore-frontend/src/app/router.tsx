import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/stores/auth';

const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const PatientsPage = lazy(() => import('@/features/patients/PatientsPage'));
const AppointmentsPage = lazy(() => import('@/features/appointments/AppointmentsPage'));
const DoctorsPage = lazy(() => import('@/features/doctors/DoctorsPage'));
const ConsultationsPage = lazy(() => import('@/features/consultations/ConsultationsPage'));
const PrescriptionsPage = lazy(() => import('@/features/prescriptions/PrescriptionsPage'));
const BillingPage = lazy(() => import('@/features/billing/BillingPage'));
const AuditLogsPage = lazy(() => import('@/features/audit-logs/AuditLogsPage'));
const LaboratoryPage = lazy(() => import('@/features/laboratory/LaboratoryPage'));

function PageLoader() {
  return (
    <div
      className="flex min-h-[220px] items-center justify-center p-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
        <span className="h-2 w-2 animate-pulse rounded-full bg-teal-600" />
        Loading workspace...
      </div>
    </div>
  );
}

function Page({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function Protected() {
  const { me, loading } = useAuth();

  if (loading) return <PageLoader />;

  return me ? <Outlet /> : <Navigate to="/login" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Page>
        <LoginPage />
      </Page>
    ),
  },
  {
    element: <Protected />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          {
            path: '/dashboard',
            element: (
              <Page>
                <DashboardPage />
              </Page>
            ),
          },
          {
            path: '/patients',
            element: (
              <Page>
                <PatientsPage />
              </Page>
            ),
          },
          {
            path: '/appointments',
            element: (
              <Page>
                <AppointmentsPage />
              </Page>
            ),
          },
          {
            path: '/doctors',
            element: (
              <Page>
                <DoctorsPage />
              </Page>
            ),
          },
          {
            path: '/consultations',
            element: (
              <Page>
                <ConsultationsPage />
              </Page>
            ),
          },
          {
            path: '/billing',
            element: (
              <Page>
                <BillingPage />
              </Page>
            ),
          },
          {
            path: '/prescriptions',
            element: (
              <Page>
                <PrescriptionsPage />
              </Page>
            ),
          },
          {
            path: '/laboratory',
            element: (
              <Page>
                <LaboratoryPage />
              </Page>
            ),
          },
          {
            path: '/audit-logs',
            element: (
              <Page>
                <AuditLogsPage />
              </Page>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);
