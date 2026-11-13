import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface AuditLog {
  id: string;
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  resourceType?: string | null;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: unknown;
  timestamp: string;
}

interface AuditResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const PAGE_SIZE = 20;

function dateTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function dateOnly(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pretty(value: unknown) {
  if (value === null || value === undefined) return 'No additional metadata';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function label(value?: string | null) {
  if (!value) return 'Unknown';
  return value
    .replace(/[_-]/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function actionStyle(action: string) {
  const value = action.toLowerCase();

  if (value.includes('delete') || value.includes('remove') || value.includes('void')) {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  if (value.includes('create') || value.includes('login') || value.includes('issue')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (value.includes('update') || value.includes('edit')) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function Icon({
  name,
  size = 18,
}: {
  name: 'shield' | 'search' | 'refresh' | 'calendar' | 'chevron' | 'clock' | 'activity' | 'filter' | 'file' | 'lock';
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
    case 'shield':
      return <svg {...common}><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></svg>;
    case 'search':
      return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>;
    case 'refresh':
      return <svg {...common}><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>;
    case 'chevron':
      return <svg {...common}><path d="m9 18 6-6-6-6" /></svg>;
    case 'clock':
      return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
    case 'activity':
      return <svg {...common}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>;
    case 'filter':
      return <svg {...common}><path d="M4 5h16M7 12h10m-7 7h4" /></svg>;
    case 'file':
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8m-8 4h8" /></svg>;
    case 'lock':
      return <svg {...common}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3m-4 4v3" /></svg>;
  }
}

function Metric({
  label: title,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: 'activity' | 'clock' | 'file' | 'shield';
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
          <Icon name={icon} size={17} />
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [resourceFilter, setResourceFilter] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);

  const query = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: async (): Promise<AuditResponse> => {
      const response = await api.get('/audit-logs', {
        params: { page, limit: PAGE_SIZE },
      });
      return response.data;
    },
    placeholderData: (previous) => previous,
  });

  const records = query.data?.data ?? [];
  const pagination = query.data?.pagination;

  const actions = useMemo(
    () => [...new Set(records.map((item) => item.action).filter(Boolean))].sort(),
    [records],
  );

  const resources = useMemo(
    () => [...new Set(records.map((item) => item.resourceType).filter(Boolean) as string[])].sort(),
    [records],
  );

  const filtered = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    const start = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const end = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

    return records.filter((record) => {
      const searchable = [
        record.action,
        record.resourceType,
        record.resourceId,
        record.userId,
        record.ipAddress,
        record.requestId,
        record.userAgent,
        pretty(record.metadata),
      ].join(' ').toLowerCase();

      if (term && !searchable.includes(term)) return false;
      if (actionFilter !== 'ALL' && record.action !== actionFilter) return false;
      if (resourceFilter !== 'ALL' && record.resourceType !== resourceFilter) return false;

      const timestamp = dateOnly(record.timestamp);
      if (start && (!timestamp || timestamp < start)) return false;
      if (end && (!timestamp || timestamp > end)) return false;

      return true;
    });
  }, [records, deferredSearch, actionFilter, resourceFilter, fromDate, toDate]);

  const todayCount = records.filter((record) => {
    const date = dateOnly(record.timestamp);
    return date && date.toDateString() === new Date().toDateString();
  }).length;

  const resetFilters = () => {
    setSearch('');
    setActionFilter('ALL');
    setResourceFilter('ALL');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const totalPages = Math.max(1, pagination?.totalPages ?? 1);
  const total = pagination?.total ?? 0;

  return (
    <div className="space-y-6 pb-8">
      <section className="relative overflow-hidden rounded-2xl bg-[#142d35] px-6 py-7 text-white shadow-lg shadow-slate-900/10 sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-1 -top-12 h-44 w-44 rounded-full border border-white/10" />

        <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.17em] text-teal-300">
              <Icon name="shield" size={14} />
              Security & governance
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-[28px]" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Audit trail
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              A chronological record of activity within your organization workspace.
              Review events and inspect their technical context.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[.06] px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-400/10 text-teal-300">
              <Icon name="lock" size={18} />
            </span>
            <div>
              <p className="text-xs font-bold text-white">Read-only records</p>
              <p className="mt-1 text-[10px] text-slate-400">Immutable audit interface</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Total organization events" value={total.toLocaleString()} detail="Records reported by the server" icon="activity" />
        <Metric label="Events on this page today" value={String(todayCount)} detail="Today's events in the loaded page" icon="clock" />
        <Metric label="Loaded records" value={String(records.length)} detail={`Page ${pagination?.page ?? page} of ${totalPages}`} icon="file" />
        <Metric label="Access mode" value="Read only" detail="No edit or delete operations" icon="shield" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Activity records</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{total.toLocaleString()}</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Newest events appear first.</p>
          </div>

          <button
            type="button"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <span className={query.isFetching ? 'animate-spin' : ''}><Icon name="refresh" size={14} /></span>
            Refresh records
          </button>
        </div>

        <div className="space-y-4 border-b border-slate-100 bg-slate-50/60 p-4 sm:p-5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon name="search" size={17} />
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search action, resource, user ID, IP address or request ID..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Action</span>
              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-teal-500"
              >
                <option value="ALL">All actions on this page</option>
                {actions.map((action) => <option key={action} value={action}>{label(action)}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Resource type</span>
              <select
                value={resourceFilter}
                onChange={(event) => setResourceFilter(event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-teal-500"
              >
                <option value="ALL">All resource types on this page</option>
                {resources.map((resource) => <option key={resource} value={resource}>{label(resource)}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">From date</span>
              <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-teal-500" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">To date</span>
              <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-teal-500" />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">
              <Icon name="filter" size={12} /> Showing {filtered.length} matching records from the loaded page
            </p>
            <button type="button" onClick={resetFilters} className="text-[11px] font-semibold text-teal-700 hover:text-teal-900">
              Clear filters
            </button>
          </div>
        </div>

        {query.isPending ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-teal-600" />
            <p className="text-xs font-medium text-slate-500">Loading audit records...</p>
          </div>
        ) : query.isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Icon name="shield" size={22} />
            </span>
            <h3 className="mt-4 text-sm font-bold text-slate-900">Unable to load audit records</h3>
            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
              The request may have failed or your account may not have audit.view permission.
            </p>
            <button type="button" onClick={() => void query.refetch()} className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800">
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
              <Icon name="file" size={22} />
            </span>
            <h3 className="mt-4 text-sm font-bold text-slate-900">
              {records.length === 0 ? 'No audit events yet' : 'No matching records'}
            </h3>
            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
              {records.length === 0
                ? 'Activity will appear here as users perform actions in the workspace.'
                : 'Try adjusting your search or filters to find the event you need.'}
            </p>
            {records.length > 0 && (
              <button type="button" onClick={resetFilters} className="mt-3 text-xs font-semibold text-teal-700">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((record) => {
              const expanded = expandedId === record.id;

              return (
                <article key={record.id} className="transition hover:bg-slate-50/70">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : record.id)}
                    aria-expanded={expanded}
                    className="flex w-full flex-col gap-3 px-5 py-4 text-left sm:flex-row sm:items-center sm:px-6"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
                      <Icon name="activity" size={17} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${actionStyle(record.action)}`}>
                          {label(record.action)}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">{label(record.resourceType)}</span>
                      </span>
                      <span className="mt-1.5 block truncate text-xs font-semibold text-slate-800">
                        {record.resourceId ? `Resource ${record.resourceId}` : 'Organization activity'}
                      </span>
                      <span className="mt-1 block truncate text-[10px] text-slate-500">
                        User: {record.userId || 'System / unknown'}
                        {record.ipAddress ? ` · ${record.ipAddress}` : ''}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                      <span className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                        <Icon name="clock" size={13} />
                        {dateTime(record.timestamp)}
                      </span>
                      <span className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}>
                        <Icon name="chevron" size={16} />
                      </span>
                    </span>
                  </button>

                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {[
                          ['Event ID', record.id],
                          ['Organization ID', record.organizationId],
                          ['User ID', record.userId],
                          ['Action', record.action],
                          ['Resource type', record.resourceType],
                          ['Resource ID', record.resourceId],
                          ['IP address', record.ipAddress],
                          ['Request ID', record.requestId],
                          ['Timestamp', dateTime(record.timestamp)],
                        ].map(([title, value]) => (
                          <div key={title} className="min-w-0 rounded-xl border border-slate-200/80 bg-white p-3">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{title}</p>
                            <p className="mt-1.5 break-all text-xs font-medium text-slate-700">{value || '—'}</p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">User agent</p>
                        <p className="mt-2 break-all text-[11px] leading-5 text-slate-600">{record.userAgent || 'Not recorded'}</p>
                      </div>

                      <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 bg-[#172b33]">
                        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
                          <Icon name="file" size={14} />
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Event metadata</p>
                        </div>
                        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words p-4 text-[11px] leading-5 text-teal-100">{pretty(record.metadata)}</pre>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] text-slate-500">
            {total === 0 ? 'No records' : `Page ${pagination?.page ?? page} of ${totalPages} · ${total.toLocaleString()} total records`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || query.isFetching}
              onClick={() => {
                setPage((current) => Math.max(1, current - 1));
                setExpandedId(null);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="min-w-16 text-center text-xs font-bold tabular-nums text-slate-700">{page} / {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages || query.isFetching}
              onClick={() => {
                setPage((current) => Math.min(totalPages, current + 1));
                setExpandedId(null);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3">
        <span className="mt-0.5 text-amber-700"><Icon name="lock" size={15} /></span>
        <p className="text-[11px] leading-5 text-amber-900">
          <strong>Audit integrity:</strong> This interface is intentionally read-only. Filters operate on the current page of records; use pagination to inspect older events. Access is enforced by the server through the audit.view permission.
        </p>
      </div>
    </div>
  );
}
