'use client'

import { useState, useMemo } from 'react'
import {
  Search, RefreshCw, Boxes, Wallet, AlertTriangle, Ban, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { PageHeader, StatCard, EmptyState } from '@/components/system'
import { TableSkeleton } from '@/components/system/skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useInventory } from './hooks'
import { StockAdjustmentDialog } from './StockAdjustmentDialog'
import { bdt, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { InventoryItem } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  StockTab — list of inventory items with search, filter, sort
// ═══════════════════════════════════════════════════════════════

type SortKey = 'sku' | 'name' | 'quantity' | 'available' | 'value' | 'category'
type SortDir = 'asc' | 'desc'

export function StockTab() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('sku')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null)

  // Debounce search input
  const debouncedSearch = useDebounce(search, 250)

  const { data, isLoading, isError, refetch } = useInventory({
    search: debouncedSearch || undefined,
    low: filter === 'low',
  })

  // Client-side sort on the validated data
  const sorted = useMemo(() => {
    if (!data) return []
    const arr = [...data]
    arr.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'sku':       cmp = a.sku.localeCompare(b.sku); break
        case 'name':      cmp = a.name.localeCompare(b.name); break
        case 'category':  cmp = (a.category || '').localeCompare(b.category || ''); break
        case 'quantity':  cmp = a.quantity - b.quantity; break
        case 'available': cmp = a.available - b.available; break
        case 'value':     cmp = a.value - b.value; break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [data, sortKey, sortDir])

  const totals = useMemo(() => ({
    units: (data || []).reduce((s, r) => s + r.quantity, 0),
    value: (data || []).reduce((s, r) => s + r.value, 0),
    low: (data || []).filter((r) => r.isLow).length,
    damaged: (data || []).reduce((s, r) => s + r.damaged, 0),
  }), [data])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary stat cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Units" value={num(totals.units)} icon={Boxes} />
        <StatCard label="Stock Value" value={bdt(totals.value)} icon={Wallet} tone="success" />
        <StatCard label="Low-Stock SKUs" value={num(totals.low)} icon={AlertTriangle} tone={totals.low > 0 ? 'warning' : 'default'} />
        <StatCard label="Damaged Units" value={num(totals.damaged)} icon={Ban} tone="destructive" />
      </div>

      <Card>
        <CardContent className="p-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU, name or category…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stock</SelectItem>
                  <SelectItem value="low">Low stock only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Loading state */}
          {isLoading ? (
            <TableSkeleton rows={8} cols={8} />
          ) : isError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Couldn't load inventory"
              description="There was a problem fetching stock data."
              action={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No products match your filter"
              description="Try clearing the search or changing the filter."
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <SortableHead label="SKU" sortKey="sku" current={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortableHead label="Product" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortableHead label="Category" sortKey="category" current={sortKey} dir={sortDir} onSort={toggleSort} />
                      <SortableHead label="On Hand" sortKey="quantity" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                      <TableHead className="text-right">Reserved</TableHead>
                      <SortableHead label="Available" sortKey="available" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                      <TableHead className="text-right">Damaged</TableHead>
                      <SortableHead label="Value" sortKey="value" current={sortKey} dir={sortDir} onSort={toggleSort} align="right" />
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sorted.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">{row.category || '—'}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{num(row.quantity)}</TableCell>
                        <TableCell className="text-right tabular-nums text-amber-600">{num(row.reserved)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600 font-medium">{num(row.available)}</TableCell>
                        <TableCell className="text-right tabular-nums text-rose-600">{num(row.damaged)}</TableCell>
                        <TableCell className="text-right tabular-nums">{bdt(row.value)}</TableCell>
                        <TableCell className="text-center">
                          {row.isLow ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/5">Low</Badge>
                          ) : (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">OK</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setAdjustItem(row)}>
                            Adjust
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <StockAdjustmentDialog
        open={adjustItem !== null}
        onOpenChange={(o) => !o && setAdjustItem(null)}
        item={adjustItem}
        onDone={() => {
          setAdjustItem(null)
          refetch()
        }}
      />
    </div>
  )
}

// ─── Sortable header cell ────────────────────────────────────────
function SortableHead({
  label, sortKey, current, dir, onSort, align = 'left',
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  align?: 'left' | 'right'
}) {
  const isActive = current === sortKey
  return (
    <TableHead className={align === 'right' ? 'text-right' : ''}>
      <button
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground transition-colors',
          align === 'right' && 'flex-row-reverse',
          isActive && 'text-foreground',
        )}
      >
        {label}
        {isActive ? (
          dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}

// ─── Debounce hook ───────────────────────────────────────────────
import { useEffect } from 'react'
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
