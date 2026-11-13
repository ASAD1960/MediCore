import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

const patientSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  phone: z.string().regex(/^[+\d][\d\s-]{6,19}$/, 'Enter a valid phone number'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional().or(z.literal('')),
  emergencyContactName: z.string().max(120).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
});

type PatientForm = z.infer<typeof patientSchema>;

interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  phone: string;
  email?: string | null;
  address?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  allergies?: { id: string; name?: string; allergen?: string; severity?: string }[];
}

interface PatientListResponse {
  data: Patient[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
  };
}

const emptyForm: PatientForm = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: 'MALE',
  phone: '',
  email: '',
  address: '',
  bloodGroup: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
};

function Icon({
  name,
  size = 18,
}: {
  name: 'search' | 'plus' | 'close' | 'user' | 'phone' | 'mail' | 'calendar' | 'edit' | 'arrow' | 'refresh' | 'id' | 'location' | 'users' | 'chevron' | 'shield' | 'alert' | 'check';
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
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case 'plus':
      return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>;
    case 'close':
      return <svg {...common}><path d="m18 6-12 12M6 6l12 12" /></svg>;
    case 'user':
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
    case 'users':
      return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'phone':
      return <svg {...common}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.8a2 2 0 0 1-.6 1.7L7 10.1a16 16 0 0 0 6 6l1.9-1.9a2 2 0 0 1 1.7-.6l2.8.4a2 2 0 0 1 1.6 1.9Z" /></svg>;
    case 'mail':
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
    case 'edit':
      return <svg {...common}><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></svg>;
    case 'arrow':
      return <svg {...common}><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
    case 'refresh':
      return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" /></svg>;
    case 'id':
      return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M6 16a3 3 0 0 1 6 0m3-5h3m-3 3h3" /></svg>;
    case 'location':
      return <svg {...common}><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
    case 'chevron':
      return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
    case 'shield':
      return <svg {...common}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case 'alert':
      return <svg {...common}><path d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></svg>;
    case 'check':
      return <svg {...common}><path d="m5 12 4 4L19 6" /></svg>;
  }
}

