'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Truck, Plus, Printer, Trash2, type LucideIcon } from 'lucide-react'
import { StatCard } from '@/components/system'
import { DataTable, CodeCell, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { CreateDialog } from '@/components/system/create-dialog'
import { ViewDialog, type ViewField } from '@/components/system/view-dialog'
import { RowActions } from '@/components/system/row-actions'
import { Field } from '@/components/system/forms'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { inputClass } from '@/lib/styles'
import { customersApi, suppliersApi } from '@/lib/api/endpoints'
import { toast } from 'sonner'
import { num, date } from '@/lib/format'
import type { Customer, CustomerInput, Supplier, SupplierInput } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  PartyTab — shared list+create+edit+delete+print for dealers & sourcing
// ═══════════════════════════════════════════════════════════════

interface PartyTabProps {
  kind: 'dealer' | 'sourcing'
  icon: LucideIcon
  label: string
  singular: string
  codePrefix: string
  dialogDescription: string
}

const EMPTY_FORM = { code: '', name: '', email: '', phone: '', address: '', city: '' }
type Party = Customer | Supplier
type PartyInput = CustomerInput | SupplierInput

export function PartyTab({
  kind, icon: Icon, label, singular, codePrefix, dialogDescription,
}: PartyTabProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<Party | null>(null)
  const [viewItem, setViewItem] = useState<Party | null>(null)
  const [deleteItem, setDeleteItem] = useState<Party | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const isDealer = kind === 'dealer'
  const queryKey = isDealer ? 'customers' : 'suppliers'
  const api = isDealer ? customersApi : suppliersApi
  const entityName = isDealer ? 'Customer' : 'Supplier'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [queryKey, debouncedSearch],
    queryFn: () => api.list(),
  })

  const createMutation = useMutation({
    mutationFn: (input: PartyInput) => api.create(input as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PartyInput> }) =>
      api.update(id, input as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  useEffect(() => {
    if (editItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        code: editItem.code,
        name: editItem.name,
        email: editItem.email || '',
        phone: editItem.phone || '',
        address: editItem.address || '',
        city: editItem.city || '',
      })
    }
  }, [editItem])

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  function openEdit(p: Party) {
    setViewItem(null)
    setEditItem(p)
  }

  async function submitCreate() {
    if (!form.code || !form.name) {
      toast.error('Code and name are required')
      return
    }
    try {
      const created = await createMutation.mutateAsync(form as PartyInput)
      toast.success(`${singular[0].toUpperCase()}${singular.slice(1)} created`, {
        description: `${created.code} · ${created.name}`,
      })
      setCreateOpen(false)
    } catch (e: any) {
      toast.error(`Failed to create ${singular}`, { description: e.message })
    }
  }

  async function submitEdit() {
    if (!editItem) return
    if (!form.code || !form.name) {
      toast.error('Code and name are required')
      return
    }
    try {
      const updated = await updateMutation.mutateAsync({ id: editItem.id, input: form })
      toast.success(`${singular[0].toUpperCase()}${singular.slice(1)} updated`, {
        description: `${updated.code} · ${updated.name}`,
      })
      setEditItem(null)
    } catch (e: any) {
      toast.error(`Failed to update ${singular}`, { description: e.message })
    }
  }

  function handlePrint(p: Party) {
    printPartyDetail(p, entityName, singular)
  }

  async function handleDelete() {
    if (!deleteItem) return
    try {
      await deleteMutation.mutateAsync(deleteItem.id)
      toast.success(`${singular[0].toUpperCase()}${singular.slice(1)} deleted`, {
        description: `${deleteItem.code} · ${deleteItem.name}`,
      })
      setDeleteItem(null)
    } catch (e: any) {
      toast.error(`Failed to delete ${singular}`, { description: e.message })
    }
  }

  function viewFields(p: Party): ViewField[] {
    return [
      { label: 'Code', value: p.code, mono: true },
      { label: 'Name', value: p.name },
      { label: 'Email', value: p.email || '—' },
      { label: 'Phone', value: p.phone || '—', mono: true },
      { label: 'Address', value: p.address || '—', full: true },
      { label: 'City', value: p.city || '—' },
      { label: 'Added on', value: date(p.createdAt) },
    ]
  }

  const rows = data || []
  const cities = new Set(rows.map((r) => r.city).filter(Boolean) as string[])

  const columns: Column<Party>[] = [
    {
      key: 'code', header: 'Code',
      cell: (r) => <CodeCell code={r.code} onClick={() => setViewItem(r)} />,
      sort: (a, b) => a.code.localeCompare(b.code),
    },
    { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span>, sort: (a, b) => a.name.localeCompare(b.name) },
    { key: 'email', header: 'Email', cell: (r) => <span className="text-sm">{r.email || '—'}</span> },
    { key: 'phone', header: 'Phone', cell: (r) => <span className="text-sm tabular-nums">{r.phone || '—'}</span> },
    { key: 'city', header: 'City', cell: (r) => <span className="text-sm">{r.city || '—'}</span>, sort: (a, b) => (a.city || '').localeCompare(b.city || '') },
    { key: 'createdAt', header: 'Added', cell: (r) => <span className="text-xs text-muted-foreground">{date(r.createdAt)}</span>, sort: (a, b) => a.createdAt.getTime() - b.createdAt.getTime() },
    {
      key: 'actions', header: '', align: 'right', noPadding: true,
      cell: (r) => (
        <RowActions
          onView={() => setViewItem(r)}
          onEdit={() => openEdit(r)}
          onPrint={() => handlePrint(r)}
          onDelete={() => setDeleteItem(r)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 stagger">
        <StatCard label={`Total ${label}`} value={num(rows.length)} icon={Icon} tone="primary" />
        <StatCard label="Cities Covered" value={num(cities.size)} tone="info" />
        <StatCard label="With Email" value={num(rows.filter((r) => r.email).length)} tone="success" />
      </div>

      <MasterTabShell<Party>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`Search ${label.toLowerCase()}…`}
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && rows.length === 0}
        emptyTitle={`No ${label.toLowerCase()} yet`}
        emptyDescription={`Add your first ${singular} to start tracking orders.`}
        emptyIcon={Icon}
        onRetry={() => refetch()}
        primaryAction={{ label: `New ${singular}`, icon: Plus, onClick: openCreate }}
      >
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => r.id}
          initialSortKey="code"
        />
      </MasterTabShell>

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={`New ${singular[0].toUpperCase()}${singular.slice(1)}`}
        description={dialogDescription}
        onSubmit={submitCreate}
        submitLabel={createMutation.isPending ? 'Creating…' : 'Create'}
        disabled={createMutation.isPending}
        maxWidth="max-w-lg"
      >
        <PartyForm form={form} setField={setField} codePrefix={codePrefix} />
      </CreateDialog>

      <CreateDialog
        open={editItem !== null}
        onOpenChange={(o) => !o && setEditItem(null)}
        title={`Edit ${singular[0].toUpperCase()}${singular.slice(1)}`}
        description={`Editing ${editItem?.code} — ${editItem?.name}`}
        onSubmit={submitEdit}
        submitLabel={updateMutation.isPending ? 'Saving…' : 'Save changes'}
        disabled={updateMutation.isPending}
        maxWidth="max-w-lg"
      >
        <PartyForm form={form} setField={setField} codePrefix={codePrefix} />
      </CreateDialog>

      <ViewDialog
        open={viewItem !== null}
        onOpenChange={(o) => !o && setViewItem(null)}
        code={viewItem?.code}
        title={viewItem?.name || ''}
        subtitle={viewItem?.city || undefined}
        fields={viewItem ? viewFields(viewItem) : []}
        onEdit={() => viewItem && openEdit(viewItem)}
        onPrint={() => viewItem && handlePrint(viewItem)}
      />

      <AlertDialog open={deleteItem !== null} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {singular}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-mono font-semibold">{deleteItem?.code}</span> — {deleteItem?.name}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Reusable party form ─────────────────────────────────────────
function PartyForm({
  form, setField, codePrefix,
}: {
  form: typeof EMPTY_FORM
  setField: <K extends keyof typeof EMPTY_FORM>(key: K, value: string) => void
  codePrefix: string
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Code" required>
        <input className={inputClass} value={form.code} onChange={(e) => setField('code', e.target.value)} placeholder={codePrefix} />
      </Field>
      <Field label="Name" required>
        <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} />
      </Field>
      <Field label="Email">
        <input type="email" className={inputClass} value={form.email} onChange={(e) => setField('email', e.target.value)} />
      </Field>
      <Field label="Phone">
        <input className={inputClass} value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+8801…" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Address">
          <input className={inputClass} value={form.address} onChange={(e) => setField('address', e.target.value)} />
        </Field>
      </div>
      <Field label="City">
        <input className={inputClass} value={form.city} onChange={(e) => setField('city', e.target.value)} />
      </Field>
    </div>
  )
}

