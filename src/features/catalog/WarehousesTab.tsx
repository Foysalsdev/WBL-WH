'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Printer, Trash2, MapPin, Boxes } from 'lucide-react'
import { StatCard } from '@/components/system'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { CreateDialog } from '@/components/system/create-dialog'
import { ViewDialog, type ViewField } from '@/components/system/view-dialog'
import { RowActions } from '@/components/system/row-actions'
import { Field } from '@/components/system/forms'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { warehousesApi } from '@/lib/api/endpoints'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { inputClass } from '@/lib/styles'
import { toast } from 'sonner'
import { num } from '@/lib/format'
import type { Warehouse, WarehouseInput } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  WarehousesTab — premium card grid of warehouses with click-to-view
// ═══════════════════════════════════════════════════════════════

const EMPTY_FORM: WarehouseInput = {
  code: '', name: '', address: '', city: '', capacity: 10000,
}

export function WarehousesTab() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewItem, setViewItem] = useState<Warehouse | null>(null)
  const [deleteItem, setDeleteItem] = useState<Warehouse | null>(null)
  const [form, setForm] = useState<WarehouseInput>(EMPTY_FORM)
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['warehouses', debouncedSearch],
    queryFn: () => warehousesApi.list(),
  })

  const createMutation = useMutation({
    mutationFn: (input: WarehouseInput) => warehousesApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const filtered = (data || []).filter((w) => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return w.code.toLowerCase().includes(q) ||
           w.name.toLowerCase().includes(q) ||
           (w.city || '').toLowerCase().includes(q)
  })

  function setField<K extends keyof WarehouseInput>(key: K, value: WarehouseInput[K]) {
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
      const w = await createMutation.mutateAsync(form)
      toast.success('Warehouse created', { description: `${w.code} · ${w.name}` })
      setCreateOpen(false)
    } catch (e: any) {
      toast.error('Failed to create warehouse', { description: e.message })
    }
  }

  function handlePrint(w: Warehouse) {
    toast.info('Print preview', { description: `Generating PDF for ${w.code}…` })
  }

  function handleDelete() {
    if (!deleteItem) return
    toast.info('Delete coming soon', {
      description: `Delete for ${deleteItem.code} will be wired in Phase 7.`,
    })
    setDeleteItem(null)
  }

  function viewFields(w: Warehouse): ViewField[] {
    return [
      { label: 'Code', value: w.code, mono: true },
      { label: 'Name', value: w.name },
      { label: 'Address', value: w.address || '—', full: true },
      { label: 'City', value: w.city || '—' },
      { label: 'Capacity', value: `${num(w.capacity)} units`, mono: true },
      { label: 'Locations', value: num(w.locations?.length || 0), mono: true },
    ]
  }

  const totalLocations = (data || []).reduce((s, w) => s + (w.locations?.length || 0), 0)
  const totalCapacity = (data || []).reduce((s, w) => s + w.capacity, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 stagger">
        <StatCard label="Warehouses" value={num(data?.length || 0)} icon={Building2} tone="primary" />
        <StatCard label="Total Locations" value={num(totalLocations)} tone="info" icon={MapPin} />
        <StatCard label="Total Capacity" value={`${num(totalCapacity)} units`} tone="success" icon={Boxes} />
      </div>

      <MasterTabShell<Warehouse>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search warehouses…"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && filtered.length === 0}
        emptyTitle="No warehouses yet"
        emptyDescription="Add your first warehouse to start tracking stock locations."
        emptyIcon={Building2}
        onRetry={() => refetch()}
        primaryAction={{ label: 'New warehouse', icon: Plus, onClick: openCreate }}
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
            {filtered.map((w) => (
              <Card
                key={w.id}
                className="card-premium cursor-pointer group"
                onClick={() => setViewItem(w)}
              >
                <CardContent className="p-5 relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="grid place-items-center h-11 w-11 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 text-primary border border-primary/10 transition-transform group-hover:scale-110">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="font-mono">{w.code}</Badge>
                  </div>
                  <p className="font-semibold text-base">{w.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {w.address || '—'}, {w.city || '—'}
                  </p>
                  <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Locations</p>
                      <p className="font-medium tabular-nums">{num(w.locations?.length || 0)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Capacity</p>
                      <p className="font-medium tabular-nums">{num(w.capacity)} units</p>
                    </div>
                  </div>

                  {/* Row actions overlay (top-right) */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      onView={() => setViewItem(w)}
                      onPrint={() => handlePrint(w)}
                      onDelete={() => setDeleteItem(w)}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </MasterTabShell>

      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Warehouse"
        description="Add a new storage facility."
        onSubmit={submitCreate}
        submitLabel={createMutation.isPending ? 'Creating…' : 'Create'}
        disabled={createMutation.isPending}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Code" required>
            <input className={inputClass} value={form.code} onChange={(e) => setField('code', e.target.value)} placeholder="WHS-TONGI" />
          </Field>
          <Field label="Name" required>
            <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Tongi Central Warehouse" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <input className={inputClass} value={form.address} onChange={(e) => setField('address', e.target.value)} />
            </Field>
          </div>
          <Field label="City">
            <input className={inputClass} value={form.city} onChange={(e) => setField('city', e.target.value)} />
          </Field>
          <Field label="Capacity (units)">
            <input type="number" min="0" className={inputClass} value={form.capacity} onChange={(e) => setField('capacity', Number(e.target.value))} />
          </Field>
        </div>
      </CreateDialog>

      <ViewDialog
        open={viewItem !== null}
        onOpenChange={(o) => !o && setViewItem(null)}
        code={viewItem?.code}
        title={viewItem?.name || ''}
        subtitle={viewItem ? `${viewItem.address || '—'}, ${viewItem.city || '—'}` : ''}
        badge={viewItem ? { label: 'Active', tone: 'success' } : undefined}
        fields={viewItem ? viewFields(viewItem) : []}
        onEdit={() => { toast.info('Edit coming soon'); setViewItem(null) }}
        onPrint={() => viewItem && handlePrint(viewItem)}
        footer={
          viewItem && viewItem.locations && viewItem.locations.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Storage Locations</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {viewItem.locations.slice(0, 12).map((loc) => (
                  <div key={loc.id} className="rounded-md border bg-muted/40 px-2 py-1.5 text-xs font-mono">
                    {loc.zone}-{loc.rack}-{loc.bin}
                  </div>
                ))}
                {viewItem.locations.length > 12 && (
                  <div className="rounded-md border border-dashed bg-muted/20 px-2 py-1.5 text-xs text-muted-foreground">
                    +{viewItem.locations.length - 12} more
                  </div>
                )}
              </div>
            </div>
          ) : undefined
        }
      />

      <AlertDialog open={deleteItem !== null} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete warehouse?</AlertDialogTitle>
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
