import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

type PrescriptionStatus = 'DRAFT' | 'ISSUED' | 'DISPENSED' | 'VOIDED';

type Patient = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
};

type Doctor = {
  id: string;
  user?: { id?: string; name?: string };
  department?: { name?: string };
};

type Medicine = {
  id: string;
  name: string;
  genericName?: string | null;
  category?: string | null;
  unit?: string | null;
  unitPrice?: number | string;
};

type Consultation = {
  id: string;
  consultationStatus: string;
  createdAt: string;
  encounter: { patient: Patient };
  doctor: Doctor;
};

type PrescriptionItem = {
  id?: string;
  medicineId: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  notes?: string | null;
  medicine: Medicine;
};

type Prescription = {
  id: string;
  prescriptionNumber: string;
  patientId: string;
  consultationId: string;
  doctorId: string;
  instructions?: string | null;
  status: PrescriptionStatus;
  issuedAt?: string | null;
  createdAt: string;
  consultation: Consultation;
  doctor: Doctor;
  items: PrescriptionItem[];
};

type PageResult<T> = {
  data: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ItemForm = {
  medicineId: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  quantity: number;
  notes: string;
};

type FormState = {
  consultationId: string;
  instructions: string;
  items: ItemForm[];
};

const emptyItem: ItemForm = {
  medicineId: '',
  dosage: '',
  frequency: '',
  durationDays: 7,
  quantity: 1,
  notes: '',
};

const emptyForm: FormState = {
  consultationId: '',
  instructions: '',
  items: [{ ...emptyItem }],
};

function rows<T>(payload: any): T[] {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function dateLabel(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function patientName(patient?: Patient) {
  if (!patient) return 'Unknown patient';
  return `${patient.firstName} ${patient.lastName}`.trim();
}

function Status({ value }: { value: PrescriptionStatus }) {
  const styles: Record<PrescriptionStatus, string> = {
    DRAFT: 'bg-amber-50 text-amber-700 ring-amber-200',
    ISSUED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    DISPENSED: 'bg-blue-50 text-blue-700 ring-blue-200',
    VOIDED: 'bg-rose-50 text-rose-700 ring-rose-200',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[.1em] ring-1 ${styles[value]}`}>
      {value.toLowerCase()}
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold tracking-wide text-slate-600">
        {label}
      </span>
      <input
        type={type}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
      />
    </label>
  );
}

export default function PrescriptionsPage() {
  const { me, can } = useAuth();
  const qc = useQueryClient();

  const canCreate = can('prescriptions.create');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [notice, setNotice] = useState('');

  const list = useQuery({
    queryKey: ['prescriptions', me?.organization?.id, statusFilter],
    queryFn: async (): Promise<PageResult<Prescription>> => {
      const response = await api.get('/prescriptions', {
        params: {
          page: 1,
          limit: 100,
          status: statusFilter || undefined,
        },
      });

      return response.data;
    },
  });

  const records = useMemo(
    () => rows<Prescription>(list.data),
    [list.data],
  );

  const medicines = useQuery({
    queryKey: ['prescription-medicines', me?.organization?.id],
    enabled: creating || editing,
    queryFn: async () => {
      const response = await api.get('/prescriptions/medicines');
      return rows<Medicine>(response.data);
    },
  });

  const consultations = useQuery({
    queryKey: ['prescription-consultations', me?.organization?.id],
    enabled: creating,
    queryFn: async () => {
      const response = await api.get('/consultations', {
        params: {
          page: 1,
          limit: 100,
          status: 'FINALIZED',
        },
      });

      return rows<Consultation>(response.data);
    },
  });

  const detail = useQuery({
    queryKey: ['prescription', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => {
      const response = await api.get(`/prescriptions/${selectedId}`);
      return response.data.data as Prescription;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        consultationId: form.consultationId,
        instructions: form.instructions.trim() || undefined,
        items: form.items.map((item) => ({
          medicineId: item.medicineId,
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          durationDays: Number(item.durationDays),
          quantity: Number(item.quantity),
          notes: item.notes.trim() || undefined,
        })),
      };

      const response = await api.post('/prescriptions', payload);
      return response.data.data as Prescription;
    },
    onSuccess: async (prescription) => {
      await qc.invalidateQueries({ queryKey: ['prescriptions'] });

      setCreating(false);
      setEditing(false);
      setForm(emptyForm);
      setSelectedId(prescription.id);
      setNotice('Prescription draft created successfully.');
    },
  });

  const update = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No prescription selected');

      const payload = {
        instructions: form.instructions.trim() || null,
        items: form.items.map((item) => ({
          medicineId: item.medicineId,
          dosage: item.dosage.trim(),
          frequency: item.frequency.trim(),
          durationDays: Number(item.durationDays),
          quantity: Number(item.quantity),
          notes: item.notes.trim() || undefined,
        })),
      };

      const response = await api.patch(`/prescriptions/${selectedId}`, payload);
      return response.data.data as Prescription;
    },
    onSuccess: async (prescription) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['prescriptions'] }),
        qc.invalidateQueries({ queryKey: ['prescription', prescription.id] }),
      ]);

      setEditing(false);
      setNotice('Draft prescription updated successfully.');
    },
  });

  const issue = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('No prescription selected');

      const response = await api.post(`/prescriptions/${selectedId}/issue`);
      return response.data.data as Prescription;
    },
    onSuccess: async (prescription) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['prescriptions'] }),
        qc.invalidateQueries({ queryKey: ['prescription', prescription.id] }),
      ]);

      setNotice('Prescription issued successfully.');
    },
  });

  const selected = detail.data;

  function closeWorkspace() {
    setSelectedId(null);
    setCreating(false);
    setEditing(false);
    setForm(emptyForm);
    setNotice('');
  }

  function startNew() {
    setSelectedId(null);
    setForm({
      ...emptyForm,
      items: [{ ...emptyItem }],
    });
    setCreating(true);
    setEditing(false);
    setNotice('');
  }

  function openRecord(record: Prescription) {
    setCreating(false);
    setEditing(false);
    setSelectedId(record.id);
    setNotice('');
  }

  function startEditing() {
    if (!selected || selected.status !== 'DRAFT') return;

    setForm({
      consultationId: selected.consultationId,
      instructions: selected.instructions ?? '',
      items: selected.items.map((item) => ({
        medicineId: item.medicineId,
        dosage: item.dosage,
        frequency: item.frequency,
        durationDays: item.durationDays,
        quantity: item.quantity,
        notes: item.notes ?? '',
      })),
    });

    setEditing(true);
  }

  function updateItem(index: number, key: keyof ItemForm, value: string) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]:
                key === 'durationDays' || key === 'quantity'
                  ? Number(value)
                  : value,
            }
          : item,
      ),
    }));
  }

  function addItem() {
    if (form.items.length >= 50) return;

    setForm((current) => ({
      ...current,
      items: [...current.items, { ...emptyItem }],
    }));
  }

  function removeItem(index: number) {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  const formReady =
    Boolean(form.consultationId) &&
    form.items.length > 0 &&
    form.items.every(
      (item) =>
        Boolean(item.medicineId) &&
        Boolean(item.dosage.trim()) &&
        Boolean(item.frequency.trim()) &&
        item.durationDays >= 1 &&
        item.durationDays <= 365 &&
        item.quantity >= 1 &&
        item.quantity <= 100000,
    );

  const total = list.data?.pagination?.total ?? records.length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-7 pb-10">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-teal-700">
            Clinical operations / medication
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
            Prescriptions
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Medication orders, dosage instructions and prescription history in one clinical workspace.
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#174d45] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-950/10 transition hover:bg-[#103e37]"
          >
            <span className="text-lg leading-none">+</span>
            New prescription
          </button>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Total prescriptions</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
            {total}
          </p>
          <p className="mt-1 text-xs text-slate-400">Records matching current filter</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Draft prescriptions</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-amber-700">
            {records.filter((item) => item.status === 'DRAFT').length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Awaiting clinical issue</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">Issued prescriptions</p>
          <p className="mt-3 text-3xl font-extrabold tracking-tight text-emerald-700">
            {records.filter((item) => item.status === 'ISSUED').length}
          </p>
          <p className="mt-1 text-xs text-slate-400">Issued medication orders</p>
        </div>
      </section>

      {notice && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice('')}
            className="text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {(creating || selectedId) && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-[#fbfcfa] px-6 py-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-teal-700">
                {creating ? 'New medication order' : editing ? 'Draft editor' : 'Prescription record'}
              </p>
              <h2 className="mt-1 text-lg font-extrabold text-slate-900">
                {creating
                  ? 'Compose prescription'
                  : selected?.prescriptionNumber ?? 'Loading prescription...'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {selected && <Status value={selected.status} />}
              <button
                type="button"
                onClick={closeWorkspace}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="space-y-6 p-6">
            {(creating || editing) && (
              <>
                {creating ? (
                  <label className="block max-w-2xl">
                    <span className="mb-2 block text-xs font-bold text-slate-600">
                      Finalized consultation
                    </span>
                    <select
                      value={form.consultationId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          consultationId: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-teal-700"
                    >
                      <option value="">Select a finalized consultation</option>
                      {(consultations.data ?? []).map((consultation) => (
                        <option key={consultation.id} value={consultation.id}>
                          {patientName(consultation.encounter.patient)} · {consultation.encounter.patient.patientNumber} · {dateLabel(consultation.createdAt)}
                        </option>
                      ))}
                    </select>
                    {consultations.isLoading && (
                      <span className="mt-2 block text-xs text-slate-400">
                        Loading finalized consultations...
                      </span>
                    )}
                    {!consultations.isLoading && consultations.data?.length === 0 && (
                      <span className="mt-2 block text-xs text-amber-700">
                        No finalized consultations are available for prescription creation.
                      </span>
                    )}
                  </label>
                ) : selected && (
                  <div className="rounded-xl bg-slate-50 p-4 text-xs">
                    <span className="text-slate-400">Linked consultation</span>
                    <p className="mt-1 font-bold text-slate-800">
                      {patientName(selected.consultation.encounter.patient)}
                    </p>
                    <p className="mt-1 text-slate-500">
                      {selected.consultation.encounter.patient.patientNumber} · {selected.prescriptionNumber}
                    </p>
                  </div>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-bold text-slate-600">
                    General instructions
                  </span>
                  <textarea
                    rows={3}
                    maxLength={4000}
                    value={form.instructions}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        instructions: event.target.value,
                      }))
                    }
                    placeholder="Additional instructions for the patient..."
                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-teal-700 focus:ring-4 focus:ring-teal-700/10"
                  />
                </label>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Medication items
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      Add medicines, dosage, frequency and duration.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={form.items.length >= 50}
                    onClick={addItem}
                    className="rounded-lg border border-teal-800/20 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50 disabled:opacity-40"
                  >
                    + Add medicine
                  </button>
                </div>

                {medicines.isLoading ? (
                  <p className="py-5 text-center text-sm text-slate-400">
                    Loading medicine catalogue...
                  </p>
                ) : medicines.isError ? (
                  <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                    {errorMessage(medicines.error)}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {form.items.map((item, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-200 bg-[#fdfefd] p-4 sm:p-5"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-xs font-extrabold text-slate-700">
                            Medicine {index + 1}
                          </p>
                          {form.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="text-xs font-bold text-rose-600 hover:underline"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block md:col-span-2">
                            <span className="mb-2 block text-xs font-bold text-slate-600">
                              Medicine
                            </span>
                            <select
                              value={item.medicineId}
                              onChange={(event) =>
                                updateItem(index, 'medicineId', event.target.value)
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-teal-700"
                            >
                              <option value="">Select medicine</option>
                              {(medicines.data ?? []).map((medicine) => (
                                <option key={medicine.id} value={medicine.id}>
                                  {medicine.name}
                                  {medicine.genericName ? ` · ${medicine.genericName}` : ''}
                                  {medicine.unit ? ` (${medicine.unit})` : ''}
                                </option>
                              ))}
                            </select>
                          </label>

                          <Field
                            label="Dosage"
                            value={item.dosage}
                            onChange={(value) => updateItem(index, 'dosage', value)}
                            placeholder="e.g. 500 mg"
                          />

                          <Field
                            label="Frequency"
                            value={item.frequency}
                            onChange={(value) => updateItem(index, 'frequency', value)}
                            placeholder="e.g. Twice daily"
                          />

                          <Field
                            label="Duration (days)"
                            type="number"
                            min={1}
                            max={365}
                            value={item.durationDays}
                            onChange={(value) => updateItem(index, 'durationDays', value)}
                          />

                          <Field
                            label="Quantity"
                            type="number"
                            min={1}
                            max={100000}
                            value={item.quantity}
                            onChange={(value) => updateItem(index, 'quantity', value)}
                          />

                          <div className="md:col-span-2">
                            <Field
                              label="Item notes (optional)"
                              value={item.notes}
                              onChange={(value) => updateItem(index, 'notes', value)}
                              placeholder="Additional medicine-specific notes"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(create.isError || update.isError) && (
                  <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {errorMessage(create.error ?? update.error)}
                  </p>
                )}

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={closeWorkspace}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={!formReady || create.isPending || update.isPending || medicines.isLoading}
                    onClick={() => creating ? create.mutate() : update.mutate()}
                    className="rounded-xl bg-[#174d45] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {create.isPending || update.isPending
                      ? 'Saving...'
                      : creating
                        ? 'Create draft'
                        : 'Save changes'}
                  </button>
                </div>
              </>
            )}

            {!creating && !editing && (
              <>
                {detail.isLoading ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    Loading prescription details...
                  </p>
                ) : detail.isError ? (
                  <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                    {errorMessage(detail.error)}
                  </p>
                ) : selected ? (
                  <>
                    <div className="grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Patient
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-800">
                          {patientName(selected.consultation.encounter.patient)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {selected.consultation.encounter.patient.patientNumber}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Prescribing doctor
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-800">
                          {selected.doctor.user?.name ?? 'Medical practitioner'}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Created
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-800">
                          {dateLabel(selected.createdAt)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Issued
                        </p>
                        <p className="mt-2 text-sm font-bold text-slate-800">
                          {dateLabel(selected.issuedAt)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-900">
                            Prescribed medication
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            {selected.items.length} medication item(s)
                          </p>
                        </div>

                        {canCreate && selected.status === 'DRAFT' && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={startEditing}
                              className="rounded-lg border border-teal-800/20 px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50"
                            >
                              Edit draft
                            </button>

                            <button
                              type="button"
                              disabled={issue.isPending}
                              onClick={() => {
                                if (window.confirm('Issue this prescription? This will lock the draft.')) {
                                  issue.mutate();
                                }
                              }}
                              className="rounded-lg bg-[#174d45] px-3 py-2 text-xs font-bold text-white hover:bg-[#103e37] disabled:opacity-50"
                            >
                              {issue.isPending ? 'Issuing...' : 'Issue prescription'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[700px] text-left">
                          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            <tr>
                              <th className="px-4 py-3">Medicine</th>
                              <th className="px-4 py-3">Dosage</th>
                              <th className="px-4 py-3">Frequency</th>
                              <th className="px-4 py-3">Duration</th>
                              <th className="px-4 py-3">Quantity</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selected.items.map((item, index) => (
                              <tr key={item.id ?? `${item.medicineId}-${index}`}>
                                <td className="px-4 py-4">
                                  <p className="text-xs font-bold text-slate-800">
                                    {item.medicine.name}
                                  </p>
                                  {item.medicine.genericName && (
                                    <p className="mt-1 text-[10px] text-slate-400">
                                      {item.medicine.genericName}
                                    </p>
                                  )}
                                  {item.notes && (
                                    <p className="mt-1 text-[10px] text-slate-500">
                                      {item.notes}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-4 text-xs text-slate-600">{item.dosage}</td>
                                <td className="px-4 py-4 text-xs text-slate-600">{item.frequency}</td>
                                <td className="px-4 py-4 text-xs text-slate-600">{item.durationDays} days</td>
                                <td className="px-4 py-4 text-xs font-semibold text-slate-700">{item.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {selected.instructions && (
                      <div className="rounded-xl border border-slate-200 p-5">
                        <p className="text-xs font-bold text-slate-600">
                          General instructions
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {selected.instructions}
                        </p>
                      </div>
                    )}

                    {issue.isError && (
                      <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
                        {errorMessage(issue.error)}
                      </p>
                    )}
                  </>
                ) : null}
              </>
            )}
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="font-display text-base font-extrabold text-slate-900">
              Prescription register
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Medication orders across this organization
            </p>
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 outline-none focus:border-teal-700"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="DISPENSED">Dispensed</option>
            <option value="VOIDED">Voided</option>
          </select>
        </div>

        {list.isLoading ? (
          <div className="p-10 text-center text-sm text-slate-400">
            Loading prescription register...
          </div>
        ) : list.isError ? (
          <div className="p-8 text-center text-sm text-rose-600">
            {errorMessage(list.error)}
          </div>
        ) : records.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-800">
              +
            </div>
            <h3 className="mt-4 text-sm font-extrabold text-slate-800">
              No prescriptions found
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-slate-400">
              Prescriptions created from finalized consultations will appear here.
            </p>
            {canCreate && (
              <button
                type="button"
                onClick={startNew}
                className="mt-5 text-xs font-bold text-teal-800 hover:underline"
              >
                Create the first prescription
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400">
                <tr>
                  <th className="px-6 py-4">Prescription</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Doctor</th>
                  <th className="px-6 py-4">Medicines</th>
                  <th className="px-6 py-4">Created</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Record</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="transition hover:bg-[#fbfcfa]">
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-slate-800">
                        {record.prescriptionNumber}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {record.id.slice(-8)}
                      </p>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">
                        {patientName(record.consultation?.encounter?.patient)}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {record.consultation?.encounter?.patient?.patientNumber ?? '—'}
                      </p>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      {record.doctor?.user?.name ?? 'Medical practitioner'}
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-600">
                      {record.items?.length ?? 0} item(s)
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-500">
                      {dateLabel(record.createdAt)}
                    </td>

                    <td className="px-6 py-4">
                      <Status value={record.status} />
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openRecord(record)}
                        className="rounded-lg px-3 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50"
                      >
                        Open record →
                      </button>
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
