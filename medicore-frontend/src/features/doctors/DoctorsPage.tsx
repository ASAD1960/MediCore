import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

type DoctorStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
type Department = { id: string; name: string; description?: string | null };

type Doctor = {
  id: string;
  departmentId: string;
  licenseNumber: string;
  specialization: string;
  qualification?: string | null;
  consultationFee: number | string;
  experienceYears: number;
  status: DoctorStatus;
  user: { name: string; email: string };
  department: { id: string; name: string };
};

type Schedule = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotMinutes: number;
};

type DoctorForm = {
  name: string;
  email: string;
  password: string;
  departmentId: string;
  licenseNumber: string;
  specialization: string;
  qualification: string;
  consultationFee: string;
  experienceYears: string;
};

type ScheduleForm = {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  slotMinutes: string;
};

const emptyDoctorForm: DoctorForm = {
  name: '',
  email: '',
  password: '',
  departmentId: '',
  licenseNumber: '',
  specialization: '',
  qualification: '',
  consultationFee: '0',
  experienceYears: '0',
};

const emptyScheduleForm: ScheduleForm = {
  dayOfWeek: '1',
  startTime: '09:00',
  endTime: '17:00',
  slotMinutes: '15',
};

const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function Icon({
  name,
  size = 18,
}: {
  name:
    | 'search'
    | 'plus'
    | 'refresh'
    | 'close'
    | 'calendar'
    | 'user'
    | 'clock'
    | 'edit'
    | 'trash'
    | 'chevron'
    | 'stethoscope'
    | 'building'
    | 'shield'
    | 'mail'
    | 'briefcase'
    | 'wallet'
    | 'check'
    | 'alert'
    | 'arrow'
    | 'filter'
    | 'sparkles'
    | 'more';
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
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'refresh':
      return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" /></svg>;
    case 'close':
      return <svg {...common}><path d="m18 6-12 12M6 6l12 12" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
    case 'user':
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'edit':
      return <svg {...common}><path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15z" /></svg>;
    case 'trash':
      return <svg {...common}><path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" /></svg>;
    case 'chevron':
      return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
    case 'stethoscope':
      return <svg {...common}><path d="M6 3v5a4 4 0 0 0 8 0V3M6 5H4M14 5h2M10 12v2a5 5 0 0 0 10 0v-1" /><circle cx="20" cy="11" r="2" /></svg>;
    case 'building':
      return <svg {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M10 21v-3h4v3" /></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case 'mail':
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
    case 'briefcase':
      return <svg {...common}><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V4h8v3M3 12h18M10 12v2h4v-2" /></svg>;
    case 'wallet':
      return <svg {...common}><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v16H5a2 2 0 0 1-2-2V6.5Z" /><path d="M3 8h17M16 13h4" /><circle cx="16" cy="13" r=".7" fill="currentColor" /></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
    case 'alert':
      return <svg {...common}><path d="M12 9v4m0 4h.01" /><path d="M10.3 3.9 2.5 17.4A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>;
    case 'arrow':
      return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
    case 'filter':
      return <svg {...common}><path d="M4 6h16M7 12h10m-7 6h4" /></svg>;
    case 'sparkles':
      return <svg {...common}><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></svg>;
    case 'more':
      return <svg {...common}><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></svg>;
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function StatusBadge({ status }: { status: DoctorStatus }) {
  const styles: Record<DoctorStatus, string> = {
    ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    INACTIVE: 'border-slate-200 bg-slate-100 text-slate-600',
    SUSPENDED: 'border-rose-200 bg-rose-50 text-rose-700',
  };

  const labels: Record<DoctorStatus, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    SUSPENDED: 'Suspended',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${styles[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
  tone,
  loading,
}: {
  label: string;
  value: number;
  detail: string;
  icon: 'user' | 'shield' | 'alert';
  tone: 'green' | 'slate' | 'rose';
  loading: boolean;
}) {
  const tones = {
    green: 'bg-[#eaf5f1] text-[#276b59]',
    slate: 'bg-slate-100 text-slate-600',
    rose: 'bg-rose-50 text-rose-700',
  };

  return (
    <article className="relative overflow-hidden rounded-xl border border-[#e7ece9] bg-white p-4 shadow-[0_2px_10px_rgba(23,45,37,0.025)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</p>
          <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-[#1b302a]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {loading ? '—' : value}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">{detail}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} size={19} />
        </span>
      </div>
      <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-[#2b7561]/25 via-[#2b7561]/10 to-transparent" />
    </article>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-semibold text-slate-700">
        {label}{required ? <span className="ml-1 text-rose-600">*</span> : null}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[10px] leading-4 text-slate-400">{hint}</span>}
    </label>
  );
}

export default function DoctorsPage() {
  const { me, can } = useAuth();
  const qc = useQueryClient();
  const organizationId = me?.organization?.id;

  const canManage = can('doctors.manage');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | DoctorStatus>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [form, setForm] = useState<DoctorForm>(emptyDoctorForm);
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [scheduleDoctor, setScheduleDoctor] = useState<Doctor | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState<ScheduleForm>(emptyScheduleForm);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleMessage, setScheduleMessage] = useState('');

  const doctorsQuery = useQuery({
    queryKey: ['doctors', organizationId, statusFilter, search],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Doctor[]> => {
      const response = await api.get('/doctors', {
        params: {
          status: statusFilter,
          search: search.trim() || undefined,
        },
      });
      return response.data.data;
    },
  });

  const departmentsQuery = useQuery({
    queryKey: ['doctor-departments', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<Department[]> =>
      (await api.get('/doctors/departments')).data.data,
  });

  const schedulesQuery = useQuery({
    queryKey: ['doctor-schedules', organizationId, scheduleDoctor?.id],
    enabled: Boolean(scheduleDoctor?.id),
    queryFn: async (): Promise<Schedule[]> =>
      (await api.get(`/doctors/${scheduleDoctor!.id}/schedule`)).data.data,
  });

  const scheduleQueryKey = ['doctor-schedules', organizationId, scheduleDoctor?.id];

  const saveDoctor = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        departmentId: form.departmentId,
        licenseNumber: form.licenseNumber.trim(),
        specialization: form.specialization.trim(),
        qualification: form.qualification.trim() || undefined,
        consultationFee: Number(form.consultationFee),
        experienceYears: Number(form.experienceYears),
      };

      if (editingDoctor) {
        return api.patch(`/doctors/${editingDoctor.id}`, payload);
      }

      return api.post('/doctors', {
        ...payload,
        email: form.email.trim(),
        password: form.password,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['doctors', organizationId] });
      setShowForm(false);
      setEditingDoctor(null);
      setForm(emptyDoctorForm);
      setFormError('');
      setError('');
      setMessage(editingDoctor ? 'Doctor profile updated successfully.' : 'Doctor registered successfully.');
    },
    onError: (e: unknown) => setFormError(errorMessage(e)),
  });

  const changeStatus = useMutation({
    mutationFn: async ({ doctor, status }: { doctor: Doctor; status: DoctorStatus }) =>
      api.patch(`/doctors/${doctor.id}/status`, { status }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['doctors', organizationId] });
      setError('');
      setMessage('Doctor status updated. Existing appointments and clinical history are preserved.');
    },
    onError: (e: unknown) => setError(errorMessage(e)),
  });

  const saveSchedule = useMutation({
    mutationFn: async () => {
      if (!scheduleDoctor) throw new Error('Select a doctor first.');
      if (scheduleForm.startTime >= scheduleForm.endTime) {
        throw new Error('End time must be later than start time.');
      }

      const payload = {
        dayOfWeek: Number(scheduleForm.dayOfWeek),
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        slotMinutes: Number(scheduleForm.slotMinutes),
      };

      if (editingSchedule) {
        return api.patch(
          `/doctors/${scheduleDoctor.id}/schedule/${editingSchedule.id}`,
          payload,
        );
      }

      return api.post(`/doctors/${scheduleDoctor.id}/schedule`, payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: scheduleQueryKey });
      setEditingSchedule(null);
      setScheduleForm(emptyScheduleForm);
      setScheduleError('');
      setScheduleMessage('Schedule saved successfully.');
    },
    onError: (e: unknown) => setScheduleError(errorMessage(e)),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (scheduleId: string) => {
      if (!scheduleDoctor) throw new Error('Select a doctor first.');
      return api.delete(`/doctors/${scheduleDoctor.id}/schedule/${scheduleId}`);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: scheduleQueryKey });
      setScheduleMessage('Schedule block deleted.');
      setScheduleError('');
    },
    onError: (e: unknown) => setScheduleError(errorMessage(e)),
  });

  const doctors = doctorsQuery.data ?? [];

  const counts = useMemo(() => ({
    active: doctors.filter((doctor) => doctor.status === 'ACTIVE').length,
    inactive: doctors.filter((doctor) => doctor.status === 'INACTIVE').length,
    suspended: doctors.filter((doctor) => doctor.status === 'SUSPENDED').length,
  }), [doctors]);

  function openCreate() {
    setEditingDoctor(null);
    setForm(emptyDoctorForm);
    setFormError('');
    setShowForm(true);
  }

  function openEdit(doctor: Doctor) {
    setEditingDoctor(doctor);
    setForm({
      name: doctor.user.name,
      email: doctor.user.email,
      password: '',
      departmentId: doctor.departmentId,
      licenseNumber: doctor.licenseNumber,
      specialization: doctor.specialization,
      qualification: doctor.qualification ?? '',
      consultationFee: String(doctor.consultationFee),
      experienceYears: String(doctor.experienceYears),
    });
    setFormError('');
    setShowForm(true);
  }

  function closeDoctorForm() {
    if (saveDoctor.isPending) return;
    setShowForm(false);
    setEditingDoctor(null);
    setFormError('');
  }

  function openSchedules(doctor: Doctor) {
    setScheduleDoctor(doctor);
    setEditingSchedule(null);
    setScheduleForm(emptyScheduleForm);
    setScheduleError('');
    setScheduleMessage('');
  }

  function editSchedule(schedule: Schedule) {
    setEditingSchedule(schedule);
    setScheduleForm({
      dayOfWeek: String(schedule.dayOfWeek),
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      slotMinutes: String(schedule.slotMinutes),
    });
    setScheduleError('');
    setScheduleMessage('');
  }

  function closeSchedulePanel() {
    if (saveSchedule.isPending || deleteSchedule.isPending) return;
    setScheduleDoctor(null);
    setEditingSchedule(null);
    setScheduleError('');
    setScheduleMessage('');
  }

  function resetScheduleForm() {
    setEditingSchedule(null);
    setScheduleForm(emptyScheduleForm);
    setScheduleError('');
    setScheduleMessage('');
  }

  const filteredDescription = search.trim()
    ? `Results matching “${search.trim()}”`
    : statusFilter === 'ALL'
      ? 'All registered medical professionals'
      : `${statusFilter.toLowerCase()} medical professionals`;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col justify-between gap-4 border-b border-[#e6ece8] pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#347762]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#347762]" />
            Clinical operations
            <Icon name="chevron" size={12} />
            Workforce
          </div>
          <h1 className="text-[26px] font-bold tracking-[-.045em] text-[#1b302a] sm:text-[30px]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Doctor management
          </h1>
          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-slate-500">
            Maintain your medical team, professional credentials and clinic availability from one workspace.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            className="btn inline-flex shrink-0 items-center justify-center gap-2"
            onClick={openCreate}
          >
            <Icon name="plus" size={16} />
            Register doctor
          </button>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Active doctors"
          value={counts.active}
          detail="Available in the directory"
          icon="user"
          tone="green"
          loading={doctorsQuery.isLoading}
        />
        <Metric
          label="Inactive doctors"
          value={counts.inactive}
          detail="Not currently active"
          icon="shield"
          tone="slate"
          loading={doctorsQuery.isLoading}
        />
        <Metric
          label="Suspended doctors"
          value={counts.suspended}
          detail="Restricted staff accounts"
          icon="alert"
          tone="rose"
          loading={doctorsQuery.isLoading}
        />
      </section>

      {(message || error) && (
        <div
          role={error ? 'alert' : 'status'}
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
            error
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span className="flex items-start gap-2">
            <Icon name={error ? 'alert' : 'check'} size={15} />
            {error || message}
          </span>
          <button
            type="button"
            onClick={() => { setMessage(''); setError(''); }}
            aria-label="Dismiss message"
            className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100"
          >
            <Icon name="close" size={15} />
          </button>
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-[#e4ebe7] bg-white shadow-[0_3px_14px_rgba(23,45,37,0.035)]">
        <div className="flex flex-col justify-between gap-4 border-b border-[#edf1ee] px-4 py-5 sm:px-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eaf4f0] text-[#2c705d]">
                <Icon name="stethoscope" size={16} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#347762]">Staff directory</p>
                <h2 className="mt-0.5 text-[15px] font-bold tracking-tight text-[#20342e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Medical professionals
                </h2>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">{filteredDescription}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              {doctorsQuery.isLoading ? 'Updating directory' : `${doctors.length} listed`}
            </span>
            <button
              type="button"
              className="btn-ghost inline-flex items-center gap-2 text-xs"
              onClick={() => void doctorsQuery.refetch()}
              disabled={doctorsQuery.isFetching}
            >
              <Icon name="refresh" size={14} />
              {doctorsQuery.isFetching ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="grid gap-3 border-b border-[#edf1ee] bg-[#f8faf9] p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_190px]">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" size={16} />
            </span>
            <input
              className="input pl-9"
              placeholder="Search by name, specialty, license or department..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search doctors"
            />
          </div>

          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="filter" size={15} />
            </span>
            <select
              className="input pl-9"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | DoctorStatus)}
              aria-label="Filter doctors by status"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>

        {doctorsQuery.isError ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <Icon name="alert" size={21} />
            </span>
            <h3 className="mt-3 text-sm font-bold text-slate-800">Unable to load doctor directory</h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
              {errorMessage(doctorsQuery.error)}
            </p>
            <button type="button" className="btn-ghost mt-4" onClick={() => void doctorsQuery.refetch()}>
              Try again
            </button>
          </div>
        ) : doctorsQuery.isLoading ? (
          <div className="space-y-4 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex animate-pulse items-center gap-4 py-2">
                <div className="h-10 w-10 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/3 rounded bg-slate-100" />
                </div>
                <div className="h-6 w-20 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : doctors.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#e7eeea] bg-[#f7faf8] text-[#6d9285]">
              <Icon name="stethoscope" size={24} />
            </span>
            <h3 className="mt-4 text-sm font-bold text-[#243831]">
              {search || statusFilter !== 'ALL' ? 'No matching doctors' : 'Your doctor directory is empty'}
            </h3>
            <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-slate-500">
              {search || statusFilter !== 'ALL'
                ? 'Try adjusting your search terms or status filter to find the doctor you are looking for.'
                : 'Your registered medical professionals will appear here. Add your first doctor to begin managing clinic availability.'}
            </p>
            {search || statusFilter !== 'ALL' ? (
              <button
                type="button"
                className="mt-4 text-xs font-bold text-[#347762] hover:text-[#1d5747]"
                onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
              >
                Clear filters
              </button>
            ) : canManage ? (
              <button type="button" className="btn mt-5 inline-flex items-center gap-2" onClick={openCreate}>
                <Icon name="plus" size={15} />
                Register first doctor
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[960px] text-left">
                <thead className="border-b border-[#edf1ee] bg-[#fbfcfb]">
                  <tr className="text-[9px] font-bold uppercase tracking-[.13em] text-slate-400">
                    <th className="px-5 py-3.5">Medical professional</th>
                    <th className="px-4 py-3.5">Department / specialty</th>
                    <th className="px-4 py-3.5">License</th>
                    <th className="px-4 py-3.5">Experience</th>
                    <th className="px-4 py-3.5">Consultation fee</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf1ee]">
                  {doctors.map((doctor) => (
                    <tr key={doctor.id} className="transition-colors hover:bg-[#fafcfb]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dcebe4] bg-[#eaf4f0] text-[11px] font-bold text-[#2b6b58]">
                            {initials(doctor.user.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[#243831]">{doctor.user.name}</p>
                            <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Icon name="mail" size={11} />
                              {doctor.user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-semibold text-slate-700">{doctor.department?.name ?? '—'}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{doctor.specialization}</p>
                      </td>
                      <td className="px-4 py-4 font-mono text-[11px] text-slate-600">{doctor.licenseNumber}</td>
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">{doctor.experienceYears}</span>
                        <span className="ml-1 text-slate-400">years</span>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-700">
                        {Number(doctor.consultationFee).toLocaleString()}
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={doctor.status} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e9e5] bg-white px-2.5 py-2 text-[10px] font-bold text-slate-600 transition hover:border-[#bfd6cb] hover:bg-[#f5faf7] hover:text-[#28664f]"
                            onClick={() => openSchedules(doctor)}
                          >
                            <Icon name="calendar" size={13} />
                            Schedule
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                className="grid h-8 w-8 place-items-center rounded-lg border border-[#e2e9e5] bg-white text-slate-500 transition hover:border-[#bfd6cb] hover:bg-[#f5faf7] hover:text-[#28664f]"
                                onClick={() => openEdit(doctor)}
                                aria-label={`Edit ${doctor.user.name}`}
                                title="Edit doctor"
                              >
                                <Icon name="edit" size={14} />
                              </button>
                              <select
                                className="max-w-[112px] rounded-lg border border-[#e2e9e5] bg-white px-2 py-2 text-[10px] font-semibold text-slate-600 outline-none focus:border-[#6b9c87]"
                                aria-label={`Change status for ${doctor.user.name}`}
                                value={doctor.status}
                                disabled={changeStatus.isPending}
                                onChange={(event) => {
                                  const nextStatus = event.target.value as DoctorStatus;
                                  if (nextStatus === doctor.status) return;
                                  const confirmed = window.confirm(
                                    `Change ${doctor.user.name} from ${doctor.status} to ${nextStatus}? Existing appointments and clinical records will not be deleted.`,
                                  );
                                  if (confirmed) changeStatus.mutate({ doctor, status: nextStatus });
                                }}
                              >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="SUSPENDED">Suspended</option>
                              </select>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[#edf1ee] lg:hidden">
              {doctors.map((doctor) => (
                <article key={doctor.id} className="space-y-3 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#dcebe4] bg-[#eaf4f0] text-xs font-bold text-[#2b6b58]">
                      {initials(doctor.user.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xs font-bold text-[#243831]">{doctor.user.name}</h3>
                        <StatusBadge status={doctor.status} />
                      </div>
                      <p className="mt-1 text-[10px] text-slate-500">{doctor.specialization}</p>
                      <p className="mt-1 truncate text-[10px] text-slate-400">{doctor.user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-[#f8faf9] p-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Department</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-700">{doctor.department?.name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Experience</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-700">{doctor.experienceYears} years</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">License</p>
                      <p className="mt-1 break-all font-mono text-[10px] text-slate-600">{doctor.licenseNumber}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Consultation fee</p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-700">{Number(doctor.consultationFee).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="btn-ghost inline-flex items-center gap-1.5 text-[10px]"
                      onClick={() => openSchedules(doctor)}
                    >
                      <Icon name="calendar" size={13} />
                      Schedule
                    </button>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          className="btn-ghost inline-flex items-center gap-1.5 text-[10px]"
                          onClick={() => openEdit(doctor)}
                        >
                          <Icon name="edit" size={13} />
                          Edit
                        </button>
                        <select
                          className="ml-auto max-w-[125px] rounded-lg border border-[#e2e9e5] bg-white px-2 py-2 text-[10px] font-semibold text-slate-600"
                          aria-label={`Change status for ${doctor.user.name}`}
                          value={doctor.status}
                          disabled={changeStatus.isPending}
                          onChange={(event) => {
                            const nextStatus = event.target.value as DoctorStatus;
                            if (nextStatus === doctor.status) return;
                            const confirmed = window.confirm(
                              `Change ${doctor.user.name} from ${doctor.status} to ${nextStatus}? Existing appointments and clinical records will not be deleted.`,
                            );
                            if (confirmed) changeStatus.mutate({ doctor, status: nextStatus });
                          }}
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {!doctorsQuery.isLoading && !doctorsQuery.isError && doctors.length > 0 && (
          <div className="flex flex-col justify-between gap-1 border-t border-[#edf1ee] bg-[#fbfcfb] px-5 py-3 sm:flex-row sm:items-center">
            <p className="text-[10px] text-slate-500">
              Showing <strong className="text-slate-700">{doctors.length}</strong> doctor{doctors.length === 1 ? '' : 's'} in this directory.
            </p>
            <p className="text-[10px] text-slate-400">MediCore · Clinical workforce</p>
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="fixed inset-0 z-[70] flex justify-end bg-[#14231e]/45 backdrop-blur-[3px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDoctorForm();
          }}
        >
          <section
            className="flex h-full w-full max-w-[570px] flex-col overflow-hidden border-l border-white/50 bg-[#fff] shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label={editingDoctor ? 'Edit doctor' : 'Register doctor'}
          >
            <div className="flex items-center justify-between border-b border-[#e9efeb] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#347762]">Medical staff / profile</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-[#20342e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {editingDoctor ? 'Update doctor profile' : 'Register a doctor'}
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  {editingDoctor ? 'Maintain professional and directory information.' : 'Create a doctor profile and associated login account.'}
                </p>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-lg border border-[#e7ece9] text-slate-500 transition hover:bg-[#f5f8f6]"
                onClick={closeDoctorForm}
                aria-label="Close form"
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eaf4f0] text-[#347762]">
                    <Icon name="user" size={14} />
                  </span>
                  <div>
                    <h3 className="text-[11px] font-bold text-[#273a33]">Account information</h3>
                    <p className="text-[9px] text-slate-400">01 / Identity and access</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Full name" required>
                      <input
                        className="input"
                        value={form.name}
                        maxLength={120}
                        onChange={(event) => setForm({ ...form, name: event.target.value })}
                        placeholder="Dr. Full Name"
                        autoComplete="name"
                      />
                    </Field>
                  </div>

                  {!editingDoctor ? (
                    <>
                      <div className="sm:col-span-2">
                        <Field label="Login email" required>
                          <input
                            className="input"
                            type="email"
                            value={form.email}
                            onChange={(event) => setForm({ ...form, email: event.target.value })}
                            placeholder="doctor@clinic.com"
                            autoComplete="email"
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-2">
                        <Field label="Temporary password" required hint="Use at least 10 characters. Share credentials securely with the doctor.">
                          <input
                            className="input"
                            type="password"
                            minLength={10}
                            value={form.password}
                            onChange={(event) => setForm({ ...form, password: event.target.value })}
                            autoComplete="new-password"
                          />
                        </Field>
                      </div>
                    </>
                  ) : (
                    <div className="sm:col-span-2 flex items-start gap-2 rounded-lg border border-[#e5ece8] bg-[#f8faf9] p-3">
                      <Icon name="shield" size={15} />
                      <p className="text-[10px] leading-5 text-slate-500">
                        Login email: <strong className="text-slate-700">{editingDoctor.user.email}</strong>.
                        Email and password changes are not included in this profile editor.
                      </p>
                    </div>
                  )}
                </div>
              </section>

              <section className="border-t border-[#edf1ee] pt-5">
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eaf4f0] text-[#347762]">
                    <Icon name="briefcase" size={14} />
                  </span>
                  <div>
                    <h3 className="text-[11px] font-bold text-[#273a33]">Professional details</h3>
                    <p className="text-[9px] text-slate-400">02 / Credentials and specialization</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Department" required>
                      <select
                        className="input"
                        value={form.departmentId}
                        onChange={(event) => setForm({ ...form, departmentId: event.target.value })}
                        disabled={departmentsQuery.isLoading}
                      >
                        <option value="">
                          {departmentsQuery.isLoading ? 'Loading departments...' : 'Select department'}
                        </option>
                        {departmentsQuery.data?.map((department) => (
                          <option key={department.id} value={department.id}>{department.name}</option>
                        ))}
                      </select>
                      {departmentsQuery.isError && <p className="err">{errorMessage(departmentsQuery.error)}</p>}
                      {!departmentsQuery.isLoading && !departmentsQuery.isError && departmentsQuery.data?.length === 0 && (
                        <p className="err">No active departments are available. Add an active department before registering a doctor.</p>
                      )}
                    </Field>
                  </div>

                  <Field label="Medical license number" required>
                    <input
                      className="input"
                      value={form.licenseNumber}
                      maxLength={100}
                      onChange={(event) => setForm({ ...form, licenseNumber: event.target.value })}
                      placeholder="License / registration ID"
                    />
                  </Field>

                  <Field label="Specialization" required>
                    <input
                      className="input"
                      value={form.specialization}
                      maxLength={120}
                      onChange={(event) => setForm({ ...form, specialization: event.target.value })}
                      placeholder="e.g. General Medicine"
                    />
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Qualification" hint="Optional professional qualifications">
                      <input
                        className="input"
                        value={form.qualification}
                        maxLength={200}
                        onChange={(event) => setForm({ ...form, qualification: event.target.value })}
                        placeholder="e.g. MBBS, FCPS"
                      />
                    </Field>
                  </div>

                  <Field label="Years of experience">
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="80"
                      step="1"
                      value={form.experienceYears}
                      onChange={(event) => setForm({ ...form, experienceYears: event.target.value })}
                    />
                  </Field>

                  <Field label="Consultation fee">
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.consultationFee}
                      onChange={(event) => setForm({ ...form, consultationFee: event.target.value })}
                    />
                  </Field>
                </div>
              </section>

              {formError && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                  <div className="flex items-center gap-2 font-bold">
                    <Icon name="alert" size={15} />
                    Unable to save doctor
                  </div>
                  <p className="mt-1.5 leading-5">{formError}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#e9efeb] bg-[#fafcfb] px-5 py-4 sm:px-6">
              <button type="button" className="btn-ghost" onClick={closeDoctorForm} disabled={saveDoctor.isPending}>
                Cancel
              </button>
              <button
                type="button"
                className="btn inline-flex items-center gap-2"
                disabled={
                  saveDoctor.isPending ||
                  departmentsQuery.isLoading ||
                  !form.name.trim() ||
                  !form.departmentId ||
                  !form.licenseNumber.trim() ||
                  !form.specialization.trim() ||
                  !Number.isFinite(Number(form.consultationFee)) ||
                  Number(form.consultationFee) < 0 ||
                  !Number.isInteger(Number(form.experienceYears)) ||
                  Number(form.experienceYears) < 0 ||
                  Number(form.experienceYears) > 80 ||
                  (!editingDoctor && (!form.email.trim() || form.password.length < 10))
                }
                onClick={() => {
                  setFormError('');
                  saveDoctor.mutate();
                }}
              >
                {saveDoctor.isPending ? 'Saving profile...' : editingDoctor ? 'Save changes' : 'Register doctor'}
                {!saveDoctor.isPending && <Icon name="arrow" size={14} />}
              </button>
            </div>
          </section>
        </div>
      )}

      {scheduleDoctor && (
        <div
          className="fixed inset-0 z-[75] flex justify-end bg-[#14231e]/45 backdrop-blur-[3px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSchedulePanel();
          }}
        >
          <section
            className="flex h-full w-full max-w-[570px] flex-col overflow-hidden border-l border-white/50 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Doctor weekly schedule"
          >
            <div className="flex items-center justify-between border-b border-[#e9efeb] px-5 py-4 sm:px-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#347762]">Clinical operations / availability</p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-[#20342e]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Weekly schedule
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  {scheduleDoctor.user.name} · {scheduleDoctor.specialization}
                </p>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-lg border border-[#e7ece9] text-slate-500 transition hover:bg-[#f5f8f6]"
                onClick={closeSchedulePanel}
                aria-label="Close schedule"
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
              <div className="flex items-start gap-3 rounded-xl border border-[#dcebe4] bg-[#f2f8f5] p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-[#347762]">
                  <Icon name="calendar" size={16} />
                </span>
                <div>
                  <p className="text-[11px] font-bold text-[#285a49]">Schedule configuration</p>
                  <p className="mt-1 text-[10px] leading-5 text-[#527567]">
                    Weekly time blocks determine the appointment slots offered for this doctor. Times follow the clinic timezone.
                  </p>
                </div>
              </div>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[11px] font-bold text-[#273a33]">Configured schedule blocks</h3>
                    <p className="mt-1 text-[9px] text-slate-400">Existing weekly availability</p>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#dcebe4] bg-white px-3 py-2 text-[10px] font-bold text-[#347762] transition hover:bg-[#f3f8f5]"
                      onClick={resetScheduleForm}
                    >
                      <Icon name="plus" size={13} />
                      New block
                    </button>
                  )}
                </div>

                {schedulesQuery.isError ? (
                  <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs text-rose-700">
                    {errorMessage(schedulesQuery.error)}
                    <button type="button" className="ml-2 font-bold underline" onClick={() => void schedulesQuery.refetch()}>
                      Retry
                    </button>
                  </div>
                ) : schedulesQuery.isLoading ? (
                  <div className="mt-3 space-y-3 rounded-xl border border-[#edf1ee] p-4">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="flex animate-pulse items-center justify-between">
                        <div className="space-y-2">
                          <div className="h-3 w-20 rounded bg-slate-100" />
                          <div className="h-2.5 w-36 rounded bg-slate-100" />
                        </div>
                        <div className="h-7 w-16 rounded bg-slate-100" />
                      </div>
                    ))}
                  </div>
                ) : schedulesQuery.data?.length === 0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-[#dce5df] bg-[#fbfcfb] px-4 py-8 text-center">
                    <span className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-[#eef5f1] text-[#6c9583]">
                      <Icon name="calendar" size={19} />
                    </span>
                    <p className="mt-3 text-xs font-bold text-slate-700">No weekly schedule configured</p>
                    <p className="mx-auto mt-1 max-w-xs text-[10px] leading-5 text-slate-500">
                      Add a schedule block to make appointment slots available for this doctor.
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 divide-y divide-[#edf1ee] overflow-hidden rounded-xl border border-[#e5ece8]">
                    {schedulesQuery.data?.map((schedule) => (
                      <div key={schedule.id} className="flex items-center justify-between gap-3 px-3.5 py-3.5 transition hover:bg-[#fbfcfb] sm:px-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef5f1] text-[#347762]">
                            <Icon name="clock" size={16} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-[#293c34]">
                              {weekdays[schedule.dayOfWeek] ?? 'Unknown day'}
                            </p>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {schedule.startTime} – {schedule.endTime} · {schedule.slotMinutes}-minute slots
                            </p>
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex shrink-0 gap-1.5">
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-[#e5ece8] text-slate-500 transition hover:bg-[#f2f8f5] hover:text-[#347762]"
                              onClick={() => editSchedule(schedule)}
                              aria-label={`Edit ${weekdays[schedule.dayOfWeek]} schedule`}
                              title="Edit schedule"
                            >
                              <Icon name="edit" size={13} />
                            </button>
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-lg border border-[#e5ece8] text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                              disabled={deleteSchedule.isPending}
                              onClick={() => {
                                if (window.confirm(`Delete the ${weekdays[schedule.dayOfWeek]} schedule block (${schedule.startTime}–${schedule.endTime})? Existing appointments will not be deleted.`)) {
                                  deleteSchedule.mutate(schedule.id);
                                }
                              }}
                              aria-label={`Delete ${weekdays[schedule.dayOfWeek]} schedule`}
                              title="Delete schedule"
                            >
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {canManage && (
                <section className="border-t border-[#edf1ee] pt-5">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#eaf4f0] text-[#347762]">
                      <Icon name="clock" size={14} />
                    </span>
                    <div>
                      <h3 className="text-[11px] font-bold text-[#273a33]">
                        {editingSchedule ? 'Edit schedule block' : 'Add schedule block'}
                      </h3>
                      <p className="text-[9px] text-slate-400">Define the doctor's recurring availability</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field label="Day of week">
                        <select
                          className="input"
                          value={scheduleForm.dayOfWeek}
                          onChange={(event) => setScheduleForm({ ...scheduleForm, dayOfWeek: event.target.value })}
                        >
                          {weekdays.map((day, index) => (
                            <option key={day} value={index}>{day}</option>
                          ))}
                        </select>
                      </Field>
                    </div>

                    <Field label="Start time">
                      <input
                        className="input"
                        type="time"
                        value={scheduleForm.startTime}
                        onChange={(event) => setScheduleForm({ ...scheduleForm, startTime: event.target.value })}
                      />
                    </Field>

                    <Field label="End time">
                      <input
                        className="input"
                        type="time"
                        value={scheduleForm.endTime}
                        onChange={(event) => setScheduleForm({ ...scheduleForm, endTime: event.target.value })}
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <Field label="Appointment slot duration">
                        <select
                          className="input"
                          value={scheduleForm.slotMinutes}
                          onChange={(event) => setScheduleForm({ ...scheduleForm, slotMinutes: event.target.value })}
                        >
                          {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((minutes) => (
                            <option key={minutes} value={minutes}>{minutes} minutes</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>

                  {scheduleError && (
                    <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-[10px] text-rose-700">
                      {scheduleError}
                    </div>
                  )}
                  {scheduleMessage && (
                    <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[10px] text-emerald-700">
                      {scheduleMessage}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {editingSchedule && (
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={resetScheduleForm}
                      >
                        Stop editing
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn inline-flex items-center gap-2"
                      disabled={
                        saveSchedule.isPending ||
                        !scheduleForm.startTime ||
                        !scheduleForm.endTime ||
                        scheduleForm.startTime >= scheduleForm.endTime
                      }
                      onClick={() => {
                        setScheduleError('');
                        setScheduleMessage('');
                        saveSchedule.mutate();
                      }}
                    >
                      {saveSchedule.isPending ? 'Saving...' : editingSchedule ? 'Update block' : 'Add schedule block'}
                      {!saveSchedule.isPending && <Icon name="arrow" size={13} />}
                    </button>
                  </div>
                </section>
              )}

              {!canManage && (
                <p className="border-t border-[#edf1ee] pt-4 text-[10px] text-slate-500">
                  You have read-only access to this doctor's schedule.
                </p>
              )}
            </div>

            <div className="border-t border-[#e9efeb] bg-[#fafcfb] px-5 py-4 sm:px-6">
              <button
                type="button"
                className="btn-ghost w-full justify-center"
                onClick={closeSchedulePanel}
              >
                Close schedule
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}