function initials(firstName: string, lastName: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function toDateInput(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

function StatusBadge({ status }: { status: string }) {
  const active = status === 'ACTIVE';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.08em] ${
      active
        ? 'border-emerald-200/80 bg-emerald-50 text-emerald-800'
        : 'border-slate-200 bg-slate-100 text-slate-600'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {status === 'ACTIVE' ? 'Active' : 'Inactive'}
    </span>
  );
}

function Field({
  label,
  name,
  register,
  error,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string;
  name: keyof PatientForm;
  register: ReturnType<ReturnType<typeof useForm<PatientForm>>['register']>;
  error?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="min-w-0">
      <label className="label" htmlFor={name}>
        {label}{required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        id={name}
        type={type}
        className="input"
        placeholder={placeholder}
        {...register}
      />
      {error && <p className="err">{error}</p>}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4">
      <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#347e72]">{eyebrow}</p>
      <h3 className="mt-1 text-sm font-bold tracking-tight text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
    </div>
  );
}

export default function PatientsPage() {
  const { can } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState<Patient['status']>('ACTIVE');
  const [serverErr, setServerErr] = useState('');
  const [dupe, setDupe] = useState(false);

  const list = useQuery({
    queryKey: ['patients', deferredSearch, statusFilter, page],
    queryFn: async (): Promise<PatientListResponse> => {
      const response = await api.get('/patients', {
        params: {
          search: deferredSearch || undefined,
          status: statusFilter || undefined,
          page,
          limit: 15,
        },
      });
      return response.data;
    },
    placeholderData: (previous) => previous,
  });

  const detail = useQuery({
    queryKey: ['patient', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async (): Promise<Patient> => {
      const response = await api.get(`/patients/${selectedId}`);
      return response.data.data;
    },
  });

  const createForm = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: emptyForm,
  });

  const editForm = useForm<PatientForm>({
    resolver: zodResolver(patientSchema),
    defaultValues: emptyForm,
  });

  useEffect(() => {
    if (!detail.data) return;

    setEditStatus(detail.data.status);
    editForm.reset({
      firstName: detail.data.firstName,
      lastName: detail.data.lastName,
      dateOfBirth: toDateInput(detail.data.dateOfBirth),
      gender: detail.data.gender,
      phone: detail.data.phone,
      email: detail.data.email ?? '',
      address: detail.data.address ?? '',
      bloodGroup: (detail.data.bloodGroup ?? '') as PatientForm['bloodGroup'],
      emergencyContactName: detail.data.emergencyContactName ?? '',
      emergencyContactPhone: detail.data.emergencyContactPhone ?? '',
    });
  }, [detail.data, editForm]);

  const create = useMutation({
    mutationFn: (values: PatientForm & { confirmDuplicate?: boolean }) =>
      api.post('/patients', {
        ...values,
        email: values.email || undefined,
        bloodGroup: values.bloodGroup || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['patients'] });
      createForm.reset(emptyForm);
      setShowForm(false);
      setServerErr('');
      setDupe(false);
    },
    onError: (error: unknown) => {
      const response = (error as { response?: { status?: number } }).response;
      setDupe(response?.status === 409);
      setServerErr(errorMessage(error));
    },
  });

  const update = useMutation({
    mutationFn: (values: PatientForm & { status: Patient['status'] }) =>
      api.patch(`/patients/${selectedId}`, {
        ...values,
        email: values.email || undefined,
        bloodGroup: values.bloodGroup || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['patients'] }),
        qc.invalidateQueries({ queryKey: ['patient', selectedId] }),
      ]);
      setEditing(false);
    },
  });

  const pagination = list.data?.pagination;
  const patients = list.data?.data ?? [];
  const total = pagination?.total ?? 0;
  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const hasFilters = Boolean(deferredSearch || statusFilter);

  const closeDetails = () => {
    setSelectedId(null);
    setEditing(false);
  };

  const openRegistration = () => {
    setServerErr('');
    setDupe(false);
    createForm.reset(emptyForm);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#347e72]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#347e72]" />
            Clinical operations
            <Icon name="chevron" size={12} />
            Registry
          </div>
          <h1 className="text-[27px] font-extrabold leading-tight tracking-[-.04em] text-[#172b32]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Patient directory
          </h1>
          <p className="mt-2 max-w-xl text-[13px] leading-6 text-slate-500">
            A centralized registry for patient identity, demographics and contact records.
          </p>
        </div>

        {can('patients.create') && (
          <button
            type="button"
            className="btn shrink-0"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setServerErr('');
                setDupe(false);
              } else {
                openRegistration();
              }
            }}
          >
            {showForm ? <Icon name="close" size={16} /> : <Icon name="plus" size={16} />}
            {showForm ? 'Close registration' : 'Register patient'}
          </button>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="relative overflow-hidden rounded-xl border border-[#dce8e4] bg-white p-4 shadow-[0_2px_10px_rgba(20,45,40,.025)]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Total patient records</p>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#edf5f2] text-[#347e72]">
              <Icon name="users" size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-[28px] font-extrabold leading-none tracking-tight text-[#172b32]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {list.isLoading ? '—' : total.toLocaleString()}
            </p>
            <span className="text-[10px] font-medium text-slate-400">Across this registry</span>
          </div>
          <div className="absolute bottom-0 left-0 h-[3px] w-full bg-[#347e72]/15">
            <div className="h-full w-1/3 bg-[#347e72]" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_rgba(20,45,40,.025)]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Directory view</p>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600">
              <Icon name="id" size={18} />
            </span>
          </div>
          <p className="mt-3 text-lg font-bold capitalize tracking-tight text-[#172b32]">
            {statusFilter ? statusFilter.toLowerCase() : 'All patients'}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">Current status selection</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_2px_10px_rgba(20,45,40,.025)]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">Visible records</p>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f2f4f7] text-slate-600">
              <Icon name="search" size={18} />
            </span>
          </div>
          <p className="mt-3 text-[28px] font-extrabold leading-none tracking-tight text-[#172b32]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {list.isLoading ? '—' : patients.length}
          </p>
          <p className="mt-1 text-[10px] text-slate-400">Records on this page</p>
        </div>
      </section>

      {showForm && can('patients.create') && (
        <section className="overflow-hidden rounded-xl border border-[#dce8e4] bg-white shadow-[0_8px_30px_rgba(20,45,40,.045)]">
          <div className="flex items-center justify-between gap-4 border-b border-[#e7eeeb] bg-[#f6faf8] px-5 py-4 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e5f0ec] text-[#347e72]">
                  <Icon name="user" size={16} />
                </span>
                <p className="text-[10px] font-bold uppercase tracking-[.13em] text-[#347e72]">New patient record</p>
              </div>
              <h2 className="mt-2 text-base font-bold tracking-tight text-[#172b32]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Patient registration
              </h2>
              <p className="mt-1 text-xs text-slate-500">Complete the required details to create a registry record.</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition hover:text-slate-700" aria-label="Close registration form">
              <Icon name="close" size={17} />
            </button>
          </div>

          <form
            className="space-y-6 p-5 sm:p-6"
            onSubmit={createForm.handleSubmit((values) => {
              setServerErr('');
              setDupe(false);
              create.mutate(values);
            })}
          >
            <div>
              <SectionHeading eyebrow="01 / Identity" title="Personal information" description="Basic demographic details used to identify the patient." />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="First name" name="firstName" register={createForm.register('firstName')} error={createForm.formState.errors.firstName?.message} required placeholder="Enter first name" />
                <Field label="Last name" name="lastName" register={createForm.register('lastName')} error={createForm.formState.errors.lastName?.message} required placeholder="Enter last name" />
                <Field label="Date of birth" name="dateOfBirth" type="date" register={createForm.register('dateOfBirth')} error={createForm.formState.errors.dateOfBirth?.message} required />
                <div>
                  <label className="label" htmlFor="patient-gender">Gender <span className="text-red-500">*</span></label>
                  <select id="patient-gender" className="input" {...createForm.register('gender')}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="patient-blood">Blood group</label>
                  <select id="patient-blood" className="input" {...createForm.register('bloodGroup')}>
                    <option value="">Not specified</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                      <option key={group} value={group}>{group}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <SectionHeading eyebrow="02 / Communication" title="Contact information" description="Primary contact details for patient communication." />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Phone number" name="phone" register={createForm.register('phone')} error={createForm.formState.errors.phone?.message} required placeholder="+92 300 1234567" />
                <Field label="Email address" name="email" type="email" register={createForm.register('email')} error={createForm.formState.errors.email?.message} placeholder="patient@example.com" />
                <Field label="Address" name="address" register={createForm.register('address')} error={createForm.formState.errors.address?.message} placeholder="Residential address" />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-5">
              <SectionHeading eyebrow="03 / Safety" title="Emergency contact" description="An alternative contact in case the patient needs assistance." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact person's name" name="emergencyContactName" register={createForm.register('emergencyContactName')} error={createForm.formState.errors.emergencyContactName?.message} placeholder="Full name" />
                <Field label="Emergency contact phone" name="emergencyContactPhone" register={createForm.register('emergencyContactPhone')} error={createForm.formState.errors.emergencyContactPhone?.message} placeholder="Phone number" />
              </div>
            </div>

            {serverErr && (
              <div role="alert" className={`rounded-lg border p-3 text-sm ${dupe ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                <div className="flex items-start gap-2">
                  <Icon name="alert" size={17} />
                  <div>
                    <p className="font-semibold">{dupe ? 'Possible duplicate patient' : 'Registration failed'}</p>
                    <p className="mt-1">{serverErr}</p>
                    {dupe && <p className="mt-1 text-xs">Review the existing record information before choosing whether to continue.</p>}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <p className="text-[10px] text-slate-400"><span className="text-red-500">*</span> Required fields</p>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className="btn-ghost" onClick={() => { setShowForm(false); createForm.reset(emptyForm); setServerErr(''); setDupe(false); }}>
                  Cancel
                </button>
                {dupe && (
                  <button
                    type="button"
                    className="btn-ghost border-amber-300 text-amber-800 hover:bg-amber-50"
                    disabled={create.isPending}
                    onClick={() => create.mutate({ ...createForm.getValues(), confirmDuplicate: true })}
                  >
                    Confirm anyway
                  </button>
                )}
                <button type="submit" className="btn" disabled={create.isPending}>
                  {create.isPending ? 'Registering...' : 'Create patient record'}
                  {!create.isPending && <Icon name="arrow" size={15} />}
                </button>
              </div>
            </div>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_3px_14px_rgba(20,45,40,.025)]">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 lg:flex-row lg:items-center lg:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#347e72]" />
              <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#347e72]">Registry workspace</p>
            </div>
            <h2 className="mt-1.5 text-base font-bold tracking-tight text-[#172b32]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Registered patients
            </h2>
            <p className="mt-1 text-xs text-slate-500">Search, filter and review demographic records.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" size={16} />
              </span>
              <input
                className="input pl-9"
                placeholder="Search name, ID or phone..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                aria-label="Search patients by name, ID or phone"
              />
            </div>

            <select
              className="input sm:w-36"
              aria-label="Filter patients by status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>

            <button
              type="button"
              className="btn-ghost"
              title="Refresh patient list"
              onClick={() => void list.refetch()}
              disabled={list.isFetching}
            >
              <Icon name="refresh" size={15} />
              <span className="sm:hidden">Refresh</span>
            </button>
          </div>
        </div>

        {list.isError ? (
          <div className="px-5 py-14 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-red-50 text-red-600">
              <Icon name="alert" size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-800">Unable to load patient records</p>
            <p className="mt-1 text-xs text-slate-500">{errorMessage(list.error)}</p>
            <button type="button" className="btn-ghost mt-4" onClick={() => void list.refetch()}>
              Try again
            </button>
          </div>
        ) : list.isLoading ? (
          <div className="space-y-4 p-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="flex animate-pulse items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/4 rounded bg-slate-100" />
                  <div className="h-2.5 w-1/5 rounded bg-slate-100" />
                </div>
                <div className="h-6 w-16 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : patients.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400">
              <Icon name="users" size={22} />
            </span>
            <h3 className="mt-4 text-sm font-bold text-[#172b32]">
              {hasFilters ? 'No matching patients' : 'No patient records yet'}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
              {hasFilters
                ? 'Try changing your search terms or clearing the status filter.'
                : 'Patient registrations will appear here. Create the first record to begin building your registry.'}
            </p>
            {hasFilters && (
              <button type="button" className="mt-3 text-xs font-bold text-[#347e72] hover:underline" onClick={() => { setSearch(''); setStatusFilter(''); setPage(1); }}>
                Clear filters
              </button>
            )}
            {!hasFilters && can('patients.create') && (
              <button type="button" className="btn mt-4" onClick={openRegistration}>
                <Icon name="plus" size={15} /> Register first patient
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left">
                <thead className="border-b border-slate-100 bg-[#f8faf9]">
                  <tr className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">
                    <th className="px-5 py-3.5 lg:px-6">Patient identity</th>
                    <th className="px-4 py-3.5">Patient ID</th>
                    <th className="px-4 py-3.5">Date of birth</th>
                    <th className="px-4 py-3.5">Gender</th>
                    <th className="px-4 py-3.5">Contact</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right lg:px-6">Record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patients.map((patient) => (
                    <tr key={patient.id} className="group transition-colors hover:bg-[#f8fbf9]">
                      <td className="px-5 py-3.5 lg:px-6">
                        <div className="flex items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#dce9e4] bg-[#edf5f1] text-[11px] font-bold text-[#28675d]">
                            {initials(patient.firstName, patient.lastName)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-slate-800">{patient.firstName} {patient.lastName}</p>
                            <p className="mt-1 max-w-[190px] truncate text-[10px] text-slate-400">{patient.email || 'No email recorded'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-semibold text-slate-600">
                          {patient.patientNumber}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-slate-600">{formatDate(patient.dateOfBirth)}</td>
                      <td className="px-4 py-3.5 text-xs capitalize text-slate-600">{patient.gender.toLowerCase()}</td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <span className="text-slate-400"><Icon name="phone" size={13} /></span>
                          {patient.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={patient.status} /></td>
                      <td className="px-5 py-3.5 text-right lg:px-6">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-[#b9d5cb] hover:bg-[#f0f7f3] hover:text-[#28675d]"
                          onClick={() => { setSelectedId(patient.id); setEditing(false); }}
                        >
                          View record <Icon name="arrow" size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-[#fbfcfb] px-5 py-3.5 sm:flex-row sm:items-center lg:px-6">
              <p className="text-[10px] text-slate-500">
                Showing <span className="font-bold text-slate-700">{patients.length}</span> of{' '}
                <span className="font-bold text-slate-700">{total}</span> patient records
                {list.isFetching && <span className="ml-2 text-[#347e72]">Updating...</span>}
              </p>
              <div className="flex items-center gap-2">
                <span className="mr-2 text-[10px] text-slate-500">
                  Page {pagination?.page ?? page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-ghost px-3 py-2 text-[10px]"
                  disabled={page <= 1 || list.isFetching}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-ghost px-3 py-2 text-[10px]"
                  disabled={page >= totalPages || list.isFetching}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedId && (
        <div
          className="fixed inset-0 z-[70] flex justify-end bg-[#10231f]/45 backdrop-blur-[3px]"
          role="presentation"
          onMouseDown={(event) => { if (event.target === event.currentTarget) closeDetails(); }}
        >
          <section className="flex h-full w-full max-w-[540px] flex-col overflow-hidden border-l border-white/20 bg-white shadow-2xl" role="dialog" aria-modal="true" aria-label="Patient record">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#347e72]">Patient registry</p>
                <h2 className="mt-1 text-base font-bold tracking-tight text-[#172b32]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Patient record
                </h2>
              </div>
              <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700" onClick={closeDetails} aria-label="Close patient details">
                <Icon name="close" size={17} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {detail.isLoading ? (
                <div className="space-y-4 p-6">
                  <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : detail.isError ? (
                <div className="p-6 text-sm text-red-700">
                  <p className="font-semibold">Unable to load this patient record.</p>
                  <p className="mt-1 text-xs">{errorMessage(detail.error)}</p>
                  <button type="button" className="btn-ghost mt-4" onClick={() => void detail.refetch()}>Try again</button>
                </div>
              ) : detail.data && (
                <div className="space-y-6 p-5 sm:p-6">
                  <div className="rounded-xl border border-[#dce8e4] bg-[#f5f9f7] p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[#d7e7df] bg-white text-base font-extrabold text-[#28675d] shadow-sm">
                        {initials(detail.data.firstName, detail.data.lastName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-lg font-extrabold tracking-tight text-[#172b32]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                          {detail.data.firstName} {detail.data.lastName}
                        </h3>
                        <p className="mt-1 font-mono text-[11px] text-slate-500">{detail.data.patientNumber}</p>
                        <div className="mt-2"><StatusBadge status={detail.data.status} /></div>
                      </div>
                    </div>
                  </div>

                  {!editing ? (
                    <>
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <SectionHeading eyebrow="Patient profile" title="Demographic information" />
                          {can('patients.update') && (
                            <button type="button" className="btn-ghost shrink-0 px-3 py-2 text-[10px]" onClick={() => setEditing(true)}>
                              <Icon name="edit" size={13} /> Edit record
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2.5">
                          {[
                            ['Date of birth', formatDate(detail.data.dateOfBirth)],
                            ['Gender', detail.data.gender.toLowerCase()],
                            ['Blood group', detail.data.bloodGroup || 'Not recorded'],
                            ['Registered', formatDate(detail.data.createdAt)],
                          ].map(([label, value]) => (
                            <div key={label} className="rounded-lg border border-slate-200/80 bg-white p-3">
                              <p className="text-[9px] font-bold uppercase tracking-[.1em] text-slate-400">{label}</p>
                              <p className="mt-1.5 text-sm font-semibold capitalize text-slate-800">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 p-4">
                        <SectionHeading eyebrow="Communication" title="Contact information" />
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon name="phone" size={15} /></span>
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Phone number</p>
                              <p className="mt-0.5 break-all text-xs font-medium text-slate-700">{detail.data.phone}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon name="mail" size={15} /></span>
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Email address</p>
                              <p className="mt-0.5 break-all text-xs font-medium text-slate-700">{detail.data.email || 'No email recorded'}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-500"><Icon name="location" size={15} /></span>
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Residential address</p>
                              <p className="mt-0.5 text-xs font-medium text-slate-700">{detail.data.address || 'No address recorded'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 p-4">
                        <SectionHeading eyebrow="Patient safety" title="Emergency contact" />
                        <p className="text-sm font-semibold text-slate-800">{detail.data.emergencyContactName || 'Not recorded'}</p>
                        <p className="mt-1 text-xs text-slate-500">{detail.data.emergencyContactPhone || 'No emergency phone recorded'}</p>
                      </div>

                      <div className="flex items-start gap-2 rounded-lg bg-[#f6f8f7] p-3 text-[10px] leading-5 text-slate-500">
                        <Icon name="shield" size={15} />
                        <p>This view displays demographic and contact details returned by the patient record endpoint. Clinical history and allergies are not edited here.</p>
                      </div>
                    </>
                  ) : (
                    <form
                      className="space-y-5"
                      onSubmit={editForm.handleSubmit((values) => update.mutate({ ...values, status: editStatus }))}
                    >
                      <div>
                        <SectionHeading eyebrow="Record maintenance" title="Edit patient information" description="Update demographic, contact and registry status details." />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="First name" name="firstName" register={editForm.register('firstName')} error={editForm.formState.errors.firstName?.message} required />
                        <Field label="Last name" name="lastName" register={editForm.register('lastName')} error={editForm.formState.errors.lastName?.message} required />
                        <Field label="Date of birth" name="dateOfBirth" type="date" register={editForm.register('dateOfBirth')} error={editForm.formState.errors.dateOfBirth?.message} required />
                        <div>
                          <label className="label" htmlFor="edit-gender">Gender</label>
                          <select id="edit-gender" className="input" {...editForm.register('gender')}>
                            <option value="MALE">Male</option>
                            <option value="FEMALE">Female</option>
                            <option value="OTHER">Other</option>
                          </select>
                        </div>
                        <Field label="Phone number" name="phone" register={editForm.register('phone')} error={editForm.formState.errors.phone?.message} required />
                        <Field label="Email" name="email" type="email" register={editForm.register('email')} error={editForm.formState.errors.email?.message} />
                        <div>
                          <label className="label" htmlFor="edit-blood">Blood group</label>
                          <select id="edit-blood" className="input" {...editForm.register('bloodGroup')}>
                            <option value="">Not specified</option>
                            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group} value={group}>{group}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="label" htmlFor="edit-status">Patient status</label>
                          <select id="edit-status" className="input" value={editStatus} onChange={(event) => setEditStatus(event.target.value as Patient['status'])}>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="Address" name="address" register={editForm.register('address')} error={editForm.formState.errors.address?.message} />
                        </div>
                        <Field label="Emergency contact name" name="emergencyContactName" register={editForm.register('emergencyContactName')} error={editForm.formState.errors.emergencyContactName?.message} />
                        <Field label="Emergency contact phone" name="emergencyContactPhone" register={editForm.register('emergencyContactPhone')} error={editForm.formState.errors.emergencyContactPhone?.message} />
                      </div>

                      {update.isError && (
                        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                          {errorMessage(update.error)}
                        </p>
                      )}

                      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
                        <button type="submit" className="btn" disabled={update.isPending}>
                          {update.isPending ? 'Saving...' : 'Save changes'}
                          {!update.isPending && <Icon name="check" size={15} />}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}