'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Wallet, ArrowDownCircle, ArrowUpCircle, FileText, Printer, Plus,
  RefreshCw, Download, TrendingUp, TrendingDown, Scale, ChevronRight,
} from 'lucide-react'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/system'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FormDialog } from '@/components/system/create-dialog'
import { ViewDialog, type ViewField } from '@/components/system/view-dialog'
import { RowActions } from '@/components/system/row-actions'
import { Field } from '@/components/system/forms'
import {
  requisitionsApi, cashInApi, expensesApi, financeReportApi,
  type Requisition, type CashIn, type Expense, type FinanceReport,
} from '@/lib/api/finance'
import { useAuth } from '@/lib/auth/session'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { generateCSV, downloadCSV } from '@/lib/csv'
import { bdt, num, date, dateTime } from '@/lib/format'
import { toast } from 'sonner'
import { printMoneyReceipt, printRequisitionSlip, printCashInSlip, printMonthEndReport } from './print-docs'

// ═══════════════════════════════════════════════════════════════
//  FinancePage — Requisitions, Cash In, Expenses, Month-End Report
// ═══════════════════════════════════════════════════════════════

const EXPENSE_CATEGORIES = ['Procurement', 'Fuel', 'Transport', 'Maintenance', 'Utilities', 'Salary', 'Office Supplies', 'Misc']
const PAYMENT_MODES = ['cash', 'bank', 'bkash', 'nagad', 'cheque']

