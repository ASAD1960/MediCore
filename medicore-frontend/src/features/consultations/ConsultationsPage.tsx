import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

type Patient = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
};

type Doctor = {
  id: string;
  specialization?: string;
  user?: { name?: string };
};

type Diagnosis = {
  id?: string;
  code?: string | null;
  description: string;
};

type Consultation = {
  id: string;
  patientId: string;
  doctorId: string;
  chiefComplaint?: string | null;
  clinicalNotes?: string | null;
  diagnosis?: string | null;
  treatmentPlan?: string | null;
  consultationStatus: 'DRAFT' | 'FINALIZED' | 'AMENDED';
  finalizedAt?: string | null;
  createdAt: string;
  diagnoses: Diagnosis[];
  encounter: {
    patient: Patient;
  };
  doctor: Doctor;
};

type PageResult<T> = {
  data: T[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
};

type FormState = {
  patientId: string;
  doctorId: string;
  chiefComplaint: string;
  clinicalNotes: string;
  diagnosis: string;
  treatmentPlan: string;
  diagnosesText: string;
};

const emptyForm: FormState = {
  patientId: '',
  doctorId: '',
  chiefComplaint: '',
  clinicalNotes: '',
  diagnosis: '',
  treatmentPlan: '',
  diagnosesText: '',
};

function rows<T>(payload: any): T[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function Status({ value }: { value: Consultation['consultationStatus'] }) {
  const styles = {
    DRAFT: 'bg-amber-50 text-amber-700 ring-amber-200',
    FINALIZED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    AMENDED: 'bg-violet-50 text-violet-700 ring-violet-200',
  };

  return (
    <span className={`mc-status-badge consultations-status inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[.1em] ring-1 ${styles[value]}`}>
      {value.toLowerCase().replace('_', ' ')}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  rows?: number;
}) {
  const common = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10';

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold tracking-wide text-slate-600">{label}</span>
      {multiline ? (
        <textarea
          className={`${common} resize-y`}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          className={common}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

export default function ConsultationsPage() {
  const { me, can } = useAuth();
  const qc = useQueryClient();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [statusFilter, setStatusFilter] = useState('');

  const canCreate = can('consultations.create');
  const canFinalize = can('consultations.finalize');

  const list = useQuery({
    queryKey: ['consultations', me?.organization?.id, statusFilter],
    queryFn: async (): Promise<PageResult<Consultation>> => {
      const response = await api.get('/consultations', {
        params: { limit: 100, status: statusFilter || undefined },
      });
      return response.data;
    },
  });

  const patients = useQuery({
    queryKey: ['consultation-patient-options', me?.organization?.id],
    enabled: creating,
    queryFn: async () => {
      const response = await api.get('/patients', {
        params: { page: 1, limit: 100, status: 'ACTIVE' },
      });
      return rows<Patient>(response.data);
    },
  });

  const doctors = useQuery({
    queryKey: ['consultation-doctor-options', me?.organization?.id],
    enabled: creating,
    queryFn: async () => {
      const response = await api.get('/doctors', {
        params: { page: 1, limit: 100, status: 'ACTIVE' },
      });
      return rows<Doctor>(response.data);
    },
  });

  const detail = useQuery({
    queryKey: ['consultation', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const response = await api.get(`/consultations/${selectedId}`);
      return response.data.data as Consultation;
    },
  });

  const records = useMemo(
    () => rows<Consultation>(list.data),
    [list.data],
  );

  const create = useMutation({
    mutationFn: async () => {
      const diagnoses = form.diagnosesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((description) => ({ description }));

      const response = await api.post('/consultations', {
        patientId: form.patientId,
        doctorId: form.doctorId,
        chiefComplaint: form.chiefComplaint || undefined,
        clinicalNotes: form.clinicalNotes || undefined,
        diagnosis: form.diagnosis || undefined,
        treatmentPlan: form.treatmentPlan || undefined,
        diagnoses: diagnoses.length ? diagnoses : undefined,
      });

      return response.data.data as Consultation;
    },
    onSuccess: async (consultation) => {
      setCreating(false);
      setForm(emptyForm);
      setSelectedId(consultation.id);
      await qc.invalidateQueries({ queryKey: ['consultations'] });
    },
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No consultation selected');

      const diagnoses = form.diagnosesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((description) => ({ description }));

      const response = await api.patch(`/consultations/${selectedId}`, {
        chiefComplaint: form.chiefComplaint,
        clinicalNotes: form.clinicalNotes,
        diagnosis: form.diagnosis,
        treatmentPlan: form.treatmentPlan,
        diagnoses,
      });

      return response.data.data as Consultation;
    },
    onSuccess: async (consultation) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['consultations'] }),
        qc.invalidateQueries({ queryKey: ['consultation', consultation.id] }),
      ]);
    },
  });

  const finalize = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No consultation selected');
      const response = await api.post(`/consultations/${selectedId}/finalize`);
      return response.data.data as Consultation;
    },
    onSuccess: async (consultation) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['consultations'] }),
        qc.invalidateQueries({ queryKey: ['consultation', consultation.id] }),
      ]);
    },
  });

  const selected = detail.data;
  const editable = selected?.consultationStatus === 'DRAFT' && canCreate;

  function openRecord(record: Consultation) {
    setCreating(false);
    setSelectedId(record.id);
    setForm({
      patientId: record.patientId,
      doctorId: record.doctorId,
      chiefComplaint: record.chiefComplaint ?? '',
      clinicalNotes: record.clinicalNotes ?? '',
      diagnosis: record.diagnosis ?? '',
      treatmentPlan: record.treatmentPlan ?? '',
      diagnosesText: (record.diagnoses ?? []).map((item) => item.description).join('\n'),
    });
  }

  function startNew() {
    setSelectedId(null);
    setForm(emptyForm);
    setCreating(true);
  }

  function closeWorkspace() {
    setSelectedId(null);
    setCreating(false);
    setForm(emptyForm);
  }

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="consultations-enterprise mx-auto max-w-[1500px] space-y-7 pb-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-teal-700">Clinical operations / patient care</p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Consultations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Clinical documentation, diagnosis and treatment records in one secure workspace.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#174d45] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-950/10 transition hover:bg-[#103e37]"
          >
            <span className="text-lg leading-none">+</span>
            New consultation
          </button>
        )}
      </header>

      <section className="consultations-overview grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">All records</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{list.data?.pagination?.total ?? records.length}</p>
          <p className="mt-1 text-xs text-slate-400">Consultation history</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Draft records</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-amber-700">{records.filter((item) => item.consultationStatus === 'DRAFT').length}</p>
          <p className="mt-1 text-xs text-slate-400">Awaiting completion</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Finalized records</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-700">{records.filter((item) => item.consultationStatus === 'FINALIZED').length}</p>
          <p className="mt-1 text-xs text-slate-400">Completed documentation</p>
        </div>
      </section>

      {(creating || selectedId) && (
        <section className="consultations-workspace overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-[#fbfcfa] px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">
                {creating ? 'New clinical record' : 'Clinical record'}
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                {creating ? 'Start a consultation' : selected ? `${selected.encounter.patient.firstName} ${selected.encounter.patient.lastName}` : 'Loading consultation...'}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {selected && <Status value={selected.consultationStatus} />}
              <button type="button" onClick={closeWorkspace} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Close</button>
            </div>
          </div>

          <div className="space-y-6 p-6">
            {creating && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-600">Patient</span>
                  <select
                    value={form.patientId}
                    onChange={(event) => updateField('patientId', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-teal-700"
                  >
                    <option value="">Select patient</option>
                    {(patients.data ?? []).map((patient) => (
                      <option key={patient.id} value={patient.id}>{patient.patientNumber} · {patient.firstName} {patient.lastName}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-600">Doctor</span>
                  <select
                    value={form.doctorId}
                    onChange={(event) => updateField('doctorId', event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-teal-700"
                  >
                    <option value="">Select doctor</option>
                    {(doctors.data ?? []).map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>{doctor.user?.name ?? 'Doctor'}{doctor.specialization ? ` · ${doctor.specialization}` : ''}</option>
                    ))}
                  </select>
                </label>
                {(patients.isLoading || doctors.isLoading) && <p className="text-xs text-slate-400">Loading patient and doctor directory...</p>}
              </div>
            )}

            {selected && (
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-3">
                <div><span className="text-slate-400">Patient ID</span><p className="mt-1 font-bold text-slate-800">{selected.encounter.patient.patientNumber}</p></div>
                <div><span className="text-slate-400">Attending doctor</span><p className="mt-1 font-bold text-slate-800">{selected.doctor.user?.name ?? '—'}</p></div>
                <div><span className="text-slate-400">Created</span><p className="mt-1 font-bold text-slate-800">{dateLabel(selected.createdAt)}</p></div>
              </div>
            )}

            {selectedId && detail.isLoading ? (
              <p className="py-8 text-center text-sm text-slate-400">Loading clinical record...</p>
            ) : (
              <>
                <div className="grid gap-5 lg:grid-cols-2">
                  <Field label="Chief complaint" value={form.chiefComplaint} onChange={(v) => updateField('chiefComplaint', v)} placeholder="Reason for today's visit" multiline />
                  <Field label="Clinical notes" value={form.clinicalNotes} onChange={(v) => updateField('clinicalNotes', v)} placeholder="History, symptoms and examination findings..." multiline rows={5} />
                  <Field label="Primary diagnosis" value={form.diagnosis} onChange={(v) => updateField('diagnosis', v)} placeholder="Primary clinical assessment" multiline />
                  <Field label="Treatment plan" value={form.treatmentPlan} onChange={(v) => updateField('treatmentPlan', v)} placeholder="Treatment, recommendations and follow-up..." multiline rows={5} />
                </div>

                <Field
                  label="Additional diagnoses"
                  value={form.diagnosesText}
                  onChange={(v) => updateField('diagnosesText', v)}
                  placeholder={'Enter one diagnosis per line'}
                  multiline
                  rows={3}
                />

                {!editable && !creating && selected && (
                  <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                    This record is finalized and locked against ordinary editing.
                  </p>
                )}

                {(create.isError || update.isError || finalize.isError) && (
                  <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage(create.error ?? update.error ?? finalize.error)}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                  <button type="button" onClick={closeWorkspace} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                  {creating && canCreate && (
                    <button
                      type="button"
                      disabled={!form.patientId || !form.doctorId || create.isPending}
                      onClick={() => create.mutate()}
                      className="rounded-xl bg-[#174d45] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {create.isPending ? 'Creating...' : 'Create draft'}
                    </button>
                  )}
                  {editable && (
                    <>
                      <button
                        type="button"
                        disabled={update.isPending}
                        onClick={() => update.mutate()}
                        className="rounded-xl border border-teal-800 px-5 py-3 text-sm font-bold text-teal-800 disabled:opacity-50"
                      >
                        {update.isPending ? 'Saving...' : 'Save changes'}
                      </button>
                      {canFinalize && (
                        <button
                          type="button"
                          disabled={finalize.isPending}
                          onClick={() => {
                            if (window.confirm('Finalize this consultation? Ordinary edits will be locked.')) finalize.mutate();
                          }}
                          className="rounded-xl bg-[#174d45] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                        >
                          {finalize.isPending ? 'Finalizing...' : 'Finalize record'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      )}

      <section className="consultations-history overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="font-display text-base font-extrabold text-slate-900">Consultation history</h2>
            <p className="mt-1 text-xs text-slate-400">Clinical records across this organization</p>
          </div>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-teal-700"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="FINALIZED">Finalized</option>
            <option value="AMENDED">Amended</option>
          </select>
        </div>

        {list.isLoading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading consultation history...</div>
        ) : list.isError ? (
          <div className="p-8 text-center text-sm text-rose-600">{errorMessage(list.error)}</div>
        ) : records.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-800">✚</div>
            <h3 className="mt-4 text-sm font-extrabold text-slate-800">No consultations yet</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-400">New clinical records will appear here after a consultation is created.</p>
            {canCreate && <button type="button" onClick={startNew} className="mt-5 text-xs font-bold text-teal-800 hover:underline">Start the first consultation</button>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Doctor</th>
                  <th className="px-6 py-4">Clinical summary</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="transition hover:bg-[#fbfcfa]">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{record.encounter.patient.firstName} {record.encounter.patient.lastName}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{record.encounter.patient.patientNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-semibold text-slate-700">{record.doctor.user?.name ?? '—'}</p>
                      <p className="mt-1 text-[10px] text-slate-400">{record.doctor.specialization ?? 'Medical practitioner'}</p>
                    </td>
                    <td className="max-w-[240px] px-6 py-4">
                      <p className="truncate text-xs text-slate-600">{record.chiefComplaint || record.diagnosis || 'No summary recorded'}</p>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{dateLabel(record.createdAt)}</td>
                    <td className="px-6 py-4"><Status value={record.consultationStatus} /></td>
                    <td className="px-6 py-4 text-right">
                      <button type="button" onClick={() => openRecord(record)} className="rounded-lg px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50">Open record →</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}