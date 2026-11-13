import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

type LabStatus =
  | 'REQUESTED'
  | 'SAMPLE_COLLECTED'
  | 'PROCESSING'
  | 'RESULT_ENTERED'
  | 'VERIFIED'
  | 'CANCELLED';

type RecordStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

interface Patient {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface LabTest {
  id: string;
  code: string;
  name: string;
  price: number | string;
  referenceRange?: string | null;
  status: RecordStatus;
}

interface LabResult {
  id: string;
  value: string;
  unit?: string | null;
  enteredBy: string;
  verifiedBy?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

interface LabOrderItem {
  id: string;
  labOrderId: string;
  labTestId: string;
  test: LabTest;
  result?: LabResult | null;
}

interface LabOrder {
  id: string;
  requestNumber: string;
  patientId: string;
  requestedBy: string;
  status: LabStatus;
  createdAt: string;
  patient: Patient;
  items: LabOrderItem[];
}

interface Pagination {
  page: number;
  totalPages: number;
  total: number;
}

const statuses: LabStatus[] = [
  'REQUESTED',
  'SAMPLE_COLLECTED',
  'PROCESSING',
  'RESULT_ENTERED',
  'VERIFIED',
  'CANCELLED',
];

function unwrap<T>(payload: any): T {
  return (payload?.data ?? payload) as T;
}

function listFrom<T>(payload: any): T[] {
  const value = payload?.data ?? payload;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

function money(value: number | string) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function dateLabel(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function patientLabel(patient?: Patient) {
  if (!patient) return 'Unknown patient';
  return `${patient.firstName} ${patient.lastName}`.trim();
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
    SAMPLE_COLLECTED: 'bg-sky-50 text-sky-700 border-sky-200',
    PROCESSING: 'bg-violet-50 text-violet-700 border-violet-200',
    RESULT_ENTERED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
    SUSPENDED: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const label = status.replaceAll('_', ' ').toLowerCase();

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${styles[status] ?? styles.INACTIVE}`}>
      {label}
    </span>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.09em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10';

const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-[#174d45] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#103e37] disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export default function LaboratoryPage() {
  const { me, can } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'orders' | 'catalogue'>('orders');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showTestForm, setShowTestForm] = useState(false);

  const [patientId, setPatientId] = useState('');
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);
  const [testSearch, setTestSearch] = useState('');

  const [testCode, setTestCode] = useState('');
  const [testName, setTestName] = useState('');
  const [testPrice, setTestPrice] = useState('0');
  const [referenceRange, setReferenceRange] = useState('');

  const [resultValues, setResultValues] = useState<Record<string, string>>({});
  const [resultUnits, setResultUnits] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');

  const canViewOrders = can('lab.orders.view');
  const canViewTests = can('lab.tests.view');
  const canCreateOrders = can('lab.orders.create');
  const canManageTests = can('lab.tests.manage');
  const canCollect = can('lab.samples.collect');
  const canProcess = can('lab.orders.process');
  const canEnterResults = can('lab.results.enter');
  const canVerifyResults = can('lab.results.verify');

  const ordersQuery = useQuery({
    queryKey: ['laboratory-orders', me?.organization?.id, statusFilter],
    queryFn: async () => {
      const response = await api.get('/laboratory/orders', {
        params: {
          page: 1,
          limit: 100,
          ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        },
      });

      const payload = response.data;
      const data = listFrom<LabOrder>(payload);
      const pagination = payload?.pagination ?? payload?.data?.pagination;

      return {
        data,
        pagination: pagination as Pagination | undefined,
      };
    },
    enabled: canViewOrders,
  });

  const testsQuery = useQuery({
    queryKey: ['laboratory-tests', me?.organization?.id],
    queryFn: async () => {
      const response = await api.get('/laboratory/tests');
      return listFrom<LabTest>(response.data);
    },
    enabled: canViewTests,
  });

  const patientsQuery = useQuery({
    queryKey: ['laboratory-patients', me?.organization?.id],
    queryFn: async () => {
      const response = await api.get('/patients', {
        params: { page: 1, limit: 100 },
      });
      return listFrom<Patient>(response.data);
    },
    enabled: canCreateOrders,
  });

  const selectedOrderQuery = useQuery({
    queryKey: ['laboratory-order', selectedOrderId],
    queryFn: async () => {
      const response = await api.get(`/laboratory/orders/${selectedOrderId}`);
      return unwrap<LabOrder>(response.data);
    },
    enabled: Boolean(selectedOrderId) && canViewOrders,
  });

  const orders = ordersQuery.data?.data ?? [];
  const tests = testsQuery.data ?? [];
  const patients = patientsQuery.data ?? [];
  const selectedOrder = selectedOrderQuery.data;

  const activeTests = useMemo(
    () => tests.filter((test) => test.status === 'ACTIVE'),
    [tests],
  );

  const visibleTests = useMemo(() => {
    const term = testSearch.trim().toLowerCase();
    if (!term) return activeTests;
    return activeTests.filter(
      (test) =>
        test.name.toLowerCase().includes(term) ||
        test.code.toLowerCase().includes(term),
    );
  }, [activeTests, testSearch]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) =>
      [
        order.requestNumber,
        patientLabel(order.patient),
        order.patient?.patientNumber,
        ...order.items.map((item) => item.test?.name ?? ''),
      ]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  }, [orders, search]);

  const metrics = useMemo(() => ({
    total: orders.length,
    requested: orders.filter((order) => order.status === 'REQUESTED').length,
    processing: orders.filter((order) =>
      ['SAMPLE_COLLECTED', 'PROCESSING'].includes(order.status),
    ).length,
    completed: orders.filter((order) => order.status === 'VERIFIED').length,
  }), [orders]);

  const refreshLaboratory = async (orderId?: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['laboratory-orders'] }),
      queryClient.invalidateQueries({ queryKey: ['laboratory-tests'] }),
      ...(orderId
        ? [queryClient.invalidateQueries({ queryKey: ['laboratory-order', orderId] })]
        : []),
    ]);
  };

  const actionMutation = useMutation({
    mutationFn: async ({
      url,
      body,
    }: {
      url: string;
      body?: Record<string, unknown>;
    }) => {
      const response = await api.post(url, body ?? {});
      return response.data;
    },
    onSuccess: async (_data, variables) => {
      const orderId = variables.url.match(/\/orders\/([^/]+)/)?.[1];
      await refreshLaboratory(orderId);
      setNotice('Laboratory workflow updated successfully.');
    },
    onError: (error) => setNotice(errorMessage(error)),
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/laboratory/orders', {
        patientId,
        labTestIds: selectedTestIds,
      });
      return unwrap<LabOrder>(response.data);
    },
    onSuccess: async (order) => {
      await refreshLaboratory();
      setShowOrderForm(false);
      setPatientId('');
      setSelectedTestIds([]);
      setSelectedOrderId(order.id);
      setNotice('Laboratory order created successfully.');
    },
    onError: (error) => setNotice(errorMessage(error)),
  });

  const createTestMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/laboratory/tests', {
        code: testCode.trim(),
        name: testName.trim(),
        price: Number(testPrice),
        ...(referenceRange.trim()
          ? { referenceRange: referenceRange.trim() }
          : {}),
      });
      return response.data;
    },
    onSuccess: async () => {
      await refreshLaboratory();
      setShowTestForm(false);
      setTestCode('');
      setTestName('');
      setTestPrice('0');
      setReferenceRange('');
      setNotice('Laboratory test added to the catalogue.');
    },
    onError: (error) => setNotice(errorMessage(error)),
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: RecordStatus;
    }) => api.patch(`/laboratory/tests/${id}`, { status }),
    onSuccess: async () => {
      await refreshLaboratory();
      setNotice('Catalogue test status updated.');
    },
    onError: (error) => setNotice(errorMessage(error)),
  });

  const runAction = (url: string) => {
    setNotice('');
    actionMutation.mutate({ url });
  };

  const submitResult = (order: LabOrder, item: LabOrderItem) => {
    const value = resultValues[item.id]?.trim();
    const unit = resultUnits[item.id]?.trim();

    if (!value) {
      setNotice('Enter a result value before submitting.');
      return;
    }

    setNotice('');
    actionMutation.mutate({
      url: `/laboratory/orders/${order.id}/items/${item.id}/result`,
      body: { value, ...(unit ? { unit } : {}) },
    });
  };

  const toggleTest = (id: string) => {
    setSelectedTestIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const isBusy =
    actionMutation.isPending ||
    createOrderMutation.isPending ||
    createTestMutation.isPending ||
    updateTestMutation.isPending;

  if (!canViewOrders && !canViewTests) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">
          🔒
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900">Access unavailable</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your account does not have permission to access laboratory records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-teal-700">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
            Clinical operations
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Laboratory
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage diagnostic orders, sample collection, test processing and verified results.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canManageTests && activeTab === 'catalogue' && (
            <button className={primaryButton} onClick={() => setShowTestForm(true)}>
              <span className="text-base leading-none">+</span>
              Add laboratory test
            </button>
          )}
          {canCreateOrders && activeTab === 'orders' && (
            <button className={primaryButton} onClick={() => setShowOrderForm(true)}>
              <span className="text-base leading-none">+</span>
              New lab order
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice.toLowerCase().includes('success') ||
            notice.toLowerCase().includes('updated') ||
            notice.toLowerCase().includes('added')
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <span>{notice}</span>
          <button className="font-bold" onClick={() => setNotice('')} aria-label="Dismiss message">×</button>
        </div>
      )}

      {canViewOrders && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Metric label="Orders loaded" value={metrics.total} detail="Current order list" />
          <Metric label="Awaiting samples" value={metrics.requested} detail="Requested orders" />
          <Metric label="In progress" value={metrics.processing} detail="Collected or processing" />
          <Metric label="Verified" value={metrics.completed} detail="Completed results" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex gap-6">
          {canViewOrders && (
            <button
              onClick={() => setActiveTab('orders')}
              className={`relative pb-3 text-xs font-bold transition ${
                activeTab === 'orders' ? 'text-teal-800' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Laboratory orders
              {activeTab === 'orders' && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-700" />}
            </button>
          )}
          {canViewTests && (
            <button
              onClick={() => setActiveTab('catalogue')}
              className={`relative pb-3 text-xs font-bold transition ${
                activeTab === 'catalogue' ? 'text-teal-800' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Test catalogue
              {activeTab === 'catalogue' && <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-teal-700" />}
            </button>
          )}
        </div>
        <button
          className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-teal-800"
          onClick={() => {
            void refreshLaboratory(selectedOrderId || undefined);
          }}
        >
          <span>↻</span> Refresh data
        </button>
      </div>

      {activeTab === 'orders' && canViewOrders && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.78fr)]">
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Diagnostic orders</h2>
                <p className="mt-1 text-xs text-slate-500">Review and track laboratory requests</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search order or patient..."
                  className={`${inputClass} min-w-[190px] sm:w-56`}
                />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className={`${inputClass} sm:w-44`}
                >
                  <option value="ALL">All statuses</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            {ordersQuery.isLoading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading laboratory orders...</div>
            ) : ordersQuery.isError ? (
              <div className="p-8 text-center">
                <p className="text-sm font-semibold text-rose-700">Unable to load orders</p>
                <button className={`${secondaryButton} mt-3`} onClick={() => void ordersQuery.refetch()}>Try again</button>
              </div>
            ) : visibleOrders.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">⌕</div>
                <p className="mt-3 text-sm font-bold text-slate-800">No laboratory orders found</p>
                <p className="mt-1 text-xs text-slate-500">
                  {search ? 'Try another search term or status.' : 'New diagnostic requests will appear here.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`block w-full p-4 text-left transition hover:bg-slate-50/80 ${
                      selectedOrderId === order.id ? 'bg-teal-50/60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-slate-900">{order.requestNumber}</p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-700">{patientLabel(order.patient)}</p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {order.patient?.patientNumber ?? 'Patient'} · {dateLabel(order.createdAt)}
                        </p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500">
                        {order.items?.length ?? 0} test{order.items?.length === 1 ? '' : 's'}
                        {order.items?.length
                          ? ` · ${order.items.slice(0, 2).map((item) => item.test?.name).filter(Boolean).join(', ')}${order.items.length > 2 ? ' +' + (order.items.length - 2) : ''}`
                          : ''}
                      </p>
                      <span className="text-[11px] font-bold text-teal-800">View details →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {ordersQuery.data?.pagination && (
              <div className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">
                Showing up to 100 orders · {ordersQuery.data.pagination.total ?? orders.length} total
              </div>
            )}
          </section>

          <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {!selectedOrderId ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-800">⌁</div>
                <h3 className="mt-4 text-sm font-bold text-slate-900">Order details</h3>
                <p className="mt-1 max-w-[230px] text-xs leading-5 text-slate-500">
                  Select an order to review its tests, enter results and manage workflow actions.
                </p>
              </div>
            ) : selectedOrderQuery.isLoading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading order details...</div>
            ) : selectedOrderQuery.isError || !selectedOrder ? (
              <div className="p-8 text-center">
                <p className="text-sm text-rose-700">Unable to load this order.</p>
                <button className={`${secondaryButton} mt-3`} onClick={() => void selectedOrderQuery.refetch()}>Retry</button>
              </div>
            ) : (
              <div>
                <div className="border-b border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[.13em] text-slate-400">Order detail</p>
                      <h2 className="mt-1 break-all text-sm font-bold text-slate-900">{selectedOrder.requestNumber}</h2>
                    </div>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Patient</p>
                      <p className="mt-1 text-xs font-bold text-slate-800">{patientLabel(selectedOrder.patient)}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{selectedOrder.patient?.patientNumber}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Requested</p>
                      <p className="mt-1 text-xs font-bold text-slate-800">{dateLabel(selectedOrder.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-900">Ordered investigations</h3>
                      <span className="text-[10px] text-slate-400">{selectedOrder.items.length} tests</span>
                    </div>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800">{item.test.name}</p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {item.test.code} · {item.test.referenceRange ? `Reference: ${item.test.referenceRange}` : 'No reference range'}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold text-slate-500">
                              {money(item.test.price)}
                            </span>
                          </div>

                          {item.result ? (
                            <div className="mt-3 rounded-lg bg-slate-50 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Recorded result</p>
                                {item.result.verifiedAt ? (
                                  <StatusBadge status="VERIFIED" />
                                ) : (
                                  <StatusBadge status="RESULT_ENTERED" />
                                )}
                              </div>
                              <p className="mt-1 text-lg font-bold text-slate-900">
                                {item.result.value}
                                {item.result.unit ? <span className="ml-1 text-xs font-medium text-slate-500">{item.result.unit}</span> : null}
                              </p>
                              <p className="mt-1 text-[10px] text-slate-500">
                                Entered {dateLabel(item.result.createdAt)}
                              </p>
                              {item.result.verifiedAt && (
                                <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                                  Verified {dateLabel(item.result.verifiedAt)}
                                </p>
                              )}
                              {canVerifyResults && !item.result.verifiedAt && (
                                <button
                                  className={`${primaryButton} mt-3 w-full`}
                                  disabled={isBusy || item.result.enteredBy === me?.id}
                                  title={item.result.enteredBy === me?.id ? 'A different user must verify this result' : 'Verify result'}
                                  onClick={() => runAction(`/laboratory/results/${item.result!.id}/verify`)}
                                >
                                  {item.result.enteredBy === me?.id
                                    ? 'Independent verification required'
                                    : 'Verify result'}
                                </button>
                              )}
                            </div>
                          ) : (
                            canEnterResults && selectedOrder.status === 'PROCESSING' && (
                              <div className="mt-3 space-y-2">
                                <div className="grid grid-cols-[minmax(0,1fr)_100px] gap-2">
                                  <input
                                    value={resultValues[item.id] ?? ''}
                                    onChange={(event) => setResultValues((current) => ({ ...current, [item.id]: event.target.value }))}
                                    className={inputClass}
                                    placeholder="Result value"
                                    maxLength={4000}
                                  />
                                  <input
                                    value={resultUnits[item.id] ?? ''}
                                    onChange={(event) => setResultUnits((current) => ({ ...current, [item.id]: event.target.value }))}
                                    className={inputClass}
                                    placeholder="Unit"
                                    maxLength={80}
                                  />
                                </div>
                                <button
                                  className={`${primaryButton} w-full`}
                                  disabled={isBusy || !resultValues[item.id]?.trim()}
                                  onClick={() => submitResult(selectedOrder, item)}
                                >
                                  Record result
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="mb-3 text-xs font-bold text-slate-900">Workflow actions</h3>
                    <div className="grid gap-2">
                      {selectedOrder.status === 'REQUESTED' && canCollect && (
                        <button
                          className={primaryButton}
                          disabled={isBusy}
                          onClick={() => runAction(`/laboratory/orders/${selectedOrder.id}/collect-sample`)}
                        >
                          Record sample collection
                        </button>
                      )}
                      {selectedOrder.status === 'SAMPLE_COLLECTED' && canProcess && (
                        <button
                          className={primaryButton}
                          disabled={isBusy}
                          onClick={() => runAction(`/laboratory/orders/${selectedOrder.id}/start-processing`)}
                        >
                          Start laboratory processing
                        </button>
                      )}
                      {selectedOrder.status === 'PROCESSING' && canEnterResults && (
                        <p className="rounded-xl bg-violet-50 px-3 py-2.5 text-[11px] leading-5 text-violet-800">
                          Enter a result for each investigation above. The order advances automatically when all results have been recorded.
                        </p>
                      )}
                      {selectedOrder.status === 'RESULT_ENTERED' && (
                        <p className="rounded-xl bg-indigo-50 px-3 py-2.5 text-[11px] leading-5 text-indigo-800">
                          Results have been entered. Each result must be independently verified before the order is completed.
                        </p>
                      )}
                      {selectedOrder.status === 'VERIFIED' && (
                        <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[11px] font-semibold text-emerald-800">
                          All results have been verified. This order is complete.
                        </p>
                      )}
                      {selectedOrder.status === 'CANCELLED' && (
                        <p className="rounded-xl bg-slate-100 px-3 py-2.5 text-[11px] text-slate-600">
                          This order has been cancelled.
                        </p>
                      )}
                      {selectedOrder.status === 'REQUESTED' && !canCollect && (
                        <p className="text-[11px] text-slate-500">Waiting for an authorized laboratory technician to collect the sample.</p>
                      )}
                      {selectedOrder.status === 'SAMPLE_COLLECTED' && !canProcess && (
                        <p className="text-[11px] text-slate-500">Waiting for an authorized technician to start processing.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'catalogue' && canViewTests && (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Diagnostic test catalogue</h2>
              <p className="mt-1 text-xs text-slate-500">Organization-specific investigations and pricing</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold text-slate-600">
              {tests.length} catalogue entries
            </span>
          </div>

          {testsQuery.isLoading ? (
            <div className="p-10 text-center text-sm text-slate-500">Loading test catalogue...</div>
          ) : testsQuery.isError ? (
            <div className="p-8 text-center text-sm text-rose-700">Unable to load laboratory tests.</div>
          ) : tests.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-bold text-slate-800">No tests configured</p>
              <p className="mt-1 text-xs text-slate-500">Add diagnostic tests to begin creating laboratory orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-slate-50/80">
                  <tr className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">
                    <th className="px-5 py-3">Test</th>
                    <th className="px-5 py-3">Reference range</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Status</th>
                    {canManageTests && <th className="px-5 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tests.map((test) => (
                    <tr key={test.id} className="transition hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-slate-800">{test.name}</p>
                        <p className="mt-1 text-[10px] text-slate-400">{test.code}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">{test.referenceRange || '—'}</td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-700">{money(test.price)}</td>
                      <td className="px-5 py-4"><StatusBadge status={test.status} /></td>
                      {canManageTests && (
                        <td className="px-5 py-4 text-right">
                          <button
                            className="text-[11px] font-bold text-teal-800 hover:text-teal-950 disabled:opacity-50"
                            disabled={isBusy}
                            onClick={() => updateTestMutation.mutate({
                              id: test.id,
                              status: test.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                            })}
                          >
                            {test.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showOrderForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 sm:p-6" role="presentation">
          <div role="dialog" aria-modal="true" aria-labelledby="new-lab-order-title" className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="new-lab-order-title" className="text-base font-bold text-slate-900">Create laboratory order</h2>
                <p className="mt-1 text-xs text-slate-500">Select a patient and the investigations requested.</p>
              </div>
              <button onClick={() => setShowOrderForm(false)} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100" aria-label="Close">×</button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
              <Field label="Patient">
                <select className={inputClass} value={patientId} onChange={(event) => setPatientId(event.target.value)}>
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.patientNumber} — {patientLabel(patient)}
                    </option>
                  ))}
                </select>
              </Field>

              {patientsQuery.isLoading && <p className="text-xs text-slate-500">Loading patients...</p>}
              {patientsQuery.isError && <p className="text-xs text-rose-600">Could not load patients. Close and retry after refreshing.</p>}
              {!patientsQuery.isLoading && patients.length === 0 && (
                <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">No patients are available. Add a patient before creating an order.</p>
              )}

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.09em] text-slate-500">Investigations</p>
                    <p className="mt-1 text-[10px] text-slate-400">Choose one or more active tests (maximum 30).</p>
                  </div>
                  <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-800">{selectedTestIds.length} selected</span>
                </div>
                <input
                  className={inputClass}
                  value={testSearch}
                  onChange={(event) => setTestSearch(event.target.value)}
                  placeholder="Search test name or code..."
                />
                <div className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                  {testsQuery.isLoading ? (
                    <p className="p-4 text-xs text-slate-500">Loading tests...</p>
                  ) : visibleTests.length === 0 ? (
                    <p className="p-4 text-xs text-slate-500">No active tests found.</p>
                  ) : visibleTests.map((test) => {
                    const checked = selectedTestIds.includes(test.id);
                    return (
                      <label key={test.id} className="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-slate-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!checked && selectedTestIds.length >= 30}
                          onChange={() => toggleTest(test.id)}
                          className="h-4 w-4 rounded border-slate-300 accent-teal-800"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-slate-800">{test.name}</span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">{test.code}</span>
                        </span>
                        <span className="text-xs font-semibold text-slate-600">{money(test.price)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-[10px] text-slate-500">Orders are assigned to your account.</p>
              <div className="flex gap-2">
                <button className={secondaryButton} onClick={() => setShowOrderForm(false)}>Cancel</button>
                <button
                  className={primaryButton}
                  disabled={!patientId || selectedTestIds.length === 0 || createOrderMutation.isPending}
                  onClick={() => createOrderMutation.mutate()}
                >
                  {createOrderMutation.isPending ? 'Creating...' : 'Create order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTestForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 sm:p-6">
          <div role="dialog" aria-modal="true" aria-labelledby="new-lab-test-title" className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 id="new-lab-test-title" className="text-base font-bold text-slate-900">Add laboratory test</h2>
                <p className="mt-1 text-xs text-slate-500">Create a test in this organization’s catalogue.</p>
              </div>
              <button onClick={() => setShowTestForm(false)} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100" aria-label="Close">×</button>
            </div>
            <form
              className="space-y-4 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                createTestMutation.mutate();
              }}
            >
              <Field label="Test code">
                <input required maxLength={40} className={inputClass} value={testCode} onChange={(event) => setTestCode(event.target.value)} placeholder="e.g. CBC" />
              </Field>
              <Field label="Test name">
                <input required maxLength={160} className={inputClass} value={testName} onChange={(event) => setTestName(event.target.value)} placeholder="e.g. Complete Blood Count" />
              </Field>
              <Field label="Price">
                <input required type="number" min="0" max="9999999999.99" step="0.01" className={inputClass} value={testPrice} onChange={(event) => setTestPrice(event.target.value)} />
              </Field>
              <Field label="Reference range (optional)">
                <input maxLength={300} className={inputClass} value={referenceRange} onChange={(event) => setReferenceRange(event.target.value)} placeholder="e.g. 4.5–11.0 × 10⁹/L" />
              </Field>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button type="button" className={secondaryButton} onClick={() => setShowTestForm(false)}>Cancel</button>
                <button type="submit" className={primaryButton} disabled={!testCode.trim() || !testName.trim() || Number(testPrice) < 0 || createTestMutation.isPending}>
                  {createTestMutation.isPending ? 'Saving...' : 'Save test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}