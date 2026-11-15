import { useMemo, useState } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, errorMessage } from '@/lib/api';
import { useAuth } from '@/stores/auth';

type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'VOIDED';

type InvoiceItem = {
  id?: string;
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number | string;
  total?: number | string;
  lineTotal?: number | string;
};

type Payment = {
  id: string;
  paymentReference?: string;
  amount: number | string;
  paymentMethod?: string;
  createdAt?: string;
  refunds?: Array<{
    id: string;
    amount: number | string;
    reason?: string;
    createdAt?: string;
  }>;
};

type Invoice = {
  id: string;
  invoiceNumber?: string;
  status: InvoiceStatus;
  patient?: {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    patientNumber?: string;
  };
  patientId?: string;
  issueDate?: string;
  issuedAt?: string;
  dueDate?: string;
  subtotal?: number | string;
  discountAmount?: number | string;
  taxAmount?: number | string;
  totalAmount?: number | string;
  total?: number | string;
  paidAmount?: number | string;
  balanceAmount?: number | string;
  balance?: number | string;
  items?: InvoiceItem[];
  payments?: Payment[];
  createdAt?: string;
};

type Patient = {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  patientNumber?: string;
};

type InvoiceDraftItem = {
  itemType: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

const STATUSES = [
  'ALL',
  'DRAFT',
  'ISSUED',
  'PARTIALLY_PAID',
  'PAID',
  'VOIDED',
] as const;

function rows<T>(response: any): T[] {
  const value = response?.data ?? response;

  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.results)) return value.results;
  if (Array.isArray(value?.data)) return value.data;

  return [];
}

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: unknown): string {
  return `Rs. ${amount(value).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function date(value?: string): string {
  if (!value) return '—';

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return '—';

  return parsed.toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function patientName(patient?: Patient | Invoice['patient']): string {
  if (!patient) return 'Unknown patient';

  if (patient.name) return patient.name;

  const fullName = [
    patient.firstName,
    patient.lastName,
  ].filter(Boolean).join(' ');

  return fullName || patient.patientNumber || 'Unknown patient';
}

function invoiceTotal(invoice: Invoice): number {
  return amount(invoice.totalAmount ?? invoice.total);
}

function invoicePaid(invoice: Invoice): number {
  if (invoice.paidAmount !== undefined) {
    return amount(invoice.paidAmount);
  }

  return (invoice.payments ?? []).reduce(
    (sum, payment) => sum + amount(payment.amount),
    0,
  );
}

function invoiceBalance(invoice: Invoice): number {
  if (invoice.balanceAmount !== undefined) {
    return amount(invoice.balanceAmount);
  }

  if (invoice.balance !== undefined) {
    return amount(invoice.balance);
  }

  return Math.max(0, invoiceTotal(invoice) - invoicePaid(invoice));
}

function statusLabel(status: InvoiceStatus): string {
  return {
    DRAFT: 'Draft',
    ISSUED: 'Issued',
    PARTIALLY_PAID: 'Partially paid',
    PAID: 'Paid',
    VOIDED: 'Voided',
  }[status];
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-600',
    ISSUED: 'bg-blue-50 text-blue-700',
    PARTIALLY_PAID: 'bg-amber-50 text-amber-700',
    PAID: 'bg-emerald-50 text-emerald-700',
    VOIDED: 'bg-rose-50 text-rose-700',
  };

  return (
    <span className={`mc-status-badge billing-status inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="billing-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="billing-modal-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const fieldClass =
  'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10';

const labelClass = 'block text-sm font-medium text-slate-700';

const primaryButton =
  'inline-flex items-center justify-center rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-not-allowed disabled:opacity-50';

const secondaryButton =
  'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export default function BillingPage() {
  const queryClient = useQueryClient();
  const { can } = useAuth();

  const canCreate = can('billing.create');
  const canRefund = can('billing.refund');

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [refundPayment, setRefundPayment] = useState<Payment | null>(null);

  const [patientId, setPatientId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [taxAmount, setTaxAmount] = useState('0');

  const [items, setItems] = useState<InvoiceDraftItem[]>([
    {
      itemType: 'SERVICE',
      description: '',
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  const [paymentReference, setPaymentReference] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  const [formError, setFormError] = useState('');

  const invoiceQuery = useQuery({
    queryKey: ['billing-invoices', statusFilter],
    queryFn: async () => {
      const response = await api.get('/billing/invoices', {
        params: {
          page: 1,
          limit: 100,
          ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        },
      });

      return rows<Invoice>(response.data);
    },
  });

  const patientQuery = useQuery({
    queryKey: ['billing-patients'],
    queryFn: async () => {
      const response = await api.get('/patients', {
        params: { page: 1, limit: 100, status: 'ACTIVE' },
      });

      return rows<Patient>(response.data);
    },
    enabled: showCreate,
  });

  const detailQuery = useQuery({
    queryKey: ['billing-invoice', selectedId],
    queryFn: async () => {
      const response = await api.get(`/billing/invoices/${selectedId}`);
      return (response.data?.data ?? response.data) as Invoice;
    },
    enabled: Boolean(selectedId),
  });

  const invoices = invoiceQuery.data ?? [];
  const selectedInvoice = detailQuery.data;

  const visibleInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return invoices;

    return invoices.filter((invoice) => {
      const name = patientName(invoice.patient).toLowerCase();
      const number = (invoice.invoiceNumber ?? '').toLowerCase();

      return name.includes(term) || number.includes(term);
    });
  }, [invoices, search]);

  const totals = useMemo(() => {
    return visibleInvoices.reduce(
      (result, invoice) => ({
        count: result.count + 1,
        billed: result.billed + invoiceTotal(invoice),
        collected: result.collected + invoicePaid(invoice),
        outstanding: result.outstanding + invoiceBalance(invoice),
      }),
      { count: 0, billed: 0, collected: 0, outstanding: 0 },
    );
  }, [visibleInvoices]);

  function refreshBilling(id?: string) {
    queryClient.invalidateQueries({ queryKey: ['billing-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['billing-payments'] });

    if (id) {
      queryClient.invalidateQueries({
        queryKey: ['billing-invoice', id],
      });
    }

    if (selectedId) {
      queryClient.invalidateQueries({
        queryKey: ['billing-invoice', selectedId],
      });
    }
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!patientId) throw new Error('Please select a patient.');

      const validItems = items.filter(
        (item) => item.description.trim() && item.quantity > 0 && item.unitPrice >= 0,
      );

      if (!validItems.length) {
        throw new Error('Add at least one valid invoice item.');
      }

      const response = await api.post('/billing/invoices', {
        patientId,
        ...(dueDate ? { dueDate } : {}),
        discountAmount: amount(discountAmount),
        taxAmount: amount(taxAmount),
        items: validItems,
      });

      return response.data?.data ?? response.data;
    },
    onSuccess: (created: Invoice) => {
      setShowCreate(false);
      setPatientId('');
      setDueDate('');
      setDiscountAmount('0');
      setTaxAmount('0');
      setItems([
        { itemType: 'SERVICE', description: '', quantity: 1, unitPrice: 0 },
      ]);

      refreshBilling(created?.id);
      if (created?.id) setSelectedId(created.id);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const issueMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/billing/invoices/${id}/issue`);
    },
    onSuccess: () => refreshBilling(selectedId ?? undefined),
    onError: (error) => setFormError(errorMessage(error)),
  });

  const voidMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/billing/invoices/${id}/void`);
    },
    onSuccess: () => refreshBilling(selectedId ?? undefined),
    onError: (error) => setFormError(errorMessage(error)),
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error('Select an invoice first.');

      const response = await api.post(
        `/billing/invoices/${selectedId}/payments`,
        {
          paymentReference: paymentReference.trim(),
          amount: amount(paymentAmount),
          paymentMethod,
        },
      );

      return response.data;
    },
    onSuccess: () => {
      setShowPayment(false);
      setPaymentReference('');
      setPaymentAmount('');
      setPaymentMethod('CASH');
      refreshBilling(selectedId ?? undefined);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  const refundMutation = useMutation({
    mutationFn: async () => {
      if (!refundPayment) throw new Error('Select a payment first.');

      await api.post(`/billing/payments/${refundPayment.id}/refunds`, {
        amount: amount(refundAmount),
        reason: refundReason.trim(),
      });
    },
    onSuccess: () => {
      setRefundPayment(null);
      setRefundAmount('');
      setRefundReason('');
      refreshBilling(selectedId ?? undefined);
    },
    onError: (error) => setFormError(errorMessage(error)),
  });

  function openCreate() {
    setFormError('');
    setShowCreate(true);
  }

  function openPayment() {
    setFormError('');
    setShowPayment(true);
  }

  function updateItem(
    index: number,
    field: keyof InvoiceDraftItem,
    value: string | number,
  ) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item,
      ),
    );
  }

  return (
    <div className="billing-enterprise space-y-6 pb-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
            Finance workspace
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Billing management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage patient invoices, payments and refunds.
          </p>
        </div>

        {canCreate && (
          <button type="button" onClick={openCreate} className={primaryButton}>
            <span className="mr-2 text-lg leading-none">+</span>
            Create invoice
          </button>
        )}
      </div>

      {formError && !showCreate && !showPayment && !refundPayment && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {formError}
          <button
            type="button"
            onClick={() => setFormError('')}
            className="ml-3 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="billing-overview grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Invoices shown"
          value={String(totals.count)}
          detail="Current list"
          icon="▤"
        />
        <SummaryCard
          label="Total billed"
          value={money(totals.billed)}
          detail="Visible invoices"
          icon="↗"
        />
        <SummaryCard
          label="Payments received"
          value={money(totals.collected)}
          detail="Visible invoices"
          icon="✓"
        />
        <SummaryCard
          label="Outstanding"
          value={money(totals.outstanding)}
          detail="Remaining balance"
          icon="◷"
          accent
        />
      </div>

      <section className="billing-register overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Invoices</h2>
            <p className="mt-1 text-xs text-slate-500">
              Review invoice status and outstanding balances.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice or patient..."
              className={`${fieldClass} mt-0 min-w-0 sm:w-64`}
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={`${fieldClass} mt-0 sm:w-48`}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All statuses' : statusLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {invoiceQuery.isLoading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading invoices...
          </div>
        ) : invoiceQuery.isError ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-rose-700">
              Unable to load invoices.
            </p>
            <button
              type="button"
              onClick={() => invoiceQuery.refetch()}
              className={`${secondaryButton} mt-4`}
            >
              Try again
            </button>
          </div>
        ) : visibleInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-xl text-teal-800">
              ▤
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              No invoices found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? 'Try a different search term.'
                : 'Invoices will appear here when they are created.'}
            </p>
            {canCreate && !search && (
              <button
                type="button"
                onClick={openCreate}
                className={`${primaryButton} mt-4`}
              >
                Create first invoice
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="billing-invoice-table w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">Invoice</th>
                  <th className="px-5 py-4 font-semibold">Patient</th>
                  <th className="px-5 py-4 font-semibold">Due date</th>
                  <th className="px-5 py-4 font-semibold">Total</th>
                  <th className="px-5 py-4 font-semibold">Paid</th>
                  <th className="px-5 py-4 font-semibold">Balance</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visibleInvoices.map((invoice) => (
                  <tr key={invoice.id} className="transition hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {invoice.invoiceNumber || invoice.id.slice(0, 10)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {date(invoice.issueDate ?? invoice.issuedAt ?? invoice.createdAt)}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">
                        {patientName(invoice.patient)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {invoice.patient?.patientNumber ?? 'Patient'}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {date(invoice.dueDate)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {money(invoiceTotal(invoice))}
                    </td>

                    <td className="px-5 py-4 text-emerald-700">
                      {money(invoicePaid(invoice))}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {money(invoiceBalance(invoice))}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={invoice.status} />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setFormError('');
                          setSelectedId(invoice.id);
                        }}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-50"
                      >
                        View details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-400">
          Showing up to 100 invoices from the current result set.
        </div>
      </section>

      {selectedId && (
        <Modal
          title="Invoice details"
          subtitle="Review charges, payment activity and invoice actions."
          onClose={() => {
            setSelectedId(null);
            setFormError('');
          }}
        >
          {detailQuery.isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">
              Loading invoice details...
            </div>
          ) : detailQuery.isError || !selectedInvoice ? (
            <div className="py-8 text-center">
              <p className="text-sm text-rose-700">
                Unable to load this invoice.
              </p>
              <button
                type="button"
                onClick={() => detailQuery.refetch()}
                className={`${secondaryButton} mt-4`}
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {formError}
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Invoice number
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {selectedInvoice.invoiceNumber || selectedInvoice.id}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {patientName(selectedInvoice.patient)}
                  </p>
                </div>
                <StatusBadge status={selectedInvoice.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <DetailMetric label="Invoice total" value={money(invoiceTotal(selectedInvoice))} />
                <DetailMetric label="Paid" value={money(invoicePaid(selectedInvoice))} />
                <DetailMetric label="Balance" value={money(invoiceBalance(selectedInvoice))} />
                <DetailMetric label="Issue date" value={date(selectedInvoice.issueDate ?? selectedInvoice.issuedAt)} />
                <DetailMetric label="Due date" value={date(selectedInvoice.dueDate)} />
                <DetailMetric label="Discount" value={money(selectedInvoice.discountAmount)} />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Invoice items
                </h3>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-xs text-slate-500">
                      <tr>
                        <th className="px-3 py-3 text-left">Description</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                        <th className="px-3 py-3 text-right">Unit price</th>
                        <th className="px-3 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedInvoice.items ?? []).map((item, index) => (
                        <tr key={item.id ?? index}>
                          <td className="px-3 py-3 text-slate-700">
                            {item.description}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-600">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-600">
                            {money(item.unitPrice)}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-slate-800">
                            {money(item.total ?? item.lineTotal ?? amount(item.quantity) * amount(item.unitPrice))}
                          </td>
                        </tr>
                      ))}
                      {(!selectedInvoice.items || selectedInvoice.items.length === 0) && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-400">
                            No item details returned.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-slate-900">
                  Payment history
                </h3>

                <div className="space-y-3">
                  {(selectedInvoice.payments ?? []).map((payment) => (
                    <div key={payment.id} className="billing-payment-card rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {money(payment.amount)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {payment.paymentMethod ?? 'Payment'} · {payment.paymentReference ?? 'No reference'}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {date(payment.createdAt)}
                          </p>
                        </div>

                        {canRefund && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormError('');
                              setRefundPayment(payment);
                            }}
                            className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Refund
                          </button>
                        )}
                      </div>

                      {(payment.refunds ?? []).length > 0 && (
                        <div className="mt-3 border-t border-slate-100 pt-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Refunds
                          </p>
                          {payment.refunds?.map((refund) => (
                            <div key={refund.id} className="flex justify-between gap-3 py-1 text-xs text-slate-600">
                              <span>{refund.reason || 'Refund'}</span>
                              <span className="font-semibold text-rose-700">
                                {money(refund.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {(!selectedInvoice.payments || selectedInvoice.payments.length === 0) && (
                    <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                      No payments recorded yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                {canCreate && selectedInvoice.status === 'DRAFT' && (
                  <button
                    type="button"
                    disabled={issueMutation.isPending}
                    onClick={() => {
                      if (window.confirm('Issue this invoice?')) {
                        setFormError('');
                        issueMutation.mutate(selectedInvoice.id);
                      }
                    }}
                    className={primaryButton}
                  >
                    {issueMutation.isPending ? 'Issuing...' : 'Issue invoice'}
                  </button>
                )}

                {canCreate &&
                  ['ISSUED', 'PARTIALLY_PAID'].includes(selectedInvoice.status) &&
                  invoicePaid(selectedInvoice) === 0 && (
                    <button
                      type="button"
                      disabled={voidMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Void this invoice?')) {
                          setFormError('');
                          voidMutation.mutate(selectedInvoice.id);
                        }
                      }}
                      className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {voidMutation.isPending ? 'Voiding...' : 'Void invoice'}
                    </button>
                  )}

                {canCreate &&
                  ['ISSUED', 'PARTIALLY_PAID'].includes(selectedInvoice.status) &&
                  invoiceBalance(selectedInvoice) > 0 && (
                    <button
                      type="button"
                      onClick={openPayment}
                      className={primaryButton}
                    >
                      Record payment
                    </button>
                  )}
              </div>
            </div>
          )}
        </Modal>
      )}

      {showCreate && (
        <Modal
          title="Create invoice"
          subtitle="Create a draft invoice for a registered patient."
          onClose={() => {
            setShowCreate(false);
            setFormError('');
          }}
        >
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError('');
              createMutation.mutate();
            }}
          >
            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className={labelClass}>Patient *</label>
              <select
                required
                value={patientId}
                onChange={(event) => setPatientId(event.target.value)}
                className={fieldClass}
              >
                <option value="">Select a patient</option>
                {(patientQuery.data ?? []).map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patientName(patient)}
                    {patient.patientNumber ? ` · ${patient.patientNumber}` : ''}
                  </option>
                ))}
              </select>
              {patientQuery.isLoading && (
                <p className="mt-1 text-xs text-slate-400">Loading patients...</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Due date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Discount (PKR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(event.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Tax amount (PKR)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={taxAmount}
                onChange={(event) => setTaxAmount(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Invoice items</h3>
                <button
                  type="button"
                  onClick={() => setItems((current) => [
                    ...current,
                    { itemType: 'SERVICE', description: '', quantity: 1, unitPrice: 0 },
                  ])}
                  className="text-xs font-semibold text-teal-800 hover:underline"
                >
                  + Add item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="billing-draft-item rounded-xl border border-slate-200 p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500">
                        Item {index + 1}
                      </p>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index),
                          )}
                          className="text-xs font-semibold text-rose-600 hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className={labelClass}>Description *</label>
                        <input
                          required
                          value={item.description}
                          onChange={(event) => updateItem(index, 'description', event.target.value)}
                          placeholder="e.g. Consultation fee"
                          className={fieldClass}
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Item type</label>
                        <select
                          value={item.itemType}
                          onChange={(event) => updateItem(index, 'itemType', event.target.value)}
                          className={fieldClass}
                        >
                          <option value="SERVICE">Service</option>
                          <option value="MEDICINE">Medicine</option>
                          <option value="LAB">Laboratory</option>
                          <option value="PROCEDURE">Procedure</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelClass}>Quantity</label>
                          <input
                            required
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(event) => updateItem(index, 'quantity', Number(event.target.value))}
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Unit price</label>
                          <input
                            required
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) => updateItem(index, 'unitPrice', Number(event.target.value))}
                            className={fieldClass}
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2 text-right text-sm font-semibold text-slate-700">
                        Line total: {money(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Items subtotal</span>
                <span>
                  {money(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0))}
                </span>
              </div>
              <div className="mt-2 flex justify-between text-sm text-slate-600">
                <span>Discount</span>
                <span>{money(discountAmount)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm text-slate-600">
                <span>Tax</span>
                <span>{money(taxAmount)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 font-bold text-slate-900">
                <span>Estimated total</span>
                <span>
                  {money(
                    Math.max(
                      0,
                      items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
                        - amount(discountAmount)
                        + amount(taxAmount),
                    ),
                  )}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className={primaryButton}
              >
                {createMutation.isPending ? 'Creating...' : 'Create draft invoice'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showPayment && selectedInvoice && (
        <Modal
          title="Record payment"
          subtitle={`Outstanding balance: ${money(invoiceBalance(selectedInvoice))}`}
          onClose={() => {
            setShowPayment(false);
            setFormError('');
          }}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError('');
              paymentMutation.mutate();
            }}
          >
            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className={labelClass}>Payment reference *</label>
              <input
                required
                value={paymentReference}
                onChange={(event) => setPaymentReference(event.target.value)}
                placeholder="Receipt or transaction reference"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Amount (PKR) *</label>
              <input
                required
                type="number"
                min="0.01"
                max={invoiceBalance(selectedInvoice)}
                step="0.01"
                value={paymentAmount}
                onChange={(event) => setPaymentAmount(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Payment method *</label>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className={fieldClass}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="ONLINE">Online</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={paymentMutation.isPending}
                className={primaryButton}
              >
                {paymentMutation.isPending ? 'Saving...' : 'Record payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {refundPayment && (
        <Modal
          title="Refund payment"
          subtitle={`Original payment: ${money(refundPayment.amount)}`}
          onClose={() => {
            setRefundPayment(null);
            setFormError('');
          }}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setFormError('');
              refundMutation.mutate();
            }}
          >
            {formError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                {formError}
              </div>
            )}

            <div>
              <label className={labelClass}>Refund amount (PKR) *</label>
              <input
                required
                type="number"
                min="0.01"
                max={amount(refundPayment.amount)}
                step="0.01"
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Reason *</label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={(event) => setRefundReason(event.target.value)}
                placeholder="Explain why this refund is being issued."
                className={fieldClass}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setRefundPayment(null)}
                className={secondaryButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refundMutation.isPending}
                className="inline-flex items-center justify-center rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
              >
                {refundMutation.isPending ? 'Processing...' : 'Submit refund'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: string;
  accent?: boolean;
}) {
  return (
    <div className="billing-summary-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${
          accent ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-800'
        }`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="billing-detail-metric rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
