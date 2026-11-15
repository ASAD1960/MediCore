import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'WAITING'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

interface Slot {
  start: string;
  end: string;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  patientNumber: string;
}

interface Doctor {
  id: string;
  user: { name: string };
  specialization: string;
  department?: { name: string } | null;
}

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  appointmentType: string;
  patient: Patient;
  doctor: Doctor;
}

interface AppointmentResponse {
  data: Appointment[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
  };
}

const PAGE_SIZE = 20;

const statuses = [
  { value: '', label: 'All statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CHECKED_IN', label: 'Checked in' },
  { value: 'WAITING', label: 'Waiting' },
  { value: 'IN_CONSULTATION', label: 'In consultation' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No show' },
];

function localParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
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

function clinicToday(timezone: string) {
  const parts = localParts(new Date(), timezone);

  return [
    parts.year,
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

function nextDate(date: string, amount: number) {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));

  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function localDateTimeToUtc(
  date: string,
  time: string,
  timezone: string,
) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const target = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = target;

  for (let i = 0; i < 4; i++) {
    const p = localParts(new Date(candidate), timezone);

    const represented = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second,
    );

    const difference = target - represented;

    if (difference === 0) break;

    candidate += difference;
  }

  const result = new Date(candidate);
  const actual = localParts(result, timezone);

  if (
    actual.year !== year ||
    actual.month !== month ||
    actual.day !== day ||
    actual.hour !== hour ||
    actual.minute !== minute
  ) {
    throw new Error(
      'This local time is not valid in the clinic timezone.',
    );
  }

  return result;
}

function clinicDayRange(date: string, timezone: string) {
  const start = localDateTimeToUtc(date, '00:00', timezone);
  const end = localDateTimeToUtc(
    nextDate(date, 1),
    '00:00',
    timezone,
  );

  return {
    from: start.toISOString(),
    to: new Date(end.getTime() - 1).toISOString(),
  };
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(value));
}

