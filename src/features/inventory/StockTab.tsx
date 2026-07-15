'use client'

import { useState } from 'react'
import { Boxes, Wallet, AlertTriangle, Ban, Plus } from 'lucide-react'
import { StatCard, EmptyState } from '@/components/system'
import { DataTable, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useInventory } from './hooks'
import { StockAdjustmentDialog } from './StockAdjustmentDialog'
import { bdt, num } from '@/lib/format'
import { useDebounce } from '@/lib/hooks/use-debounce'
import type { InventoryItem } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  StockTab — list of inventory items with search, filter, sort
//  Built on shared DataTable + MasterTabShell (no local sort state)
// ═══════════════════════════════════════════════════════════════

export function StockTab() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low'>('all')
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)

  const debouncedSearch = useDebounce(search, 250)

  const { data, isLoading, isError, refetch } = useInventory({
    search: debouncedSearch || undefined,
    low: filter === 'low',
  })

  const totals = (data || []).reduce(
    (acc, r) => {
      acc.units += r.quantity
      acc.value += r.value
      acc.damaged += r.damaged
      if (r.isLow) acc.low += 1
      return acc
    },
    { units: 0, value: 0, damaged: 0, low: 0 },
  )

  const columns: Column<InventoryItem>[] = [
    { key: 'sku',      header: 'SKU',       align: 'left',   cell: (r) => <span className="font-mono text-xs">{r.sku}</span>, sort: (a, b) => a.sku.localeCompare(b.sku) },
    { key: 'name',     header: 'Product',   cell: (r) => <span className="font-medium">{r.name}</span>, sort: (a, b) => a.name.localeCompare(b.name) },
    { key: 'category', header: 'Category',  cell: (r) => <span className="text-xs text-muted-foreground">{r.category || '—'}</span>, sort: (a, b) => (a.category || '').localeCompare(b.category || '') },
    { key: 'quantity', header: 'On Hand',   align: 'right',  cell: (r) => <span className="tabular-nums font-medium">{num(r.quantity)}</span>, sort: (a, b) => a.quantity - b.quantity },
    { key: 'reserved', header: 'Reserved',  align: 'right',  cell: (r) => <span className="tabular-nums text-amber-600">{num(r.reserved)}</span> },
    { key: 'available',header: 'Available', align: 'right',  cell: (r) => <span className="tabular-nums text-emerald-600 font-medium">{num(r.available)}</span>, sort: (a, b) => a.available - b.available },
    { key: 'damaged',  header: 'Damaged',   align: 'right',  cell: (r) => <span className="tabular-nums text-rose-600">{num(r.damaged)}</span> },
    { key: 'value',    header: 'Value',     align: 'right',  cell: (r) => <span className="tabular-nums">{bdt(r.value)}</span>, sort: (a, b) => a.value - b.value },
    {
      key: 'status', header: 'Status', align: 'center',
      cell: (r) => r.isLow
        ? <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/5">Low</Badge>
        : <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">OK</Badge>,
    },
    {
      key: 'action', header: 'Action', align: 'right',
      cell: (r) => <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setAdjustItem(r) }}>Adjust</Button>,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Units" value={num(totals.units)} icon={Boxes} />
        <StatCard label="Stock Value" value={bdt(totals.value)} icon={Wallet} tone="success" />
        <StatCard label="Low-Stock SKUs" value={num(totals.low)} icon={AlertTriangle} tone={totals.low > 0 ? 'warning' : 'default'} />
        <StatCard label="Damaged Units" value={num(totals.damaged)} icon={Ban} tone="destructive" />
      </div>

      <MasterTabShell<InventoryItem>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by SKU, name or category…"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && (data?.length || 0) === 0}
        emptyTitle="No products match your filter"
        emptyDescription="Try clearing the search or changing the filter."
        emptyIcon={Boxes}
        onRetry={() => refetch()}
        filters={
          <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'low')}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stock</SelectItem>
              <SelectItem value="low">Low stock only</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <DataTable
          data={data || []}
          columns={columns}
          rowKey={(r) => r.id}
          initialSortKey="sku"
          initialSortDir="asc"
        />
      </MasterTabShell>

      <StockAdjustmentDialog
        open={adjustItem !== null}
        onOpenChange={(o) => !o && setAdjustItem(null)}
        item={adjustItem}
        onDone={() => { setAdjustItem(null); refetch() }}
      />
    </div>
  )
}
