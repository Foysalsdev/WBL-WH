'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Truck, Plus, type LucideIcon } from 'lucide-react'
import { StatCard } from '@/components/system'
import { DataTable, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { CreateDialog } from '@/components/system/create-dialog'
import { Field } from '@/components/system/forms'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { inputClass } from '@/lib/styles'
import { customersApi, suppliersApi } from '@/lib/api/endpoints'
import { toast } from 'sonner'
import { num, date } from '@/lib/format'
import type { Customer, CustomerInput, Supplier, SupplierInput } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  PartyTab — shared list+create for dealers & sourcing partners.
//  Both have identical fields, so one component parametrised by
//  icon/labels/api is the correct DRY choice.
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

export function PartyTab({
  kind, icon: Icon, label, singular, codePrefix, dialogDescription,
}: PartyTabProps) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const isDealer = kind === 'dealer'
  const queryKey = isDealer ? 'customers' : 'suppliers'

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [queryKey, debouncedSearch],
    queryFn: () => isDealer ? customersApi.list() : suppliersApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (input: CustomerInput | SupplierInput) =>
      isDealer ? customersApi.create(input as CustomerInput) : suppliersApi.create(input as SupplierInput),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit() {
    if (!form.code || !form.name) {
      toast.error('Code and name are required')
      return
    }
    try {
      const created = await createMutation.mutateAsync(form)
      toast.success(`${singular[0].toUpperCase()}${singular.slice(1)} created`, { description: `${created.code} · ${created.name}` })
      setOpen(false)
      setForm(EMPTY_FORM)
    } catch (e: any) {
      toast.error(`Failed to create ${singular}`, { description: e.message })
    }
  }

  const rows = data || []
  const cities = new Set(rows.map((r) => r.city).filter(Boolean) as string[])

  const columns: Column<Customer | Supplier>[] = [
    { key: 'code', header: 'Code', cell: (r) => <span className="font-mono text-xs">{r.code}</span>, sort: (a, b) => a.code.localeCompare(b.code) },
    { key: 'name', header: 'Name', cell: (r) => <span className="font-medium">{r.name}</span>, sort: (a, b) => a.name.localeCompare(b.name) },
    { key: 'email', header: 'Email', cell: (r) => <span className="text-sm">{r.email || '—'}</span> },
    { key: 'phone', header: 'Phone', cell: (r) => <span className="text-sm">{r.phone || '—'}</span> },
    { key: 'city', header: 'City', cell: (r) => <span className="text-sm">{r.city || '—'}</span>, sort: (a, b) => (a.city || '').localeCompare(b.city || '') },
    { key: 'createdAt', header: 'Added', cell: (r) => <span className="text-xs text-muted-foreground">{date(r.createdAt)}</span>, sort: (a, b) => a.createdAt.getTime() - b.createdAt.getTime() },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label={`Total ${label}`} value={num(rows.length)} icon={Icon} />
        <StatCard label="Cities Covered" value={num(cities.size)} tone="info" />
        <StatCard label="With Email" value={num(rows.filter((r) => r.email).length)} tone="success" />
      </div>

      <MasterTabShell<Customer | Supplier>
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
        primaryAction={{ label: `New ${singular}`, icon: Plus, onClick: () => setOpen(true) }}
      >
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(r) => r.id}
          initialSortKey="code"
        />
      </MasterTabShell>

      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        title={`New ${singular[0].toUpperCase()}${singular.slice(1)}`}
        description={dialogDescription}
        onSubmit={submit}
        submitLabel={createMutation.isPending ? 'Creating…' : 'Create'}
        disabled={createMutation.isPending}
        maxWidth="max-w-lg"
      >
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
      </CreateDialog>
    </div>
  )
}

// Pre-configured exports
export function DealersTab() {
  return <PartyTab kind="dealer" icon={Users} label="Dealers" singular="dealer" codePrefix="DLR-007" dialogDescription="Register a new Whirlpool dealer or showroom outlet." />
}

export function SourcingTab() {
  return <PartyTab kind="sourcing" icon={Truck} label="Sourcing partners" singular="supplier" codePrefix="WHP-XXX" dialogDescription="Register a Whirlpool sourcing entity (e.g. Whirlpool Corp USA, India, Thailand)." />
}
