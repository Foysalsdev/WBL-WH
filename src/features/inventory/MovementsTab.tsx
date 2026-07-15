'use client'

import { useState, useMemo } from 'react'
import { Search, RefreshCw, History, ArrowDownLeft, ArrowUpRight, Activity } from 'lucide-react'
import { EmptyState, MovementPill } from '@/components/system'
import { TableSkeleton } from '@/components/system/skeletons'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useMovements } from './hooks'
import { dateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
//  MovementsTab — immutable stock movement ledger
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

  // Apply search filter client-side (since backend search isn't available for movements)
  const filtered = useMemo(() => {
    if (!data) return []
    if (!debouncedSearch) return data
    const q = debouncedSearch.toLowerCase()
    return data.filter((m) =>
      m.product?.sku?.toLowerCase().includes(q) ||
      m.product?.name?.toLowerCase().includes(q) ||
      m.reference?.toLowerCase().includes(q) ||
      m.notes?.toLowerCase().includes(q)
    )
  }, [data, debouncedSearch])

  // Quick stats
  const stats = useMemo(() => {
    const totalIn = (data || []).filter((m) => m.type === 'IN').reduce((s, m) => s + m.quantity, 0)
    const totalOut = (data || []).filter((m) => m.type === 'OUT').reduce((s, m) => s + Math.abs(m.quantity), 0)
    const adjusts = (data || []).filter((m) => m.type === 'ADJUST').length
    return { totalIn, totalOut, adjusts, total: (data || []).length }
  }, [data])

  return (
    <div className="space-y-4">
      {/* Summary tiles */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <SummaryTile label="Total Entries" value={stats.total} icon={History} />
        <SummaryTile label="Inbound Units" value={stats.totalIn} icon={ArrowDownLeft} tone="text-emerald-600" />
        <SummaryTile label="Outbound Units" value={stats.totalOut} icon={ArrowUpRight} tone="text-rose-600" />
        <SummaryTile label="Adjustments" value={stats.adjusts} icon={Activity} tone="text-amber-600" />
      </div>

      <Card>
        <CardContent className="p-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SKU, reference or notes…"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="IN">Inbound only</SelectItem>
                  <SelectItem value="OUT">Outbound only</SelectItem>
                  <SelectItem value="ADJUST">Adjustments only</SelectItem>
                  <SelectItem value="TRANSFER">Transfers only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <TableSkeleton rows={10} cols={6} />
          ) : isError ? (
            <EmptyState
              icon={History}
              title="Couldn't load movement ledger"
              description="There was a problem fetching the ledger."
              action={<Button onClick={() => refetch()}>Retry</Button>}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={History}
              title="No movements match your filter"
              description="Try clearing the search or changing the type filter."
            />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead className="w-44">When</TableHead>
                      <TableHead className="w-20">Type</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m) => (
                      <TableRow key={m.id} className="hover:bg-muted/40">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {dateTime(m.createdAt)}
                        </TableCell>
                        <TableCell><MovementPill type={m.type} /></TableCell>
                        <TableCell>
                          <div className="font-medium text-sm">{m.product?.name || '—'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{m.product?.sku}</div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{m.reference || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {m.notes || '—'}
                        </TableCell>
                        <TableCell className={cn(
                          'text-right tabular-nums font-semibold',
                          m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600',
                        )}>
                          {m.quantity > 0 ? '+' : ''}{m.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Footer count */}
          {filtered.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing <span className="font-medium text-foreground">{filtered.length}</span> of {data?.length || 0} entries</span>
              <span className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px]">Immutable</Badge>
                <span>Ledger is append-only</span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Summary tile (smaller than StatCard, inline) ────────────────
function SummaryTile({
  label, value, icon: Icon, tone,
}: {
  label: string
  value: number
  icon: any
  tone?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={cn('h-4 w-4', tone || 'text-muted-foreground')} />
      </div>
      <p className="text-xl font-semibold tabular-nums">{value.toLocaleString('en-IN')}</p>
    </div>
  )
}

// ─── Debounce hook (kept local for simplicity) ───────────────────
import { useEffect } from 'react'
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
