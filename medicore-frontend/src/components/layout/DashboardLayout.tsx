import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/stores/auth';

type IconName =
  | 'dashboard'
  | 'patients'
  | 'appointments'
  | 'doctors'
  | 'consultations'
  | 'prescriptions'
  | 'billing'
  | 'laboratory'
  | 'menu'
  | 'close'
  | 'logout'
  | 'chevron'
  | 'building'
  | 'shield'
  | 'activity';

function Icon({
  name,
  size = 18,
}: {
  name: IconName;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );

    case 'patients':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 8v6m-3-3h6" />
        </svg>
      );

    case 'appointments':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
          <path d="M8 14h3m-3 3h7" />
        </svg>
      );

    case 'consultations':
      return (
        <svg {...common}>
          <path d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'doctors':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 8v6m-3-3h6" />
        </svg>
      );

    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );

    case 'close':
      return (
        <svg {...common}>
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      );

    case 'logout':
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5m5 5H3" />
          <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
        </svg>
      );

    case 'chevron':
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case 'building':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M9 21v-4h6v4M9 7h.01M15 7h.01M9 11h.01M15 11h.01" />
        </svg>
      );

    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case 'billing':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 10h18" />
          <path d="M7 15h3M16 15h1" />
        </svg>
      );

    case 'prescriptions':
      return (
        <svg {...common}>
          <path d="M8 3h6l5 5v13H5V3h3Z" />
          <path d="M14 3v5h5M8 13h8M8 17h5" />
          <path d="M11 10v6M8 13h6" />
        </svg>
      );
    case 'laboratory':
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 22h11.6a2 2 0 0 0 1.7-3.5L14 9V3" />
          <path d="M8 15h8M10 18h4" />
        </svg>
      );
    case 'activity':
      return (
        <svg {...common}>
          <path d="M3 12h4l3-8 4 16 3-8h4" />
        </svg>
      );
  }
}