export function FinancePage() {
  const [tab, setTab] = useState<'requisitions' | 'cashin' | 'expenses' | 'report'>('requisitions')

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
      <PageHeader
        title="Finance"
        description="Requisitions, cash in (3i Logistics), expenses & month-end HO report"
        icon={Wallet}
        breadcrumb={
          <>
            <span>Whirlpool BD</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Finance</span>
          </>
        }
      />

      <div className="flex flex-wrap gap-2 border-b pb-px">
        {[
          { key: 'requisitions', label: 'Requisitions', icon: FileText },
          { key: 'cashin',       label: 'Cash In',      icon: ArrowDownCircle },
          { key: 'expenses',     label: 'Expenses',     icon: ArrowUpCircle },
          { key: 'report',       label: 'Month-End Report', icon: Scale },
        ].map((t) => {
          const Icon = t.icon
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as any)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="animate-fade-in">
        {tab === 'requisitions' && <RequisitionsTab />}
        {tab === 'cashin'       && <CashInTab />}
        {tab === 'expenses'     && <ExpensesTab />}
        {tab === 'report'       && <ReportTab />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  REQUISITIONS TAB
// ═══════════════════════════════════════════════════════════════

const REQ_STATUS_STYLES: Record<string, string> = {
  pending:  'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved: 'bg-sky-500/10 text-sky-600 border-sky-500/30',
  received: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
}

function RequisitionsTab() {
  const user = useAuth((s) => s.user)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewItem, setViewItem] = useState<Requisition | null>(null)
  const [deleteItem, setDeleteItem] = useState<Requisition | null>(null)
  const [form, setForm] = useState({ amount: '', purpose: '', notes: '', date: new Date().toISOString().slice(0, 10) })
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const { data: reqs, isLoading, refetch } = useQuery({
    queryKey: ['finance-requisitions', debouncedSearch, statusFilter],
    queryFn: () => requisitionsApi.list({ status: statusFilter }),
  })

  const filtered = (reqs || []).filter(r => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return r.reqNo.toLowerCase().includes(q) || r.purpose.toLowerCase().includes(q)
  })

  const createMutation = useMutation({
    mutationFn: (input: typeof form) => requisitionsApi.create({
      ...input,
      amount: Number(input.amount),
      userName: user?.name,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-requisitions'] })
      qc.invalidateQueries({ queryKey: ['finance-report'] })
      setCreateOpen(false)
      setForm({ amount: '', purpose: '', notes: '', date: new Date().toISOString().slice(0, 10) })
      toast.success('Requisition created')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => requisitionsApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-requisitions'] })
      qc.invalidateQueries({ queryKey: ['finance-report'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => requisitionsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-requisitions'] })
      setDeleteItem(null)
      toast.success('Requisition deleted')
    },
  })

  const stats = {
    total: (reqs || []).length,
    pending: (reqs || []).filter(r => r.status === 'pending').length,
    approved: (reqs || []).filter(r => r.status === 'approved').length,
    received: (reqs || []).filter(r => r.status === 'received').length,
    totalAmount: (reqs || []).reduce((s, r) => s + r.amount, 0),
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Requisitions" value={stats.total} tone="primary" icon={FileText} />
        <StatCard label="Pending" value={stats.pending} tone="warning" icon={RefreshCw} />
        <StatCard label="Received" value={stats.received} tone="success" icon={ArrowDownCircle} />
        <StatCard label="Total Amount" value={bdt(stats.totalAmount)} tone="info" icon={Wallet} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by req no or purpose…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /></Button>
        <div className="flex-1" />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Requisition
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading requisitions…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No requisitions" description="Create a requisition to request funds from Head Office." />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Req No</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Purpose</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-center p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono font-medium">{r.reqNo}</td>
                  <td className="p-3 text-xs">{date(r.date)}</td>
                  <td className="p-3 truncate max-w-md">{r.purpose}</td>
                  <td className="p-3 text-right tabular-nums font-semibold">{bdt(r.amount)}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium capitalize ${REQ_STATUS_STYLES[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      {r.status === 'pending' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs"
                          onClick={() => updateMutation.mutate({ id: r.id, body: { status: 'approved', approvedBy: user?.name } })}>
                          Approve
                        </Button>
                      )}
                      {r.status === 'approved' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600"
                          onClick={() => updateMutation.mutate({ id: r.id, body: { status: 'received', receivedBy: user?.name } })}>
                          Mark Received
                        </Button>
                      )}
                      <RowActions
                        onView={() => setViewItem(r)}
                        onPrint={() => printRequisitionSlip(r)}
                        onDelete={() => setDeleteItem(r)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create dialog */}
      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Cash Requisition"
        description="Request funds from Head Office via 3i Logistics"
        submitLabel={createMutation.isPending ? 'Creating…' : 'Create Requisition'}
        disabled={createMutation.isPending || !form.amount || !form.purpose}
        onSubmit={async () => { await createMutation.mutateAsync(form) }}
      >
        <div className="grid gap-3">
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Amount (BDT) *">
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="50000" />
          </Field>
          <Field label="Purpose *">
            <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Procurement of refrigerator stock" />
          </Field>
          <Field label="Notes (optional)">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
            <strong>Note:</strong> Funds will be transferred from Head Office via <strong>3i Logistics</strong> to Whirlpool Central Warehouse.
          </div>
        </div>
      </FormDialog>

      {/* View dialog */}
      {viewItem && (
        <ViewDialog
          open={!!viewItem}
          onOpenChange={(o) => !o && setViewItem(null)}
          code={viewItem.reqNo}
          title={`Requisition — ${bdt(viewItem.amount)}`}
          subtitle={`Status: ${viewItem.status}`}
          badge={{ label: viewItem.status, tone: viewItem.status === 'received' ? 'success' : viewItem.status === 'pending' ? 'warning' : 'default' }}
          onPrint={() => printRequisitionSlip(viewItem)}
          maxWidth="max-w-3xl"
          fields={[
            { label: 'Requisition No', value: viewItem.reqNo, mono: true },
            { label: 'Date', value: date(viewItem.date) },
            { label: 'Amount', value: bdt(viewItem.amount), mono: true },
            { label: 'Status', value: <span className="capitalize">{viewItem.status}</span> },
            { label: 'Approved By', value: viewItem.approvedBy || '—' },
            { label: 'Approved At', value: viewItem.approvedAt ? dateTime(viewItem.approvedAt) : '—' },
            { label: 'Received By', value: viewItem.receivedBy || '—' },
            { label: 'Received At', value: viewItem.receivedAt ? dateTime(viewItem.receivedAt) : '—' },
            { label: 'Purpose', value: viewItem.purpose, full: true },
            { label: 'Notes', value: viewItem.notes || '—', full: true },
          ]}
          footer={
            viewItem.cashIns && viewItem.cashIns.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Linked Cash In Records</p>
                <div className="space-y-1">
                  {viewItem.cashIns.map(c => (
                    <div key={c.id} className="flex justify-between text-xs">
                      <span className="font-mono">{c.cashInNo}</span>
                      <span>{date(c.date)}</span>
                      <span className="font-semibold">{bdt(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No cash in records linked yet.</p>
            )
          }
        />
      )}

      {/* Delete confirm */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={() => setDeleteItem(null)}>
          <div className="bg-card rounded-lg border p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Requisition?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete <span className="font-mono font-semibold">{deleteItem.reqNo}</span>.
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteItem.id)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  CASH IN TAB
// ═══════════════════════════════════════════════════════════════

function CashInTab() {
  const user = useAuth((s) => s.user)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewItem, setViewItem] = useState<CashIn | null>(null)
  const [deleteItem, setDeleteItem] = useState<CashIn | null>(null)
  const [form, setForm] = useState({
    amount: '', source: '3i Logistics', requisitionId: '', receivedBy: user?.name || '',
    notes: '', date: new Date().toISOString().slice(0, 10),
  })
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const { data: cashIns, isLoading, refetch } = useQuery({
    queryKey: ['finance-cash-in'],
    queryFn: () => cashInApi.list(),
  })

  const { data: reqs } = useQuery({
    queryKey: ['finance-requisitions', 'for-cashin'],
    queryFn: () => requisitionsApi.list({ status: 'approved' }),
  })

  const filtered = (cashIns || []).filter(c => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return c.cashInNo.toLowerCase().includes(q) || c.source.toLowerCase().includes(q) || c.receivedBy.toLowerCase().includes(q)
  })

  const createMutation = useMutation({
    mutationFn: (input: typeof form) => cashInApi.create({
      ...input,
      amount: Number(input.amount),
      requisitionId: input.requisitionId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-cash-in'] })
      qc.invalidateQueries({ queryKey: ['finance-requisitions'] })
      qc.invalidateQueries({ queryKey: ['finance-report'] })
      setCreateOpen(false)
      setForm({ amount: '', source: '3i Logistics', requisitionId: '', receivedBy: user?.name || '', notes: '', date: new Date().toISOString().slice(0, 10) })
      toast.success('Cash in recorded')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cashInApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-cash-in'] })
      setDeleteItem(null)
      toast.success('Cash in deleted')
    },
  })

  const total = (cashIns || []).reduce((s, c) => s + c.amount, 0)
  const thisMonth = (cashIns || []).filter(c => new Date(c.date).getMonth() === new Date().getMonth() && new Date(c.date).getFullYear() === new Date().getFullYear()).reduce((s, c) => s + c.amount, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Records" value={(cashIns || []).length} tone="primary" icon={ArrowDownCircle} />
        <StatCard label="Total Cash In" value={bdt(total)} tone="success" icon={TrendingUp} />
        <StatCard label="This Month" value={bdt(thisMonth)} tone="info" icon={Wallet} />
        <StatCard label="Source" value="3i Logistics" tone="warning" icon={FileText} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by cash in no, source, receiver…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /></Button>
        <div className="flex-1" />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Record Cash In
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading cash in records…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ArrowDownCircle} title="No cash in records" description="Record cash received from 3i Logistics or Head Office." />
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Cash In No</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Source</th>
                <th className="text-left p-3">Requisition</th>
                <th className="text-left p-3">Received By</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono font-medium">{c.cashInNo}</td>
                  <td className="p-3 text-xs">{date(c.date)}</td>
                  <td className="p-3">{c.source}</td>
                  <td className="p-3 font-mono text-xs">{c.requisition?.reqNo || '—'}</td>
                  <td className="p-3 text-xs">{c.receivedBy}</td>
                  <td className="p-3 text-right tabular-nums font-semibold text-emerald-600">{bdt(c.amount)}</td>
                  <td className="p-3 text-right">
                    <RowActions
                      onView={() => setViewItem(c)}
                      onPrint={() => printCashInSlip(c)}
                      onDelete={() => setDeleteItem(c)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td colSpan={5} className="p-3 text-right">Total</td>
                <td className="p-3 text-right tabular-nums">{bdt(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Record Cash In"
        description="Money received from 3i Logistics or Head Office"
        submitLabel={createMutation.isPending ? 'Recording…' : 'Record Cash In'}
        disabled={createMutation.isPending || !form.amount || !form.receivedBy}
        onSubmit={async () => { await createMutation.mutateAsync(form) }}
        maxWidth="max-w-2xl"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Amount (BDT) *">
            <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="50000" />
          </Field>
          <Field label="Source">
            <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3i Logistics">3i Logistics</SelectItem>
                <SelectItem value="Head Office">Head Office</SelectItem>
                <SelectItem value="Bank">Bank</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Received By *">
            <Input value={form.receivedBy} onChange={(e) => setForm({ ...form, receivedBy: e.target.value })} />
          </Field>
          <Field label="Link to Requisition (optional)" className="sm:col-span-2">
            <Select value={form.requisitionId} onValueChange={(v) => setForm({ ...form, requisitionId: v === 'none' ? '' : v })}>
              <SelectTrigger><SelectValue placeholder="No linked requisition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No linked requisition</SelectItem>
                {(reqs || []).map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.reqNo} — {bdt(r.amount)} — {r.purpose.slice(0, 30)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes (optional)" className="sm:col-span-2">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>
      </FormDialog>

      {viewItem && (
        <ViewDialog
          open={!!viewItem}
          onOpenChange={(o) => !o && setViewItem(null)}
          code={viewItem.cashInNo}
          title={`Cash In — ${bdt(viewItem.amount)}`}
          subtitle={`From ${viewItem.source}`}
          badge={{ label: 'Received', tone: 'success' }}
          onPrint={() => printCashInSlip(viewItem)}
          fields={[
            { label: 'Cash In No', value: viewItem.cashInNo, mono: true },
            { label: 'Date', value: date(viewItem.date) },
            { label: 'Amount', value: bdt(viewItem.amount), mono: true },
            { label: 'Source', value: viewItem.source },
            { label: 'Requisition', value: viewItem.requisition?.reqNo || '—', mono: true },
            { label: 'Received By', value: viewItem.receivedBy },
            { label: 'Notes', value: viewItem.notes || '—', full: true },
          ]}
        />
      )}

      {deleteItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={() => setDeleteItem(null)}>
          <div className="bg-card rounded-lg border p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Cash In?</h3>
            <p className="text-sm text-muted-foreground mb-4">Permanently delete <span className="font-mono font-semibold">{deleteItem.cashInNo}</span>?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteItem.id)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  EXPENSES TAB
// ═══════════════════════════════════════════════════════════════

function ExpensesTab() {
  const user = useAuth((s) => s.user)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [catFilter, setCatFilter] = useState('ALL')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewItem, setViewItem] = useState<Expense | null>(null)
  const [deleteItem, setDeleteItem] = useState<Expense | null>(null)
  const [form, setForm] = useState({
    type: 'procurement', category: 'Procurement', beneficiary: '', amount: '',
    paymentMode: 'cash', memoNo: '', memoDate: '', billNo: '', billDate: '',
    receiverName: '', paidBy: user?.name || '', notes: '',
    date: new Date().toISOString().slice(0, 10),
  })
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: ['finance-expenses', typeFilter, catFilter],
    queryFn: () => expensesApi.list({ type: typeFilter, category: catFilter }),
  })

  const filtered = (expenses || []).filter(e => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return e.expenseNo.toLowerCase().includes(q) || e.beneficiary.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || (e.memoNo || '').toLowerCase().includes(q)
  })

  const createMutation = useMutation({
    mutationFn: (input: typeof form) => expensesApi.create({
      ...input,
      amount: Number(input.amount),
      memoDate: input.memoDate || undefined,
      billDate: input.billDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-expenses'] })
      qc.invalidateQueries({ queryKey: ['finance-report'] })
      setCreateOpen(false)
      setForm({
        type: 'procurement', category: 'Procurement', beneficiary: '', amount: '',
        paymentMode: 'cash', memoNo: '', memoDate: '', billNo: '', billDate: '',
        receiverName: '', paidBy: user?.name || '', notes: '',
        date: new Date().toISOString().slice(0, 10),
      })
      toast.success('Expense recorded')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-expenses'] })
      setDeleteItem(null)
      toast.success('Expense deleted')
    },
  })

  const total = (expenses || []).reduce((s, e) => s + e.amount, 0)
  const procurementTotal = (expenses || []).filter(e => e.type === 'procurement').reduce((s, e) => s + e.amount, 0)
  const otherTotal = (expenses || []).filter(e => e.type === 'other').reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Expenses" value={bdt(total)} tone="destructive" icon={TrendingDown} />
        <StatCard label="Procurement" value={bdt(procurementTotal)} tone="warning" icon={FileText} />
        <StatCard label="Other" value={bdt(otherTotal)} tone="info" icon={Wallet} />
        <StatCard label="Records" value={(expenses || []).length} tone="primary" icon={ArrowUpCircle} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by expense no, beneficiary, category, memo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="procurement">Procurement</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /></Button>
        <div className="flex-1" />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> New Expense
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Loading expenses…</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ArrowUpCircle} title="No expenses" description="Record procurement payments or other expenses." />
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Exp No</th>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Beneficiary</th>
                <th className="text-left p-3">Category</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Memo/Bill No</th>
                <th className="text-left p-3">Mode</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} className="border-t hover:bg-muted/30">
                  <td className="p-3 font-mono font-medium">{e.expenseNo}</td>
                  <td className="p-3 text-xs">{date(e.date)}</td>
                  <td className="p-3 truncate max-w-[180px]">{e.beneficiary}</td>
                  <td className="p-3 text-xs">{e.category}</td>
                  <td className="p-3 text-xs capitalize">{e.type}</td>
                  <td className="p-3 font-mono text-xs">
                    {e.memoNo || e.billNo || '—'}
                    {e.memoNo && e.billNo && <span className="text-muted-foreground"> / {e.billNo}</span>}
                  </td>
                  <td className="p-3 text-xs capitalize">{e.paymentMode}</td>
                  <td className="p-3 text-right tabular-nums font-semibold text-rose-600">{bdt(e.amount)}</td>
                  <td className="p-3 text-right">
                    <RowActions
                      onView={() => setViewItem(e)}
                      onPrint={() => printMoneyReceipt(e)}
                      onDelete={() => setDeleteItem(e)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td colSpan={7} className="p-3 text-right">Total</td>
                <td className="p-3 text-right tabular-nums">{bdt(total)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <FormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Expense"
        description="Record procurement payment or other expense"
        submitLabel={createMutation.isPending ? 'Recording…' : 'Record Expense'}
        disabled={createMutation.isPending || !form.amount || !form.beneficiary || !form.category}
        onSubmit={async () => { await createMutation.mutateAsync(form) }}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4">
          {/* Type & category */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="procurement">Procurement</SelectItem>
                  <SelectItem value="other">Other Expense</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Category *">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Beneficiary & amount */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Beneficiary (Paid To) *">
              <Input value={form.beneficiary} onChange={(e) => setForm({ ...form, beneficiary: e.target.value })} placeholder="e.g. Karim Suppliers" />
            </Field>
            <Field label="Amount (BDT) *">
              <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="15000" />
            </Field>
          </div>

          {/* Date & payment mode */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Payment Mode">
              <Select value={form.paymentMode} onValueChange={(v) => setForm({ ...form, paymentMode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map(m => <SelectItem key={m} value={m}><span className="capitalize">{m}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {/* Memo & Bill (procurement-specific) */}
          <div className="rounded-md border bg-muted/20 p-3 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Memo &amp; Bill (Procurement)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Memo No (warehouse's own)">
                <Input value={form.memoNo} onChange={(e) => setForm({ ...form, memoNo: e.target.value })} placeholder="MEMO-001" />
              </Field>
              <Field label="Memo Date">
                <Input type="date" value={form.memoDate} onChange={(e) => setForm({ ...form, memoDate: e.target.value })} />
              </Field>
              <Field label="Bill / Cash Memo No (vendor)">
                <Input value={form.billNo} onChange={(e) => setForm({ ...form, billNo: e.target.value })} placeholder="BILL-1234" />
              </Field>
              <Field label="Bill Date">
                <Input type="date" value={form.billDate} onChange={(e) => setForm({ ...form, billDate: e.target.value })} />
              </Field>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Receiver Name (who signed)">
              <Input value={form.receiverName} onChange={(e) => setForm({ ...form, receiverName: e.target.value })} placeholder="e.g. Abdul Karim" />
            </Field>
            <Field label="Paid By">
              <Input value={form.paidBy} onChange={(e) => setForm({ ...form, paidBy: e.target.value })} />
            </Field>
          </div>

          <Field label="Notes (optional)">
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
        </div>
      </FormDialog>

      {viewItem && (
        <ViewDialog
          open={!!viewItem}
          onOpenChange={(o) => !o && setViewItem(null)}
          code={viewItem.expenseNo}
          title={`Expense — ${bdt(viewItem.amount)}`}
          subtitle={`${viewItem.category} · ${viewItem.beneficiary}`}
          badge={{ label: viewItem.type, tone: viewItem.type === 'procurement' ? 'warning' : 'info' }}
          onPrint={() => printMoneyReceipt(viewItem)}
          maxWidth="max-w-3xl"
          fields={[
            { label: 'Expense No', value: viewItem.expenseNo, mono: true },
            { label: 'Date', value: date(viewItem.date) },
            { label: 'Type', value: <span className="capitalize">{viewItem.type}</span> },
            { label: 'Category', value: viewItem.category },
            { label: 'Beneficiary', value: viewItem.beneficiary },
            { label: 'Amount', value: bdt(viewItem.amount), mono: true },
            { label: 'Payment Mode', value: <span className="capitalize">{viewItem.paymentMode}</span> },
            { label: 'Memo No', value: viewItem.memoNo || '—', mono: true },
            { label: 'Memo Date', value: viewItem.memoDate ? date(viewItem.memoDate) : '—' },
            { label: 'Bill No', value: viewItem.billNo || '—', mono: true },
            { label: 'Bill Date', value: viewItem.billDate ? date(viewItem.billDate) : '—' },
            { label: 'Receiver Name', value: viewItem.receiverName || '—' },
            { label: 'Paid By', value: viewItem.paidBy || '—' },
            { label: 'Notes', value: viewItem.notes || '—', full: true },
          ]}
        />
      )}

      {deleteItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50" onClick={() => setDeleteItem(null)}>
          <div className="bg-card rounded-lg border p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Delete Expense?</h3>
            <p className="text-sm text-muted-foreground mb-4">Permanently delete <span className="font-mono font-semibold">{deleteItem.expenseNo}</span>?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deleteItem.id)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MONTH-END REPORT TAB
// ═══════════════════════════════════════════════════════════════

function ReportTab() {
  const currentMonth = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const [month, setMonth] = useState(currentMonth)
  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['finance-report', month],
    queryFn: () => financeReportApi.get(month),
  })

  function handleExportCsv() {
    if (!report) return
    const rows = [
      { Type: 'Opening Balance', Amount: report.openingBalance, Count: '' },
      { Type: 'Cash In', Amount: report.cashIn.total, Count: report.cashIn.count },
      { Type: 'Expenses', Amount: report.expenses.total, Count: report.expenses.count },
      { Type: 'Closing Balance', Amount: report.closingBalance, Count: '' },
      ...report.expenses.items.map(e => ({
        Type: `Expense - ${e.category}`,
        Amount: e.amount,
        Count: e.expenseNo,
      })),
      ...report.cashIn.items.map(c => ({
        Type: `Cash In - ${c.source}`,
        Amount: c.amount,
        Count: c.cashInNo,
      })),
    ]
    const csv = generateCSV(rows)
    downloadCSV(`finance-report-${month}.csv`, csv)
    toast.success(`Exported ${rows.length} rows to CSV`)
  }

  function handleExcel() {
    if (!report) return
    const rows = [
      { Type: 'Opening Balance', Amount: report.openingBalance, Count: '' },
      { Type: 'Cash In', Amount: report.cashIn.total, Count: report.cashIn.count },
      { Type: 'Expenses', Amount: report.expenses.total, Count: report.expenses.count },
      { Type: 'Closing Balance', Amount: report.closingBalance, Count: '' },
    ]
    const columns = Object.keys(rows[0])
    const headers = columns.join('</th><th>')
    const rowsHtml = rows.map(row =>
      '<tr>' + columns.map(col => `<td>${row[col] ?? ''}</td>`).join('') + '</tr>'
    ).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1"><thead><tr><th>${headers}</th></tr></thead><tbody>${rowsHtml}</tbody></table></body></html>`
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `finance-report-${month}.xls`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Excel exported')
  }

  if (isLoading || !report) {
    return <div className="p-8 text-center text-muted-foreground">Loading report…</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="max-w-[180px]"
        />
        <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" /></Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={handleExcel}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> Excel
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCsv}>
          <Download className="h-3.5 w-3.5 mr-1.5" /> CSV
        </Button>
        <Button size="sm" onClick={() => printMonthEndReport(report)}>
          <Printer className="h-3.5 w-3.5 mr-1.5" /> Print PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Opening Balance" value={bdt(report.openingBalance)} tone="primary" icon={Wallet} />
        <StatCard label="Cash In (3i Logistics)" value={bdt(report.cashIn.total)} tone="success" icon={TrendingUp} hint={`${report.cashIn.count} records`} />
        <StatCard label="Total Expenses" value={bdt(report.expenses.total)} tone="destructive" icon={TrendingDown} hint={`${report.expenses.count} records`} />
        <StatCard label="Closing Balance" value={bdt(report.closingBalance)} tone="info" icon={Scale} />
      </div>

      {/* Requisition summary */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Requisitions This Month</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><span className="text-muted-foreground">Total:</span> <span className="font-semibold">{report.requisitions.total}</span></div>
          <div><span className="text-muted-foreground">Pending:</span> <span className="font-semibold text-amber-600">{report.requisitions.pending}</span></div>
          <div><span className="text-muted-foreground">Approved:</span> <span className="font-semibold text-sky-600">{report.requisitions.approved}</span></div>
          <div><span className="text-muted-foreground">Received:</span> <span className="font-semibold text-emerald-600">{report.requisitions.received}</span></div>
        </div>
        <div className="mt-2 text-sm">
          <span className="text-muted-foreground">Total Amount Requisitioned:</span>{' '}
          <span className="font-semibold tabular-nums">{bdt(report.requisitions.totalAmount)}</span>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(report.expenses.byCategory).length > 0 && (
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Expense Breakdown by Category
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="text-left p-3">Category</th>
                <th className="text-center p-3">Count</th>
                <th className="text-right p-3">Total</th>
                <th className="text-right p-3">% of Expenses</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.expenses.byCategory)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([cat, info]) => (
                  <tr key={cat} className="border-b last:border-b-0">
                    <td className="p-3 font-medium">{cat}</td>
                    <td className="p-3 text-center tabular-nums">{info.count}</td>
                    <td className="p-3 text-right tabular-nums font-semibold">{bdt(info.total)}</td>
                    <td className="p-3 text-right tabular-nums text-muted-foreground">
                      {((info.total / report.expenses.total) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-center tabular-nums">{report.expenses.count}</td>
                <td className="p-3 text-right tabular-nums">{bdt(report.expenses.total)}</td>
                <td className="p-3 text-right">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 bg-emerald-500/10 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Recent Cash In
          </div>
          <div className="divide-y">
            {report.cashIn.items.slice(0, 5).map(c => (
              <div key={c.id} className="px-4 py-2 flex justify-between text-sm">
                <div>
                  <div className="font-mono font-medium">{c.cashInNo}</div>
                  <div className="text-xs text-muted-foreground">{date(c.date)} · {c.source}</div>
                </div>
                <div className="font-semibold text-emerald-600 tabular-nums">{bdt(c.amount)}</div>
              </div>
            ))}
            {report.cashIn.items.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">No cash in this month</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="px-4 py-2 bg-rose-500/10 text-xs font-semibold uppercase tracking-wide text-rose-700">
            Recent Expenses
          </div>
          <div className="divide-y">
            {report.expenses.items.slice(0, 5).map(e => (
              <div key={e.id} className="px-4 py-2 flex justify-between text-sm">
                <div>
                  <div className="font-mono font-medium">{e.expenseNo}</div>
                  <div className="text-xs text-muted-foreground">{date(e.date)} · {e.beneficiary} · {e.category}</div>
                </div>
                <div className="font-semibold text-rose-600 tabular-nums">{bdt(e.amount)}</div>
              </div>
            ))}
            {report.expenses.items.length === 0 && (
              <div className="p-4 text-center text-xs text-muted-foreground">No expenses this month</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