function formatDateLabel(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function formatDuration(start: string, end: string) {
  return Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
}

function initials(first: string, last: string) {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}

function StatusBadge({
  status,
}: {
  status: AppointmentStatus;
}) {
  const styles: Record<AppointmentStatus, string> = {
    SCHEDULED: 'border-blue-100 bg-blue-50 text-blue-700',
    CONFIRMED: 'border-indigo-100 bg-indigo-50 text-indigo-700',
    CHECKED_IN: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    WAITING: 'border-amber-100 bg-amber-50 text-amber-700',
    IN_CONSULTATION: 'border-violet-100 bg-violet-50 text-violet-700',
    COMPLETED: 'border-green-100 bg-green-50 text-green-700',
    CANCELLED: 'border-slate-200 bg-slate-100 text-slate-500',
    NO_SHOW: 'border-red-100 bg-red-50 text-red-700',
  };

  return (
    <span
      className={`mc-status-badge inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function Icon({
  name,
  size = 18,
}: {
  name:
    | 'calendar'
    | 'plus'
    | 'search'
    | 'refresh'
    | 'left'
    | 'right'
    | 'close'
    | 'clock'
    | 'user'
    | 'check';
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (name) {
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );

    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
      );

    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" />
        </svg>
      );

    case 'left':
      return (
        <svg {...common}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );

    case 'right':
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case 'close':
      return (
        <svg {...common}>
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      );

    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );

    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
  }
}

export default function AppointmentsPage() {
  const { me, can } = useAuth();
  const qc = useQueryClient();

  const timezone = me?.organization?.timezone || 'UTC';

  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [search, setSearch] = useState('');

  const [showBooking, setShowBooking] = useState(false);
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!date) {
      setDate(clinicToday(timezone));
    }
  }, [date, timezone]);

  const range = useMemo(
    () => (date ? clinicDayRange(date, timezone) : null),
    [date, timezone],
  );

  const appointments = useQuery({
    queryKey: [
      'appointments',
      me?.organization?.id,
      date,
      page,
      status,
      doctorFilter,
    ],
    enabled: Boolean(range && me?.organization?.id),
    queryFn: async (): Promise<AppointmentResponse> => {
      const response = await api.get('/appointments', {
        params: {
          page,
          limit: PAGE_SIZE,
          from: range!.from,
          to: range!.to,
          status: status || undefined,
          doctorId: doctorFilter || undefined,
        },
      });

      return response.data;
    },
    placeholderData: (previous) => previous,
  });

  const doctors = useQuery({
    queryKey: ['doctors', me?.organization?.id],
    enabled: Boolean(me?.organization?.id),
    queryFn: async (): Promise<Doctor[]> =>
      (await api.get('/doctors')).data.data,
  });

  const patients = useQuery({
    queryKey: ['patients-lookup', me?.organization?.id],
    enabled: showBooking && Boolean(me?.organization?.id),
    queryFn: async (): Promise<Patient[]> =>
      (
        await api.get('/patients', {
          params: { limit: 100, status: 'ACTIVE' },
        })
      ).data.data,
  });

  const availability = useQuery({
    queryKey: [
      'appointment-availability',
      me?.organization?.id,
      doctorId,
      bookingDate,
    ],
    enabled: showBooking && Boolean(doctorId && bookingDate),
    queryFn: async (): Promise<Slot[]> =>
      (
        await api.get('/appointments/availability', {
          params: { doctorId, date: bookingDate },
        })
      ).data.data,
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!patientId || !doctorId || !bookingDate || !selectedSlot) {
        throw new Error(
          'Select a patient, doctor, date and available time slot.',
        );
      }

      const durationMinutes = formatDuration(
        selectedSlot.start,
        selectedSlot.end,
      );

      return api.post('/appointments', {
        patientId,
        doctorId,
        startTime: selectedSlot.start,
        durationMinutes,
        reason: reason.trim() || undefined,
        appointmentType: 'CONSULTATION',
      });
    },

    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['appointments'] });

      setShowBooking(false);
      setPatientId('');
      setDoctorId('');
      setSelectedSlot(null);
      setReason('');
      setBookingError('');
      setActionError('');
      setActionMessage('Appointment successfully booked.');
      setPage(1);
    },

    onError: (error: unknown) => {
      setBookingError(errorMessage(error));
    },
  });

  const action = useMutation({
    mutationFn: async ({
      id,
      type,
    }: {
      id: string;
      type: 'cancel' | 'check-in';
    }) => api.post(`/appointments/${id}/${type}`),

    onSuccess: async (_, variables) => {
      await qc.invalidateQueries({ queryKey: ['appointments'] });

      setActionError('');
      setActionMessage(
        variables.type === 'cancel'
          ? 'Appointment cancelled successfully.'
          : 'Patient checked in successfully.',
      );
    },

    onError: (error: unknown) => {
      setActionMessage('');
      setActionError(errorMessage(error));
    },
  });

  const rows = appointments.data?.data ?? [];
  const pagination = appointments.data?.pagination;
  const total = pagination?.total ?? 0;

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return rows;

    return rows.filter((appointment) =>
      [
        appointment.patient.firstName,
        appointment.patient.lastName,
        appointment.patient.patientNumber,
        appointment.doctor.user.name,
        appointment.doctor.specialization,
      ].some((value) => value.toLowerCase().includes(term)),
    );
  }, [rows, search]);

  // These statistics represent the currently loaded page only.
  const pageStats = useMemo(
    () => ({
      scheduled: rows.filter((a) =>
        ['SCHEDULED', 'CONFIRMED'].includes(a.status),
      ).length,

      checkedIn: rows.filter((a) =>
        ['CHECKED_IN', 'WAITING'].includes(a.status),
      ).length,

      completed: rows.filter((a) => a.status === 'COMPLETED').length,
    }),
    [rows],
  );

  const openBooking = () => {
    setPatientId('');
    setDoctorId('');
    setBookingDate(date || clinicToday(timezone));
    setSelectedSlot(null);
    setReason('');
    setBookingError('');
    setShowBooking(true);
  };

  const changeDate = (amount: number) => {
    setDate((current) =>
      nextDate(current || clinicToday(timezone), amount),
    );

    setPage(1);
    setSearch('');
  };

  const canCancel = (appointment: Appointment) =>
    can('appointments.cancel') &&
    ![
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW',
      'IN_CONSULTATION',
    ].includes(appointment.status);

  // Uses the dedicated backend permission for check-in.
  const canCheckIn = (appointment: Appointment) =>
    can('appointments.check_in') &&
    ['SCHEDULED', 'CONFIRMED'].includes(appointment.status);

  return (
    <div className="appointments-enterprise space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-teal-700">
            Clinical operations / scheduling
          </p>

          <h1
            className="mt-1 text-2xl font-bold tracking-tight text-slate-900"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Appointment management
          </h1>

          <p className="mt-1.5 text-sm text-slate-500">
            Coordinate doctor schedules, patient bookings and arrivals.
          </p>

          <p className="mt-2 text-[11px] font-medium text-slate-400">
            All appointment times use the clinic timezone: {timezone}
          </p>
        </div>

        {can('appointments.create') && (
          <button
            type="button"
            className="btn"
            onClick={openBooking}
          >
            <Icon name="plus" size={17} />
            New appointment
          </button>
        )}
      </header>

      <section className="appointments-overview grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Icon name="calendar" size={21} />
          </span>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Scheduled / confirmed
            </p>

            <p
              className="mt-1 text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {appointments.isLoading ? '—' : pageStats.scheduled}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700">
            <Icon name="clock" size={21} />
          </span>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Checked in / waiting
            </p>

            <p
              className="mt-1 text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {appointments.isLoading ? '—' : pageStats.checkedIn}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
            <Icon name="check" size={21} />
          </span>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Completed
            </p>

            <p
              className="mt-1 text-2xl font-bold text-slate-900"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              {appointments.isLoading ? '—' : pageStats.completed}
            </p>
          </div>
        </div>
      </section>

      <p className="text-[10px] text-slate-400">
        Statistics above represent the currently loaded page ({PAGE_SIZE} records maximum).
      </p>

      {(actionMessage || actionError) && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-lg border p-3 text-sm ${
            actionError
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span>{actionError || actionMessage}</span>

          <button
            type="button"
            onClick={() => {
              setActionMessage('');
              setActionError('');
            }}
            aria-label="Dismiss message"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      <section className="appointments-register overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.13em] text-teal-700">
              Scheduling workspace
            </p>

            <h2
              className="mt-1 text-base font-bold text-slate-900"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              Appointment register
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Review bookings and manage patient arrivals for the selected clinic date.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-ghost px-2.5"
              onClick={() => changeDate(-1)}
              aria-label="Previous day"
            >
              <Icon name="left" size={16} />
            </button>

            <label className="relative">
              <span className="sr-only">Appointment date</span>

              <input
                type="date"
                className="input min-w-[155px]"
                value={date}
                onChange={(event) => {
                  setDate(event.target.value);
                  setPage(1);
                  setSearch('');
                }}
              />
            </label>

            <button
              type="button"
              className="btn-ghost px-2.5"
              onClick={() => changeDate(1)}
              aria-label="Next day"
            >
              <Icon name="right" size={16} />
            </button>

            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => {
                setDate(clinicToday(timezone));
                setPage(1);
                setSearch('');
              }}
            >
              Today
            </button>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-[#f8fafb] px-5 py-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-slate-800">
              {date ? formatDateLabel(date) : 'Loading clinic date'}
            </p>

            <p className="mt-0.5 text-[10px] text-slate-500">
              {total.toLocaleString()} appointment records for this date
            </p>
          </div>

          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={() => void appointments.refetch()}
            disabled={appointments.isFetching}
          >
            <Icon name="refresh" size={15} />
            {appointments.isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-100 p-5 md:grid-cols-3">
          <div className="relative md:col-span-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" size={16} />
            </span>

            <input
              className="input pl-9"
              placeholder="Search this page..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search current appointment page"
            />
          </div>

          <select
            className="input"
            value={doctorFilter}
            onChange={(event) => {
              setDoctorFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by doctor"
          >
            <option value="">All doctors</option>

            {doctors.data?.map((doctor) => (
              <option key={doctor.id} value={doctor.id}>
                {doctor.user.name}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by appointment status"
          >
            {statuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {appointments.isError ? (
          <div className="px-5 py-14 text-center">
            <p className="text-sm font-semibold text-red-700">
              Unable to load appointments
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {errorMessage(appointments.error)}
            </p>

            <button
              type="button"
              className="btn-ghost mt-4"
              onClick={() => void appointments.refetch()}
            >
              Try again
            </button>
          </div>
        ) : appointments.isLoading ? (
          <div className="space-y-4 p-5">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="flex animate-pulse items-center gap-4"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-100" />

                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/3 rounded bg-slate-100" />
                </div>

                <div className="h-6 w-20 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-50 text-slate-400">
              <Icon name="calendar" size={23} />
            </span>

            <h3 className="mt-3 text-sm font-bold text-slate-800">
              {search
                ? 'No matching appointments on this page'
                : 'No appointments for this date'}
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
              {search
                ? 'Try another patient name, patient ID or doctor name.'
                : 'Appointments booked for this clinic date will appear here.'}
            </p>

            {search ? (
              <button
                type="button"
                className="mt-3 text-xs font-bold text-teal-700"
                onClick={() => setSearch('')}
              >
                Clear search
              </button>
            ) : can('appointments.create') ? (
              <button
                type="button"
                className="btn mt-4"
                onClick={openBooking}
              >
                <Icon name="plus" size={16} />
                Create appointment
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-b border-slate-100 bg-slate-50/70">
                  <tr className="text-[10px] font-bold uppercase tracking-[.1em] text-slate-400">
                    <th className="px-5 py-3">Appointment / time</th>
                    <th className="px-5 py-3">Patient</th>
                    <th className="px-5 py-3">Doctor</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="whitespace-nowrap px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#edf6f5] text-teal-800">
                            <Icon name="clock" size={18} />
                          </span>

                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {formatTime(appointment.startTime, timezone)}
                              <span className="mx-1 text-slate-300">–</span>
                              {formatTime(appointment.endTime, timezone)}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-400">
                              {formatDuration(
                                appointment.startTime,
                                appointment.endTime,
                              )}{' '}
                              minutes
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                            {initials(
                              appointment.patient.firstName,
                              appointment.patient.lastName,
                            )}
                          </span>

                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {appointment.patient.firstName}{' '}
                              {appointment.patient.lastName}
                            </p>

                            <p className="mt-1 font-mono text-[10px] text-slate-400">
                              {appointment.patient.patientNumber}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-slate-700">
                          {appointment.doctor.user.name}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {appointment.doctor.specialization}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-xs text-slate-600">
                          {appointment.appointmentType
                            .replaceAll('_', ' ')
                            .toLowerCase()}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={appointment.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {canCheckIn(appointment) && (
                            <button
                              type="button"
                              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                              disabled={action.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Check in ${appointment.patient.firstName} ${appointment.patient.lastName}?`,
                                  )
                                ) {
                                  setActionMessage('');
                                  setActionError('');

                                  action.mutate({
                                    id: appointment.id,
                                    type: 'check-in',
                                  });
                                }
                              }}
                            >
                              Check in
                            </button>
                          )}

                          {canCancel(appointment) && (
                            <button
                              type="button"
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                              disabled={action.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Cancel the appointment for ${appointment.patient.firstName} ${appointment.patient.lastName}?`,
                                  )
                                ) {
                                  setActionMessage('');
                                  setActionError('');

                                  action.mutate({
                                    id: appointment.id,
                                    type: 'cancel',
                                  });
                                }
                              }}
                            >
                              Cancel
                            </button>
                          )}

                          {!canCheckIn(appointment) &&
                            !canCancel(appointment) && (
                              <span className="px-2 py-2 text-[10px] text-slate-300">
                                No actions
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:flex-row sm:items-center">
              <p className="text-[11px] text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {filteredRows.length}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-slate-700">
                  {total}
                </span>{' '}
                appointments
                {search && <span> · Search applies to this page</span>}
              </p>

              <div className="flex items-center gap-2">
                <span className="mr-2 text-[11px] text-slate-500">
                  Page {pagination?.page ?? page} of{' '}
                  {Math.max(1, pagination?.totalPages ?? 1)}
                </span>

                <button
                  type="button"
                  className="btn-ghost px-3 py-2 text-xs"
                  disabled={page <= 1 || appointments.isFetching}
                  onClick={() =>
                    setPage((value) => Math.max(1, value - 1))
                  }
                >
                  Previous
                </button>

                <button
                  type="button"
                  className="btn-ghost px-3 py-2 text-xs"
                  disabled={
                    page >= (pagination?.totalPages ?? 1) ||
                    appointments.isFetching
                  }
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {showBooking && (
        <div
          className="appointments-booking-backdrop fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowBooking(false);
            }
          }}
        >
          <section
            className="appointments-booking-panel flex h-full w-full max-w-xl flex-col overflow-hidden bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Create appointment"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-teal-700">
                  Scheduling / new booking
                </p>

                <h2
                  className="mt-1 text-base font-bold text-slate-900"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  Create appointment
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Select a patient, doctor and available clinic time slot.
                </p>
              </div>

              <button
                type="button"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setShowBooking(false)}
                aria-label="Close booking panel"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  01 / Patient
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Choose the patient for this consultation.
                </p>

                <select
                  className="input mt-3"
                  value={patientId}
                  onChange={(event) => setPatientId(event.target.value)}
                  disabled={patients.isLoading}
                >
                  <option value="">
                    {patients.isLoading
                      ? 'Loading patients...'
                      : 'Select a patient'}
                  </option>

                  {patients.data?.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.patientNumber} · {patient.firstName}{' '}
                      {patient.lastName}
                    </option>
                  ))}
                </select>

                {patients.isError && (
                  <p className="err">{errorMessage(patients.error)}</p>
                )}

                {!patients.isLoading &&
                  !patients.isError &&
                  patients.data?.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No active patients were returned. Register a patient
                      before booking.
                    </p>
                  )}
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  02 / Doctor
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Choose an active doctor.
                </p>

                <select
                  className="input mt-3"
                  value={doctorId}
                  onChange={(event) => {
                    setDoctorId(event.target.value);
                    setSelectedSlot(null);
                  }}
                  disabled={doctors.isLoading}
                >
                  <option value="">
                    {doctors.isLoading
                      ? 'Loading doctors...'
                      : 'Select a doctor'}
                  </option>

                  {doctors.data?.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.user.name} · {doctor.specialization}
                    </option>
                  ))}
                </select>

                {doctors.isError && (
                  <p className="err">{errorMessage(doctors.error)}</p>
                )}

                {!doctors.isLoading &&
                  !doctors.isError &&
                  doctors.data?.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No active doctors are available. Register a doctor
                      and configure their schedule first.
                    </p>
                  )}

                {doctorId && doctors.data && (
                  <div className="mt-3 rounded-lg bg-[#f4f8f8] p-3">
                    {doctors.data
                      .filter((doctor) => doctor.id === doctorId)
                      .map((doctor) => (
                        <div key={doctor.id}>
                          <p className="text-xs font-bold text-slate-800">
                            {doctor.department?.name ||
                              'Department not specified'}
                          </p>

                          <p className="mt-1 text-[11px] text-slate-500">
                            {doctor.specialization}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  03 / Date and availability
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Select a date to retrieve the doctor's configured
                  appointment slots.
                </p>

                <input
                  type="date"
                  className="input mt-3"
                  value={bookingDate}
                  min={clinicToday(timezone)}
                  onChange={(event) => {
                    setBookingDate(event.target.value);
                    setSelectedSlot(null);
                  }}
                />

                {doctorId && bookingDate && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-700">
                        Available time slots
                      </p>

                      {availability.data && (
                        <span className="text-[10px] text-slate-400">
                          {availability.data.length} available
                        </span>
                      )}
                    </div>

                    {availability.isLoading ? (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((item) => (
                          <div
                            key={item}
                            className="h-10 animate-pulse rounded-lg bg-slate-100"
                          />
                        ))}
                      </div>
                    ) : availability.isError ? (
                      <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                        Could not retrieve availability:{' '}
                        {errorMessage(availability.error)}

                        <button
                          type="button"
                          className="ml-1 font-bold underline"
                          onClick={() => void availability.refetch()}
                        >
                          Retry
                        </button>
                      </div>
                    ) : availability.data?.length === 0 ? (
                      <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <p className="text-xs font-semibold text-amber-800">
                          No available slots
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-amber-700">
                          This doctor has no available slots on the
                          selected date. Check another date or review
                          the doctor's schedule.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {availability.data?.map((slot) => {
                          const selected =
                            selectedSlot?.start === slot.start;

                          return (
                            <button
                              key={slot.start}
                              type="button"
                              className={`rounded-lg border px-2 py-3 text-xs font-bold transition ${
                                selected
                                  ? 'border-teal-700 bg-teal-700 text-white shadow-sm'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50'
                              }`}
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {formatTime(slot.start, timezone)}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedSlot && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 p-3 text-xs text-teal-800">
                        <Icon name="check" size={16} />

                        <span>
                          Selected:{' '}
                          {formatTime(selectedSlot.start, timezone)} –{' '}
                          {formatTime(selectedSlot.end, timezone)} (
                          {formatDuration(
                            selectedSlot.start,
                            selectedSlot.end,
                          )}{' '}
                          minutes)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  04 / Consultation details
                </h3>

                <label
                  className="label mt-3"
                  htmlFor="appointment-reason"
                >
                  Reason for visit{' '}
                  <span className="font-normal text-slate-400">
                    (optional)
                  </span>
                </label>

                <textarea
                  id="appointment-reason"
                  className="input min-h-[90px] resize-y"
                  maxLength={500}
                  placeholder="Brief reason for the appointment..."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />

                <p className="mt-1 text-right text-[10px] text-slate-400">
                  {reason.length}/500
                </p>
              </div>

              {bookingError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                >
                  <p className="font-bold">
                    Booking could not be completed
                  </p>

                  <p className="mt-1">{bookingError}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowBooking(false)}
              >
                Close
              </button>

              <button
                type="button"
                className="btn"
                disabled={
                  create.isPending ||
                  !patientId ||
                  !doctorId ||
                  !selectedSlot
                }
                onClick={() => {
                  setBookingError('');
                  create.mutate();
                }}
              >
                {create.isPending
                  ? 'Booking...'
                  : 'Confirm appointment'}

                {!create.isPending && <Icon name="check" size={16} />}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}