const NAV = [
  {
    section: 'Workspace',
    items: [
      {
        to: '/dashboard',
        label: 'Overview',
        icon: 'dashboard' as const,
        perm: null,
      },
    ],
  },
{
    section: 'Clinical operations',
    items: [
      {
        to: '/patients',
        label: 'Patients',
        icon: 'patients' as const,
        perm: 'patients.view',
      },
{
        to: '/appointments',
        label: 'Appointments',
        icon: 'appointments' as const,
        perm: 'appointments.view',
      },
{
        to: '/doctors',
        label: 'Doctors',
        icon: 'doctors' as const,
        perm: 'doctors.view',
      },
{
        to: '/consultations',
        label: 'Consultations',
        icon: 'consultations' as const,
        perm: 'consultations.view',
      },
{
        to: '/prescriptions',
        label: 'Prescriptions',
        icon: 'prescriptions' as const,
        perm: 'prescriptions.view',
      },
{
        to: '/billing',
        label: 'Billing',
        icon: 'billing' as const,
        perm: 'billing.view',
      },
      {
        to: '/laboratory',
        label: 'Laboratory',
        icon: 'laboratory' as const,
        perm: 'lab.orders.view',
      },
    ],
  },

  {
    section: 'Administration',
    items: [
      {
        to: '/audit-logs',
        label: 'Audit Logs',
        icon: 'activity' as const,
        perm: 'audit.view',
      },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/patients': 'Patient management',
  '/appointments': 'Appointments',
  '/doctors': 'Doctor management',
  '/consultations': 'Consultation management',
  '/prescriptions': 'Prescription management',
  '/billing': 'Billing management',
  '/laboratory': 'Laboratory management',
  '/audit-logs': 'Audit trail',
};

export default function DashboardLayout() {
  const { me, logout, can } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const pageTitle = PAGE_TITLES[location.pathname] ?? 'Workspace';

  const initials = (me?.name ?? 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const organizationName = me?.organization?.name ?? 'MediCore';

  const closeMobileNavigation = () => setMobileOpen(false);

  return (
    <div className="app-shell flex min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="sidebar-backdrop lg:hidden"
          onClick={closeMobileNavigation}
        />
      )}

      <aside
        id="primary-sidebar"
        aria-label="Workspace navigation"
        className={`app-sidebar flex flex-col ${mobileOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-brand flex h-[76px] shrink-0 items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="brand-mark">
              <svg
                width="21"
                height="21"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 4v16M4 12h16" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>

            <div className="min-w-0">
              <p
                className="font-bold tracking-tight text-white"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                MediCore
              </p>
              <p className="mt-0.5 text-[9px] font-semibold tracking-[.18em] text-slate-400">
                HEALTHCARE PLATFORM
              </p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 lg:hidden"
            onClick={closeMobileNavigation}
            aria-label="Close menu"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="mx-3 mt-4 rounded-xl border border-white/[.09] bg-white/[.045] p-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[.09] text-teal-200">
              <Icon name="building" size={15} />
            </span>
            <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-slate-400">
              Organization
            </p>
          </div>

          <p className="mt-3 truncate text-[13px] font-semibold text-white">
            {organizationName}
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              Workspace active
            </span>
          </div>
        </div>

        <nav
          className="flex-1 space-y-7 overflow-y-auto px-3 py-7"
          aria-label="Main navigation"
        >
          {NAV.map((group) => {
            const items = group.items.filter(
              (item) => !item.perm || can(item.perm),
            );

            if (items.length === 0) return null;

            return (
              <div key={group.section}>
                <p className="sidebar-section-label mb-2.5 px-3">
                  {group.section}
                </p>

                <div className="space-y-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      onClick={closeMobileNavigation}
                      className={({ isActive }) =>
                        `sidebar-link group ${isActive ? 'active' : ''}`
                      }
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors">
                        <Icon name={item.icon} size={18} />
                      </span>

                      <span className="flex-1">{item.label}</span>

                      <span className="ml-auto opacity-50 transition-transform group-hover:translate-x-0.5">
                        <Icon name="chevron" size={14} />
                      </span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/[.08] px-4 py-4">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300">
              <Icon name="shield" size={16} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-slate-300">
                Secure workspace
              </p>
              <p className="mt-0.5 text-[9px] text-slate-500">
                MediCore platform
              </p>
            </div>
          </div>

          <p className="mt-3 px-2 text-[9px] tracking-wide text-slate-500">
            WORKSPACE EDITION <span className="px-1">Ãƒâ€šÃ‚Â·</span> VERSION 1.0
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="workspace-header sticky top-0 z-30 flex h-[76px] shrink-0 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              aria-controls="primary-sidebar"
              aria-expanded={mobileOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Icon name="menu" size={19} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-medium text-slate-400">
                <span className="hidden sm:inline">MediCore</span>
                <span className="hidden sm:inline text-slate-300">
                  <Icon name="chevron" size={11} />
                </span>
                <span className="truncate font-semibold text-slate-500">
                  {pageTitle}
                </span>
              </div>

              <p
                className="mt-0.5 truncate text-[15px] font-bold tracking-[-.025em] text-slate-900"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                {pageTitle}
              </p>
            </div>
          </div>

          <div className="ml-3 flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/70 px-3 py-1.5 lg:flex">
              <Icon name="activity" size={13} />
              <span className="text-[10px] font-semibold text-emerald-700">
                Workspace
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </div>

            <span className="hidden h-8 w-px bg-slate-200 sm:block" />

            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-[180px] truncate text-xs font-bold text-slate-800">
                {me?.name ?? 'User'}
              </p>
              <p className="mt-0.5 max-w-[180px] truncate text-[10px] text-slate-500">
                {me?.email ?? ''}
              </p>
            </div>

            <div
              className="avatar flex shrink-0 items-center justify-center"
              title={me?.name ?? 'User'}
              aria-label={`Signed in as ${me?.name ?? 'User'}`}
            >
              {initials || 'U'}
            </div>

            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-transparent px-2.5 text-xs font-semibold text-slate-500 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"
              onClick={() => void logout()}
              title="Sign out"
            >
              <Icon name="logout" size={16} />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1">
          <div className="workspace-content">
            <Outlet />
          </div>
        </main>

        <footer className="hidden border-t border-slate-200/70 bg-white/60 px-8 py-3 lg:block">
          <div className="mx-auto flex max-w-[1600px] items-center justify-between">
            <p className="text-[10px] text-slate-400">
              MediCore <span className="px-1">Ãƒâ€šÃ‚Â·</span> Healthcare management
            </p>
            <p className="text-[10px] font-medium text-slate-400">
              Secure organization workspace
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
