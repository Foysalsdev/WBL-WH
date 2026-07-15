'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, Plus, Printer, Trash2, Car } from 'lucide-react'
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
import { transportVendorsApi } from '@/lib/api/endpoints'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { inputClass } from '@/lib/styles'
import { toast } from 'sonner'
import { num, date } from '@/lib/format'

// ═══════════════════════════════════════════════════════════════
//  TransportVendorsTab — vendors with their vehicles + drivers
// ═══════════════════════════════════════════════════════════════

interface TransportVendor {
  id: string
  code: string
  name: string
  phone: string | null
  address: string | null
  active: boolean
  createdAt: string
  vehicles?: { id: string; vehicleNo: string; driverName: string | null; driverPhone: string | null }[]
}

const EMPTY_FORM = {
  code: '', name: '', phone: '', address: '',
  vehicles: [{ vehicleNo: '', driverName: '', driverPhone: '' }],
}

export function TransportVendorsTab() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewItem, setViewItem] = useState<TransportVendor | null>(null)
  const [deleteItem, setDeleteItem] = useState<TransportVendor | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transport-vendors', debouncedSearch],
    queryFn: () => transportVendorsApi.list(debouncedSearch || undefined),
  })

  const vendors: TransportVendor[] = (data || []) as any

  const createMutation = useMutation({
    mutationFn: (input: any) => transportVendorsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-vendors'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: any) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setVehicle(i: number, k: 'vehicleNo' | 'driverName' | 'driverPhone', v: string) {
    setForm((f) => ({ ...f, vehicles: f.vehicles.map((v2, idx) => idx === i ? { ...v2, [k]: v } : v2) }))
  }

  function addVehicle() {
    setForm((f) => ({ ...f, vehicles: [...f.vehicles, { vehicleNo: '', driverName: '', driverPhone: '' }] }))
  }

  function removeVehicle(i: number) {
    setForm((f) => ({ ...f, vehicles: f.vehicles.filter((_, idx) => idx !== i) }))
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
      const v = await createMutation.mutateAsync({
        code: form.code, name: form.name, phone: form.phone || null, address: form.address || null,
        vehicles: form.vehicles.filter((v2) => v2.vehicleNo),
      })
      toast.success('Transport vendor created', { description: `${v.code} · ${v.name}` })
      setCreateOpen(false)
    } catch (e: any) {
      toast.error('Failed to create vendor', { description: e.message })
    }
  }

  function viewFields(v: TransportVendor): ViewField[] {
    return [
      { label: 'Code', value: v.code, mono: true },
      { label: 'Name', value: v.name },
      { label: 'Phone', value: v.phone || '—', mono: true },
      { label: 'Address', value: v.address || '—', full: true },
      { label: 'Vehicles', value: num(v.vehicles?.length || 0), mono: true },
      { label: 'Added', value: date(v.createdAt) },
    ]
  }

  function handlePrint(v: TransportVendor) {
    toast.info('Print coming soon', { description: `Print for ${v.code}` })
  }

  function handleDelete() {
    toast.info('Delete coming soon', { description: `Delete for ${deleteItem?.code}` })
    setDeleteItem(null)
  }

  const totalVehicles = vendors.reduce((s, v) => s + (v.vehicles?.length || 0), 0)

  const columns: Column<TransportVendor>[] = [
    {
      key: 'code', header: 'Code',
      cell: (v) => <CodeCell code={v.code} onClick={() => setViewItem(v)} />,
      sort: (a, b) => a.code.localeCompare(b.code),
    },
    { key: 'name', header: 'Vendor Name', cell: (v) => <span className="font-medium">{v.name}</span>, sort: (a, b) => a.name.localeCompare(b.name) },
    { key: 'phone', header: 'Phone', cell: (v) => <span className="text-sm tabular-nums">{v.phone || '—'}</span> },
    { key: 'vehicles', header: 'Vehicles', align: 'center', cell: (v) => <span className="tabular-nums">{num(v.vehicles?.length || 0)}</span> },
    {
      key: 'actions', header: '', align: 'right', noPadding: true,
      cell: (v) => (
        <RowActions
          onView={() => setViewItem(v)}
          onPrint={() => handlePrint(v)}
          onDelete={() => setDeleteItem(v)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 stagger">
        <StatCard label="Transport Vendors" value={num(vendors.length)} icon={Truck} tone="primary" />
        <StatCard label="Total Vehicles" value={num(totalVehicles)} icon={Car} tone="info" />
        <StatCard label="Total Drivers" value={num(totalVehicles)} icon={Car} tone="info" />
      </div>

      <MasterTabShell<TransportVendor>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search transport vendors…"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && vendors.length === 0}
        emptyTitle="No transport vendors yet"
        emptyDescription="Add your first transport vendor with vehicles and drivers."
        emptyIcon={Truck}
        onRetry={() => refetch()}
        primaryAction={{ label: 'New vendor', icon: Plus, onClick: openCreate }}
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
        title="New Transport Vendor"
        description="Register a transport vendor with their vehicles and drivers."
        onSubmit={submitCreate}
        submitLabel={createMutation.isPending ? 'Creating…' : 'Create vendor'}
        disabled={createMutation.isPending}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Code" required>
              <input className={inputClass} value={form.code} onChange={(e) => setField('code', e.target.value)} placeholder="TV-001" />
            </Field>
            <Field label="Name" required>
              <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Karim Transport Agency" />
            </Field>
            <Field label="Phone">
              <input className={inputClass} value={form.phone} onChange={(e) => setField('phone', e.target.value)} placeholder="+8801…" />
            </Field>
            <Field label="Address">
              <input className={inputClass} value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </Field>
          </div>

          {/* Vehicles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Vehicles & Drivers</label>
              <button type="button" onClick={addVehicle} className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors">
                <Plus className="h-3 w-3" /> Add vehicle
              </button>
            </div>
            <div className="rounded-lg border divide-y">
              {form.vehicles.map((v, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
                  <div className="col-span-4">
                    <input className={inputClass + ' h-9 font-mono'} placeholder="DM TA 12-1212" value={v.vehicleNo} onChange={(e) => setVehicle(i, 'vehicleNo', e.target.value.toUpperCase())} />
                  </div>
                  <div className="col-span-3">
                    <input className={inputClass + ' h-9'} placeholder="Driver name" value={v.driverName} onChange={(e) => setVehicle(i, 'driverName', e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <input className={inputClass + ' h-9'} placeholder="Driver phone" value={v.driverPhone} onChange={(e) => setVehicle(i, 'driverPhone', e.target.value)} />
                  </div>
                  <button type="button" className="col-span-1 h-9 grid place-items-center text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors" onClick={() => removeVehicle(i)} aria-label="Remove vehicle">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Vehicle format: DM TA 12-1212 (City Series Number-Number)</p>
          </div>
        </div>
      </CreateDialog>

      <ViewDialog
        open={viewItem !== null}
        onOpenChange={(o) => !o && setViewItem(null)}
        code={viewItem?.code}
        title={viewItem?.name || ''}
        subtitle={viewItem?.phone || undefined}
        fields={viewItem ? viewFields(viewItem) : []}
        onPrint={() => viewItem && handlePrint(viewItem)}
        footer={
          viewItem && viewItem.vehicles && viewItem.vehicles.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Vehicles & Drivers</p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Vehicle No.</th>
                      <th className="text-left p-2">Driver Name</th>
                      <th className="text-left p-2">Driver Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewItem.vehicles.map((v) => (
                      <tr key={v.id} className="border-t">
                        <td className="p-2 font-mono font-medium">{v.vehicleNo}</td>
                        <td className="p-2">{v.driverName || '—'}</td>
                        <td className="p-2 tabular-nums">{v.driverPhone || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : undefined
        }
      />

      <AlertDialog open={deleteItem !== null} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transport vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <span className="font-mono font-semibold">{deleteItem?.code}</span> — {deleteItem?.name} and all its vehicles.
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
