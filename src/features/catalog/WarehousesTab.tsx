'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'
import { StatCard } from '@/components/system'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { CreateDialog } from '@/components/system/create-dialog'
import { Field } from '@/components/system/forms'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { warehousesApi } from '@/lib/api/endpoints'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { inputClass } from '@/lib/styles'
import { toast } from 'sonner'
import { num } from '@/lib/format'
import type { Warehouse, WarehouseInput } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  WarehousesTab — card grid of warehouses with location counts
// ═══════════════════════════════════════════════════════════════

const EMPTY_FORM: WarehouseInput = {
  code: '', name: '', address: '', city: '', capacity: 10000,
}

export function WarehousesTab() {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
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

  async function submit() {
    if (!form.code || !form.name) {
      toast.error('Code and name are required')
      return
    }
    try {
      const w = await createMutation.mutateAsync(form)
      toast.success('Warehouse created', { description: `${w.code} · ${w.name}` })
      setOpen(false)
      setForm(EMPTY_FORM)
    } catch (e: any) {
      toast.error('Failed to create warehouse', { description: e.message })
    }
  }

  const totalLocations = (data || []).reduce((s, w) => s + (w.locations?.length || 0), 0)
  const totalCapacity = (data || []).reduce((s, w) => s + w.capacity, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label="Warehouses" value={num(data?.length || 0)} icon={Building2} />
        <StatCard label="Total Locations" value={num(totalLocations)} tone="info" />
        <StatCard label="Total Capacity" value={`${num(totalCapacity)} units`} tone="success" />
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
        primaryAction={{ label: 'New warehouse', icon: Plus, onClick: () => setOpen(true) }}
      >
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((w) => (
              <Card key={w.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="grid place-items-center h-11 w-11 rounded-lg bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className="font-mono">{w.code}</Badge>
                  </div>
                  <p className="font-semibold text-base">{w.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{w.address || '—'}, {w.city || '—'}</p>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </MasterTabShell>

      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        title="New Warehouse"
        description="Add a new storage facility."
        onSubmit={submit}
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
    </div>
  )
}