// ─── Print helper ────────────────────────────────────────────────
function printPartyDetail(p: Party, entityName: string, singular: string) {
  const w = window.open('', '_blank', 'width=720,height=900')
  if (!w) {
    toast.error('Could not open print window', { description: 'Please allow pop-ups for this site.' })
    return
  }
  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${p.code} — ${entityName} Detail</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 32px; color: #142032; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #0c389f; margin-bottom: 24px; }
        .brand { font-size: 18px; font-weight: 700; color: #0c389f; }
        .brand-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
        .doc-meta { text-align: right; font-size: 11px; color: #6b7280; }
        .doc-meta strong { color: #142032; font-size: 13px; }
        h1 { font-size: 22px; margin: 0 0 4px 0; }
        .code { font-family: 'Menlo', monospace; font-size: 13px; color: #6b7280; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; margin-bottom: 24px; }
        .field { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        .field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px; }
        .field-value { font-size: 14px; font-weight: 500; }
        .field-value.mono { font-family: 'Menlo', monospace; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">Whirlpool Bangladesh</div>
          <div class="brand-sub">Warehouse Management System · ${entityName} Detail</div>
        </div>
        <div class="doc-meta">
          <strong>${entityName} Profile</strong><br/>
          Printed: ${new Date().toLocaleString('en-GB')}
        </div>
      </div>
      <h1>${p.name}</h1>
      <div class="code">Code: ${p.code}</div>
      <div class="grid">
        <div class="field"><div class="field-label">Email</div><div class="field-value">${p.email || '—'}</div></div>
        <div class="field"><div class="field-label">Phone</div><div class="field-value mono">${p.phone || '—'}</div></div>
        <div class="field"><div class="field-label">City</div><div class="field-value">${p.city || '—'}</div></div>
        <div class="field"><div class="field-label">Added on</div><div class="field-value">${date(p.createdAt)}</div></div>
        <div class="field" style="grid-column: 1 / -1;"><div class="field-label">Address</div><div class="field-value">${p.address || '—'}</div></div>
      </div>
      <div class="footer">
        Whirlpool Bangladesh · WMS · Generated ${new Date().toLocaleString('en-GB')}
      </div>
    </body>
    </html>
  `)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 250)
}

export function DealersTab() {
  return <PartyTab kind="dealer" icon={Users} label="Dealers" singular="dealer" codePrefix="DLR-007" dialogDescription="Register a new Whirlpool dealer or showroom outlet." />
}

export function SourcingTab() {
  return <PartyTab kind="sourcing" icon={Truck} label="Sourcing partners" singular="supplier" codePrefix="WHP-XXX" dialogDescription="Register a Whirlpool sourcing entity (e.g. Whirlpool Corp USA, India, Thailand)." />
}
