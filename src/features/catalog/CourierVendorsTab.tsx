'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Plus, Trash2 } from 'lucide-react'
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
import { courierVendorsApi } from '@/lib/api/endpoints'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { inputClass } from '@/lib/styles'
import { toast } from 'sonner'
import { num, date } from '@/lib/format'

// ═══════════════════════════════════════════════════════════════
//  CourierVendorsTab — 3rd party courier vendors
// ═══════════════════════════════════════════════════════════════

interface CourierVendor {
  id: string
  code: string
  name: string
  phone: string | null
  address: string | null
  active: boolean
  createdAt: string
}

const EMPTY_FORM = { code: '', name: '', phone: '', address: '' }

export function CourierVendorsTab() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewItem, setViewItem] = useState<CourierVendor | null>(null)
  const [deleteItem, setDeleteItem] = useState<CourierVendor | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['courier-vendors', debouncedSearch],
    queryFn: () => courierVendorsApi.list(debouncedSearch || undefined),
  })

  const vendors: CourierVendor[] = (data || []) as any

  const createMutation = useMutation({
    mutationFn: (input: any) => courierVendorsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courier-vendors'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  async function submitCreate() {
    if (!form.code || !form.name) {
      toast.error('Code and name are required')
      return
    }
    try {
      const v = await createMutation.mutateAsync({ code: form.code, name: form.name, phone: form.phone || null, address: form.address || null })
      toast.success('Courier vendor created', { description: `${v.code} · ${v.name}` })
      setCreateOpen(false)
    } catch (e: any) {
      toast.error('Failed to create vendor', { description: e.message })
    }
  }

  function viewFields(v: CourierVendor): ViewField[] {
    return [
      { label: 'Code', value: v.code, mono: true },
      { label: 'Name', value: v.name },
      { label: 'Phone', value: v.phone || '—', mono: true },
      { label: 'Address', value: v.address || '—', full: true },
      { label: 'Added', value: date(v.createdAt) },
    ]
  }

  function handleDelete() {
    toast.info('Delete coming soon', { description: `Delete for ${deleteItem?.code}` })
    setDeleteItem(null)
  }

  const columns: Column<CourierVendor>[] = [
    {
      key: 'code', header: 'Code',
      cell: (v) => <CodeCell code={v.code} onClick={() => setViewItem(v)} />,
      sort: (a, b) => a.code.localeCompare(b.code),
    },
    { key: 'name', header: 'Courier Name', cell: (v) => <span className="font-medium">{v.name}</span>, sort: (a, b) => a.name.localeCompare(b.name) },
    { key: 'phone', header: 'Phone', cell: (v) => <span className="text-sm tabular-nums">{v.phone || '—'}</span> },
    { key: 'address', header: 'Address', cell: (v) => <span className="text-sm">{v.address || '—'}</span> },
    {
      key: 'actions', header: '', align: 'right', noPadding: true,
      cell: (v) => (
        <RowActions
          onView={() => setViewItem(v)}
          onDelete={() => setDeleteItem(v)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 stagger">
        <StatCard label="Courier Vendors" value={num(vendors.length)} icon={Send} tone="primary" />
        <StatCard label="Active" value={num(vendors.filter((v) => v.active).length)} icon={Send} tone="success" />
      </div>

      <MasterTabShell<CourierVendor>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search courier vendors…"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && vendors.length === 0}
        emptyTitle="No courier vendors yet"
        emptyDescription="Add your first courier vendor (e.g. Steadfast, Pathao, REDX)."
        emptyIcon={Send}
        onRetry={() => refetch()}
        primaryAction={{ label: 'New courier', icon: Plus, onClick: openCreate }}
      >
        <DataTable
          data={vendors}
          columns={columns}
          rowKey={(v) => v.id}
          initialSortKey="code"
        />
      </MasterTabShell>

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Courier Vendor"
        description="Register a 3rd party courier vendor."
        onSubmit={submitCreate}
        submitLabel={createMutation.isPending ? 'Creating…' : 'Create'}
        disabled={createMutation.isPending}
        maxWidth="max-w-lg"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code" required>
            <input className={inputClass} value={form.code} onChange={(e) => setField('code', e.target.value)} placeholder="CR-001" />
          </Field>
          <Field label="Name" required>
            <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Steadfast" />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+8801…" />
          </Field>
          <Field label="Address">
            <input className={inputClass} value={form.address} onChange={(e) => setField('address', e.target.value)} />
          </Field>
        </div>
      </CreateDialog>

      <ViewDialog
        open={viewItem !== null}
        onOpenChange={(o) => !o && setViewItem(null)}
        code={viewItem?.code}
        title={viewItem?.name || ''}
        subtitle={viewItem?.phone || undefined}
        fields={viewItem ? viewFields(viewItem) : []}
      />

      <AlertDialog open={deleteItem !== null} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete courier vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <span className="font-mono font-semibold">{deleteItem?.code}</span> — {deleteItem?.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
