'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Search, RefreshCw, Download, Activity, Database, User, AlertTriangle } from 'lucide-react'
import { PageHeader, StatCard, EmptyState } from '@/components/system'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { auditApi } from '@/lib/api/endpoints'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { dateTime, timeAgo } from '@/lib/format'
import { toast } from 'sonner'
import type { AuditLog } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  AuditPage — immutable activity trail
//  Shows every CREATE / UPDATE / DELETE / POST / CONFIRM / ADJUST
//  action taken across the system, with full filtering & export.
// ═══════════════════════════════════════════════════════════════

const ACTIONS = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'POST', 'CONFIRM', 'ADJUST', 'LOGIN', 'LOGOUT'] as const
const ENTITIES = ['ALL', 'Product', 'Customer', 'Supplier', 'Warehouse', 'Vehicle', 'TransportVendor', 'CourierVendor', 'PurchaseOrder', 'SalesOrder', 'Dispatch', 'Stock', 'Movement', 'User', 'Role', 'GRN', 'POD'] as const
const DAY_RANGES = [
  { label: 'All time', value: 0 },
  { label: 'Today', value: 1 },
  { label: 'Last 7 days', value: 7 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 90 days', value: 90 },
]

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
  DELETE: 'bg-rose-100 text-rose-700 border-rose-200',
  POST: 'bg-violet-100 text-violet-700 border-violet-200',
  CONFIRM: 'bg-amber-100 text-amber-700 border-amber-200',
  ADJUST: 'bg-orange-100 text-orange-700 border-orange-200',
  LOGIN: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  LOGOUT: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function AuditPage() {
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<string>('ALL')
  const [entity, setEntity] = useState<string>('ALL')
  const [days, setDays] = useState<number>(0)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', debouncedSearch, action, entity, days],
    queryFn: () => auditApi.list({
      search: debouncedSearch || undefined,
      action: action !== 'ALL' ? action : undefined,
      entity: entity !== 'ALL' ? entity : undefined,
      days,
      limit: 1000,
    }),
    staleTime: 10_000,
  })

  const logs = data?.logs ?? []
  const total = data?.total ?? 0

  // ─── Stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayCount = logs.filter(l => new Date(l.createdAt) >= today).length
    const deleteCount = logs.filter(l => l.action === 'DELETE').length
    const createCount = logs.filter(l => l.action === 'CREATE').length
    const uniqueUsers = new Set(logs.map(l => l.userName).filter(Boolean)).size
    return { todayCount, deleteCount, createCount, uniqueUsers }
  }, [logs])

  // ─── Exports ───────────────────────────────────────────────────
  const buildExportRows = () => logs.map(l => ({
    Date: dateTime(l.createdAt),
    Action: l.action,
    Entity: l.entity,
    EntityId: l.entityId || '',
    User: l.userName || '',
    Details: l.details || '',
  }))

  const handleExportCsv = () => {
    if (!logs.length) { toast.info('No logs to export'); return }
    const rows = buildExportRows()
    const csv = generateCSV(rows)
    downloadCSV(`audit-log-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    toast.success(`Exported ${rows.length} log entries to CSV`)
  }

  const handleExportExcel = () => {
    if (!logs.length) { toast.info('No logs to export'); return }
    const rows = buildExportRows()
    const columns = Object.keys(rows[0])
    const headers = columns.join('</th><th>')
    const rowsHtml = rows.map(row =>
      '<tr>' + columns.map(col => `<td>${String(row[col] ?? '').replace(/</g, '&lt;')}</td>`).join('') + '</tr>'
    ).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr><th>${headers}</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${rows.length} log entries to Excel`)
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-5">
      <PageHeader
        title="Audit Log"
        description="Immutable activity trail — every action across the system"
        icon={ClipboardList}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Excel
            </Button>
          </div>
        }
      />

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Today's Activity"
          value={stats.todayCount}
          icon={Activity}
          tone="info"
        />
        <StatCard
          label="Creates (filtered)"
          value={stats.createCount}
          icon={Database}
          tone="success"
        />
        <StatCard
          label="Deletes (filtered)"
          value={stats.deleteCount}
          icon={AlertTriangle}
          tone="destructive"
        />
        <StatCard
          label="Active Users"
          value={stats.uniqueUsers}
          icon={User}
          tone="warning"
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by details, entity, user, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              {ACTIONS.map(a => <SelectItem key={a} value={a}>{a === 'ALL' ? 'All actions' : a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={entity} onValueChange={setEntity}>
            <SelectTrigger><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              {ENTITIES.map(e => <SelectItem key={e} value={e}>{e === 'ALL' ? 'All entities' : e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground mr-1">Time range:</span>
          {DAY_RANGES.map(r => (
            <Button
              key={r.value}
              size="sm"
              variant={days === r.value ? 'default' : 'outline'}
              onClick={() => setDays(r.value)}
              className="h-7 text-xs"
            >
              {r.label}
            </Button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{logs.length}</span> of <span className="font-semibold text-foreground">{total}</span> entries
          </span>
        </div>
      </div>

      {/* ── Log table ──────────────────────────────────────────── */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Loading audit trail…</div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-600">Failed to load audit logs. Please retry.</div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No audit entries found"
            description="Try adjusting filters, or perform an action in any module — every create, update, and delete is recorded here."
          />
        ) : (
          <ScrollArea className="h-[calc(100dvh-22rem)]">
            <div className="min-w-[900px]">
              {/* Header */}
              <div className="grid grid-cols-[160px_110px_140px_1fr_180px_140px] gap-3 px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold bg-muted/50 border-b sticky top-0 z-10">
                <div>When</div>
                <div>Action</div>
                <div>Entity</div>
                <div>Details</div>
                <div>User</div>
                <div>Entity ID</div>
              </div>
              {/* Rows */}
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="grid grid-cols-[160px_110px_140px_1fr_180px_140px] gap-3 px-4 py-2.5 text-sm border-b last:border-b-0 hover:bg-muted/30 transition-colors items-center"
                >
                  <div className="text-xs">
                    <div className="font-medium text-foreground">{timeAgo(log.createdAt)}</div>
                    <div className="text-muted-foreground text-[10px]">{dateTime(log.createdAt)}</div>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${ACTION_STYLES[log.action] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {log.action}
                    </span>
                  </div>
                  <div className="text-xs font-medium text-foreground truncate">{log.entity}</div>
                  <div className="text-xs text-muted-foreground truncate" title={log.details || ''}>
                    {log.details || <span className="text-muted-foreground/50">—</span>}
                  </div>
                  <div className="text-xs">
                    {log.userName ? (
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold flex items-center justify-center">
                          {log.userName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="truncate">{log.userName}</span>
                      </div>
                    ) : <span className="text-muted-foreground/50">System</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate" title={log.entityId || ''}>
                    {log.entityId ? log.entityId.slice(-8) : '—'}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* ── Footer note ────────────────────────────────────────── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Immutable record:</strong>{' '}
          Audit logs are write-once and never edited or deleted through the application layer.
          For compliance retention, export to CSV/Excel periodically and store in a secure backup location.
        </div>
      </div>
    </div>
  )
}
