import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

interface DashboardAppointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  patient: {
    firstName: string;
    lastName: string;
    patientNumber: string;
  };
  doctor: {
    specialization: string;
    user: {
      name: string;
    };
  };
}

interface DashboardOverview {
  patients: { total: number } | null;
  doctors: { active: number } | null;
  appointments: {
    today: number;
    pending: number;
    completed: number;
    schedule: DashboardAppointment[];
  } | null;
}

type MetricIconName = 'patients' | 'doctors' | 'calendar' | 'check' | 'clock' | 'arrow' | 'activity';

function Icon({
  name,
  size = 20,
}: {
  name: MetricIconName;
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
    case 'patients':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 8v6m-3-3h6" />
        </svg>
      );

    case 'doctors':
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
          <path d="M12 8v8m-4-4h8" />
        </svg>
      );

    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case 'check':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.5 2.5L16 9" />
        </svg>
      );

    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case 'arrow':
      return (
        <svg {...common}>
          <path d="M5 12h14m-6-6 6 6-6 6" />
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

const metricStyles = {
  teal: {
    icon: 'bg-[#eaf5f2] text-[#287d70]',
    accent: 'bg-[#3d9586]',
  },
  blue: {
    icon: 'bg-[#edf2f9] text-[#4e6f9d]',
    accent: 'bg-[#698bb8]',
  },
  violet: {
    icon: 'bg-[#f2eff9] text-[#76649f]',
    accent: 'bg-[#8b79b5]',
  },
  amber: {
    icon: 'bg-[#faf3e8] text-[#a77b37]',
    accent: 'bg-[#c29a58]',
  },
  green: {
    icon: 'bg-[#eaf4ed] text-[#43835b]',
    accent: 'bg-[#5e9a70]',
  },
};

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: MetricIconName;
  tone: keyof typeof metricStyles;
  loading: boolean;
}) {
  const style = metricStyles[tone];

  return (
    <section className="group relative flex min-h-[148px] flex-col justify-between overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_2px_8px_rgba(20,40,50,.025)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(20,40,50,.06)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[.11em] text-slate-500">
          {label}
        </p>

        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.icon}`}>
          <Icon name={icon} size={20} />
        </span>
      </div>

      <div className="mt-5">
        <p
          className="text-[31px] font-bold leading-none tracking-[-.045em] text-[#1b2d38]"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {loading ? (
            <span className="inline-block h-8 w-14 animate-pulse rounded-md bg-slate-100" />
          ) : (
            value
          )}
        </p>

        <p className="mt-2 text-[11px] font-medium text-slate-400">
          {detail}
        </p>
      </div>

      <span className={`absolute bottom-0 left-0 h-[2px] w-0 ${style.accent} transition-all duration-300 group-hover:w-full`} />
    </section>
  );
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    SCHEDULED: 'border-blue-100 bg-blue-50/80 text-blue-700',
    CONFIRMED: 'border-indigo-100 bg-indigo-50/80 text-indigo-700',
    CHECKED_IN: 'border-amber-100 bg-amber-50/80 text-amber-700',
    WAITING: 'border-amber-100 bg-amber-50/80 text-amber-700',
    IN_CONSULTATION: 'border-violet-100 bg-violet-50/80 text-violet-700',
    COMPLETED: 'border-emerald-100 bg-emerald-50/80 text-emerald-700',
    CANCELLED: 'border-red-100 bg-red-50/80 text-red-700',
    NO_SHOW: 'border-slate-200 bg-slate-100 text-slate-600',
  };

  return (
    <span className={`inline-flex whitespace-nowrap rounded-md border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.07em] ${styles[value] ?? 'border-slate-200 bg-slate-100 text-slate-600'}`}>
      {value.replace(/_/g, ' ')}
    </span>
  );
}

// MEDICORE ORGANIZATION TIMEZONE FIX
function getZonedDateTimeParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

function localDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const target = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = target;

  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = getZonedDateTimeParts(new Date(candidate), timeZone);

    const represented = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );

    const difference = target - represented;

    if (difference === 0) break;

    candidate += difference;
  }

  const result = new Date(candidate);
  const actual = getZonedDateTimeParts(result, timeZone);

  if (
    actual.year !== year ||
    actual.month !== month ||
    actual.day !== day ||
    actual.hour !== hour ||
    actual.minute !== minute
  ) {
    throw new Error(
      `Unable to resolve local midnight for ${date} in ${timeZone}`,
    );
  }

  return result;
}

function nextCalendarDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));

  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function getOrganizationDayRange(timeZone: string) {
  const parts = getZonedDateTimeParts(new Date(), timeZone);

  const localDate = [
    parts.year,
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');

  const nextDate = nextCalendarDate(localDate);

  return {
    from: localDateTimeToUtc(localDate, '00:00', timeZone),
    to: localDateTimeToUtc(nextDate, '00:00', timeZone),
  };
}
function formatTime(value: string, timeZone: string) {
  return new Date(value).toLocaleTimeString(undefined, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function SectionHeading({
  eyebrow,
  title,
  detail,
  action,
}: {
  eyebrow?: string;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[9px] font-bold uppercase tracking-[.15em] text-[#43877b]">
            {eyebrow}
          </p>
        )}

        <h2
          className="text-[15px] font-bold tracking-[-.025em] text-[#20323e]"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          {title}
        </h2>

        {detail && (
          <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
        )}
      </div>

      {action}
    </div>
  );
}

function ActivityRow({
  icon,
  tone,
  label,
  detail,
  value,
  loading,
}: {
  icon: MetricIconName;
  tone: 'violet' | 'amber' | 'green';
  label: string;
  detail: string;
  value: number;
  loading: boolean;
}) {
  const styles = {
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${styles[tone]}`}>
          <Icon name={icon} size={18} />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">{detail}</p>
        </div>
      </div>

      <p
        className="text-xl font-bold tabular-nums text-[#243640]"
        style={{ fontFamily: 'Manrope, sans-serif' }}
      >
        {loading ? '—' : value}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { me, can } = useAuth();
  const timeZone = me?.organization?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const canViewPatients = can('patients.view');
  const canViewDoctors = can('doctors.view');
  const canViewAppointments = can('appointments.view');

  const overview = useQuery({
    queryKey: ['dashboard-overview', me?.organization?.id, timeZone],
    enabled: Boolean(me),
    queryFn: async (): Promise<DashboardOverview> => {
      const { from, to } = getOrganizationDayRange(timeZone);

      const response = await api.get<{ data: DashboardOverview }>(
        '/dashboard/overview',
        {
          params: {
            from: from.toISOString(),
            to: to.toISOString(),
          },
        },
      );

      return response.data.data;
    },
  });

  const data = overview.data;
  const appointments = data?.appointments;
  const schedule = appointments?.schedule ?? [];

  const hasVisibleMetrics =
    canViewPatients || canViewDoctors || canViewAppointments;

  const firstName = me?.name?.trim().split(/\s+/)[0] ?? 'there';

  const today = new Date().toLocaleDateString(undefined, {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const metrics = [
    canViewPatients && {
      label: 'Registered patients',
      value: data?.patients?.total ?? 0,
      detail: 'Total patient records',
      icon: 'patients' as const,
      tone: 'teal' as const,
    },
    canViewDoctors && {
      label: 'Active doctors',
      value: data?.doctors?.active ?? 0,
      detail: 'Active clinical staff',
      icon: 'doctors' as const,
      tone: 'blue' as const,
    },
    canViewAppointments && {
      label: "Today's appointments",
      value: appointments?.today ?? 0,
      detail: 'Scheduled for today',
      icon: 'calendar' as const,
      tone: 'violet' as const,
    },
    canViewAppointments && {
      label: 'Awaiting completion',
      value: appointments?.pending ?? 0,
      detail: 'Pending appointments',
      icon: 'clock' as const,
      tone: 'amber' as const,
    },
    canViewAppointments && {
      label: 'Completed today',
      value: appointments?.completed ?? 0,
      detail: 'Marked as completed',
      icon: 'check' as const,
      tone: 'green' as const,
    },
  ].filter(Boolean) as {
    label: string;
    value: number;
    detail: string;
    icon: MetricIconName;
    tone: keyof typeof metricStyles;
  }[];

  return (
    <div className="space-y-7">
      <section className="relative isolate overflow-hidden rounded-2xl border border-[#264653] bg-[#183744] shadow-[0_12px_32px_rgba(20,47,58,.10)]">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
          <div className="absolute -right-24 -top-36 h-80 w-80 rounded-full border border-teal-100/20" />
          <div className="absolute -right-12 -top-24 h-56 w-56 rounded-full border border-teal-100/15" />
          <div className="absolute -bottom-40 right-1/3 h-72 w-72 rounded-full border border-teal-100/10" />
        </div>

        <div className="relative flex flex-col justify-between gap-7 px-6 py-7 sm:px-8 sm:py-8 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal-200/20 bg-teal-200/[.08] px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7bd1b5]" />
              <span className="text-[9px] font-bold uppercase tracking-[.16em] text-teal-100">
                Healthcare operations
              </span>
            </div>

            <p className="text-xs font-medium text-[#b4c7ca]">
              {me?.organization?.name ?? 'MediCore workspace'}
            </p>

            <h1
              className="mt-2 text-[26px] font-bold leading-tight tracking-[-.04em] text-white sm:text-[32px]"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Good day, {firstName}.
            </h1>

            <p className="mt-3 max-w-xl text-[13px] leading-6 text-[#c1d0d1]">
              Your clinic overview, appointment activity, and essential operational records — together in one workspace.
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {can('appointments.create') && (
              <Link
                to="/appointments"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#4caa94] px-4 py-2.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-[#5bbba3]"
              >
                <span className="text-base leading-none">+</span>
                New appointment
              </Link>
            )}

            {can('patients.create') && (
              <Link
                to="/patients"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-white/20 bg-white/[.07] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-white/[.13]"
              >
                Register patient
              </Link>
            )}
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 bg-black/[.07] px-6 py-3.5 sm:px-8">
          <span className="inline-flex items-center gap-2 text-[11px] font-medium text-[#d0dddd]">
            <Icon name="calendar" size={15} />
            {today}
          </span>

          <span className="hidden h-4 w-px bg-white/20 sm:block" />

          <span className="inline-flex items-center gap-2 text-[10px] text-[#b4c7ca]">
            <Icon name="activity" size={14} />
            Organization workspace
          </span>
        </div>
      </section>

      {overview.isError && (
        <div
          role="alert"
          className="flex flex-col justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center"
        >
          <div>
            <p className="text-sm font-bold text-red-800">
              Dashboard data could not be loaded
            </p>
            <p className="mt-1 text-sm text-red-700">
              {errorMessage(overview.error)}
            </p>
          </div>

          <button
            type="button"
            className="btn-ghost border-red-200 text-red-700 hover:bg-red-100"
            onClick={() => void overview.refetch()}
            disabled={overview.isFetching}
          >
            {overview.isFetching ? 'Retrying...' : 'Retry'}
          </button>
        </div>
      )}

      {!hasVisibleMetrics && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-600">
            Your account does not currently have permission to view dashboard statistics.
          </p>
        </section>
      )}

      {hasVisibleMetrics && (
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#43877b]">
                At a glance
              </p>

              <h2
                className="mt-1 text-[19px] font-bold tracking-[-.035em] text-[#20323e]"
                style={{ fontFamily: 'Manrope, sans-serif' }}
              >
                Operational summary
              </h2>

              <p className="mt-1 text-[11px] text-slate-400">
                Key figures from your organization
              </p>
            </div>

            <p className="text-[10px] font-medium text-slate-400">
              {overview.isFetching
                ? 'Updating information...'
                : 'Latest available information'}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                {...metric}
                loading={overview.isLoading}
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.75fr)_minmax(270px,.8fr)]">
        {canViewAppointments && (
          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(20,40,50,.025)]">
            <SectionHeading
              eyebrow="Daily schedule"
              title="Today's appointments"
              detail="A view of the appointments scheduled for your clinic."
              action={
                <Link
                  to="/appointments"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#397f73] transition hover:text-[#245d54]"
                >
                  View schedule
                  <Icon name="arrow" size={14} />
                </Link>
              }
            />

            {overview.isLoading ? (
              <div className="space-y-5 p-5">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex animate-pulse items-center gap-4">
                    <div className="h-9 w-14 rounded-md bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 rounded bg-slate-100" />
                      <div className="h-2.5 w-1/4 rounded bg-slate-100" />
                    </div>
                    <div className="h-6 w-20 rounded-md bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : overview.isError ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-semibold text-slate-600">
                  Schedule information is unavailable.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Please retry loading the dashboard.
                </p>
              </div>
            ) : schedule.length === 0 ? (
              <div className="px-5 py-14 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#eff6f4] text-[#5d9186]">
                  <Icon name="calendar" size={21} />
                </div>

                <p className="mt-4 text-sm font-bold text-[#263943]">
                  No appointments in today's schedule
                </p>

                <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-400">
                  Appointments will appear here when they are scheduled for this clinic.
                </p>

                {can('appointments.create') && (
                  <Link
                    to="/appointments"
                    className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#397f73] hover:text-[#245d54]"
                  >
                    Create an appointment
                    <Icon name="arrow" size={13} />
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 bg-[#fafcfb] px-5 py-3">
                  <span className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-500">
                    Scheduled patients
                  </span>

                  <span className="rounded-md border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] font-bold tabular-nums text-slate-600">
                    {schedule.length} shown
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-left">
                    <thead className="border-b border-slate-100 bg-white">
                      <tr className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">
                        <th className="px-5 py-3.5">Time</th>
                        <th className="px-5 py-3.5">Patient</th>
                        <th className="px-5 py-3.5">Doctor</th>
                        <th className="px-5 py-3.5">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {schedule.map((appointment) => {
                        const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`;

                        return (
                          <tr
                            key={appointment.id}
                            className="transition-colors hover:bg-[#f8fbfa]"
                          >
                            <td className="whitespace-nowrap px-5 py-4 align-middle">
                              <p className="text-[11px] font-bold tabular-nums text-[#263943]">
                                {formatTime(appointment.startTime, timeZone)}
                              </p>

                              <p className="mt-1 text-[10px] tabular-nums text-slate-400">
                                to {formatTime(appointment.endTime, timeZone)}
                              </p>
                            </td>

                            <td className="px-5 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#dcebe6] bg-[#eff6f3] text-[10px] font-bold text-[#387669]">
                                  {initials(patientName)}
                                </span>

                                <div className="min-w-0">
                                  <p className="truncate text-[11px] font-bold text-[#293c46]">
                                    {patientName}
                                  </p>
                                  <p className="mt-1 text-[9px] font-medium text-slate-400">
                                    {appointment.patient.patientNumber}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 align-middle">
                              <p className="text-[11px] font-semibold text-slate-700">
                                {appointment.doctor.user.name}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {appointment.doctor.specialization}
                              </p>
                            </td>

                            <td className="px-5 py-4 align-middle">
                              <StatusBadge value={appointment.status} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-[#fafcfb] px-5 py-3">
              <span className="text-[9px] text-slate-400">
                Information is subject to your assigned access permissions.
              </span>

              <Link
                to="/appointments"
                className="text-[10px] font-bold text-slate-600 transition hover:text-[#397f73]"
              >
                Open appointment workspace →
              </Link>
            </div>
          </section>
        )}

        {canViewAppointments && (
          <aside className="space-y-5">
            <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(20,40,50,.025)]">
              <SectionHeading
                eyebrow="Appointment activity"
                title="Today's activity"
                detail="Current appointment summary."
              />

              <div className="space-y-4 p-5">
                <ActivityRow
                  icon="calendar"
                  tone="violet"
                  label="Scheduled"
                  detail="Appointments today"
                  value={appointments?.today ?? 0}
                  loading={overview.isLoading}
                />

                <div className="h-px bg-slate-100" />

                <ActivityRow
                  icon="clock"
                  tone="amber"
                  label="Pending"
                  detail="Awaiting completion"
                  value={appointments?.pending ?? 0}
                  loading={overview.isLoading}
                />

                <div className="h-px bg-slate-100" />

                <ActivityRow
                  icon="check"
                  tone="green"
                  label="Completed"
                  detail="Completed today"
                  value={appointments?.completed ?? 0}
                  loading={overview.isLoading}
                />
              </div>
            </section>

            <section className="relative overflow-hidden rounded-xl border border-[#d9e9e3] bg-[#f0f7f4] p-5">
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full border-[15px] border-[#dcece5]/70" />

              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#488577] shadow-sm">
                  <Icon name="activity" size={18} />
                </div>

                <p className="mt-4 text-[9px] font-bold uppercase tracking-[.14em] text-[#52877a]">
                  Workspace guidance
                </p>

                <h3
                  className="mt-2 text-[14px] font-bold tracking-[-.02em] text-[#253d3a]"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Keep clinic records up to date
                </h3>

                <p className="mt-2 text-[11px] leading-5 text-[#617b74]">
                  Use the patient and appointment workspaces to maintain accurate registration and scheduling records.
                </p>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                  {canViewPatients && (
                    <Link
                      to="/patients"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#39796d] transition hover:text-[#24564e]"
                    >
                      Patient records
                      <Icon name="arrow" size={12} />
                    </Link>
                  )}

                  {canViewAppointments && (
                    <Link
                      to="/appointments"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[#39796d] transition hover:text-[#24564e]"
                    >
                      Appointments
                      <Icon name="arrow" size={12} />
                    </Link>
                  )}
                </div>
              </div>
            </section>
          </aside>
        )}
      </div>

      <footer className="flex flex-col justify-between gap-2 border-t border-slate-200/80 pt-4 text-[9px] font-medium text-slate-400 sm:flex-row">
        <span>MediCore · Hospital and Clinic Management System</span>
        <span>
          Operational information is displayed according to your account permissions.
        </span>
      </footer>
    </div>
  );
}