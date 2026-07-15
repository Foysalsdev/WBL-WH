'use client'

import { useState } from 'react'
import { Search, History, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react'
import { StatCard, MovementPill, EmptyState } from '@/components/system'
import { DataTable, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMovements } from './hooks'
import { dateTime } from '@/lib/format'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { cn } from '@/lib/utils'
import type { Movement } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  MovementsTab — immutable stock movement ledger
//  Built on shared DataTable + MasterTabShell (no local SummaryTile)
// ═══════════════════════════════════════════════════════════════

type TypeFilter = 'all' | 'IN' | 'OUT' | 'ADJUST' | 'TRANSFER'

export function MovementsTab() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const debouncedSearch = useDebounce(search, 250)

  const { data, isLoading, isError, refetch } = useMovements({
    limit: 200,
    type: typeFilter === 'all' ? undefined : typeFilter,
  })

  // Apply search client-side (server-side not implemented for movements)
  const filtered = (data || []).filter((m) => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return m.product?.sku?.toLowerCase().includes(q) ||
           m.product?.name?.toLowerCase().includes(q) ||
           m.reference?.toLowerCase().includes(q) ||
           m.notes?.toLowerCase().includes(q)
  })

  const stats = (data || []).reduce(
    (acc, m) => {
      acc.total += 1
      if (m.type === 'IN')    acc.in    += m.quantity
      if (m.type === 'OUT')   acc.out   += Math.abs(m.quantity)
      if (m.type === 'ADJUST')acc.adj   += 1
      return acc
    },
    { total: 0, in: 0, out: 0, adj: 0 },
  )

  const columns: Column<Movement>[] = [
    { key: 'when', header: 'When', cell: (m) => <span className="text-xs text-muted-foreground whitespace-nowrap">{dateTime(m.createdAt)}</span>, sort: (a, b) => a.createdAt.getTime() - b.createdAt.getTime(), defaultDir: 'desc' },
    { key: 'type', header: 'Type', cell: (m) => <MovementPill type={m.type} />, sort: (a, b) => a.type.localeCompare(b.type) },
    {
      key: 'product', header: 'Product',
      cell: (m) => (
        <>
          <div className="font-medium text-sm">{m.product?.name || '—'}</div>
          <div className="text-xs text-muted-foreground font-mono">{m.product?.sku}</div>
        </>
      ),
    },
    { key: 'reference', header: 'Reference', cell: (m) => <span className="font-mono text-xs">{m.reference || '—'}</span> },
    { key: 'notes', header: 'Notes', cell: (m) => <span className="text-xs text-muted-foreground max-w-xs truncate block">{m.notes || '—'}</span> },
    {
      key: 'quantity', header: 'Quantity', align: 'right',
      cell: (m) => <span className={cn('tabular-nums font-semibold', m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600')}>{m.quantity > 0 ? '+' : ''}{m.quantity}</span>,
      sort: (a, b) => a.quantity - b.quantity,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Entries" value={stats.total} icon={History} />
        <StatCard label="Inbound Units" value={stats.in} icon={ArrowDownLeft} tone="success" />
        <StatCard label="Outbound Units" value={stats.out} icon={ArrowUpRight} tone="destructive" />
        <StatCard label="Adjustments" value={stats.adj} icon={Activity} tone="warning" />
      </div>

      <MasterTabShell<Movement>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by SKU, reference or notes…"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && filtered.length === 0}
        emptyTitle="No movements match your filter"
        emptyDescription="Try clearing the search or changing the type filter."
        emptyIcon={History}
        onRetry={() => refetch()}
        filters={
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="IN">Inbound only</SelectItem>
              <SelectItem value="OUT">Outbound only</SelectItem>
              <SelectItem value="ADJUST">Adjustments only</SelectItem>
              <SelectItem value="TRANSFER">Transfers only</SelectItem>
            </SelectContent>
          </Select>
        }
        footer={
          filtered.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing <span className="font-medium text-foreground">{filtered.length}</span> of {data?.length || 0} entries</span>
              <span className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">Immutable</Badge>
                <span>Ledger is append-only</span>
              </span>
            </div>
          )
        }
      >
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(m) => m.id}
          initialSortKey="when"
          initialSortDir="desc"
        />
      </MasterTabShell>
    </div>
  )
}
