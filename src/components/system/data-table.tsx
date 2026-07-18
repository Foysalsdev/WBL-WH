'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
//  DataTable — sortable, scrollable table with sticky header
//  Premium polish: hover state lifts row, alternating zebra,
//  smooth animations on sort change.
// ═══════════════════════════════════════════════════════════════

export interface Column<T> {
  key: string
  header: string
  /** Render function for the cell */
  cell: (row: T) => ReactNode
  /** Sort comparator — omit to make column non-sortable */
  sort?: (a: T, b: T) => number
  /** Default sort direction when first clicked (default: 'asc') */
  defaultDir?: 'asc' | 'desc'
  align?: 'left' | 'right' | 'center'
  className?: string
  /** Width hint — e.g. "w-32" */
  width?: string
  /** Don't pad horizontal — useful for action columns */
  noPadding?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  /** Get unique key for each row */
  rowKey: (row: T) => string
  /** Optional row click handler */
  onRowClick?: (row: T) => void
  /** Max height in px (default 600) */
  maxHeight?: number
  /** Initial sort column key */
  initialSortKey?: string
  initialSortDir?: 'asc' | 'desc'
  /** Empty state element shown when data is empty */
  emptyState?: ReactNode
}

export function DataTable<T>({
  data, columns, rowKey, onRowClick,
  maxHeight = 600,
  initialSortKey, initialSortDir = 'asc',
  emptyState,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | undefined>(initialSortKey)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir)

  const sorted = useMemo(() => {
    if (!sortKey) return data
    const col = columns.find((c) => c.key === sortKey)
    if (!col?.sort) return data
    const arr = [...data]
    arr.sort((a, b) => {
      const cmp = col.sort!(a, b)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [data, sortKey, sortDir, columns])

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      const col = columns.find((c) => c.key === key)
      setSortDir(col?.defaultDir || 'asc')
    }
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <div className="rounded-lg border overflow-hidden bg-card">
      <div style={{ maxHeight }} className="overflow-auto overscroll-contain -webkit-overflow-scrolling-touch">
        <Table className="min-w-[700px] md:min-w-0 w-full">
          <TableHeader className="sticky top-0 bg-muted/40 backdrop-blur z-10 border-b">
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => {
                const isSortable = !!col.sort
                const isActive = sortKey === col.key
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      'h-10 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.width,
                      col.className,
                    )}
                  >
                    {isSortable ? (
                      <button
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          'inline-flex items-center gap-1 transition-colors hover:text-foreground',
                          col.align === 'right' && 'flex-row-reverse',
                          isActive && 'text-foreground',
                        )}
                      >
                        {col.header}
                        {isActive ? (
                          sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-30" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, idx) => (
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'group transition-colors',
                  // Subtle zebra stripe — only on even rows
                  idx % 2 === 1 && 'bg-muted/20',
                  // Hover state
                  'hover:bg-primary/5',
                  onRowClick && 'cursor-pointer',
                )}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      'py-2.5 px-3 text-sm overflow-hidden',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      !col.noPadding && 'px-4',
                      col.className,
                    )}
                  >
                    <div className="truncate max-w-[250px]" title={typeof col.cell(row) === 'string' ? col.cell(row) as string : undefined}>
                      {col.cell(row)}
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── Helper cell renderers ───────────────────────────────────────

/** Clickable code cell — looks like a link, opens detail view */
export function CodeCell({ code, onClick }: { code: string; onClick?: () => void }) {
  if (!onClick) return <span className="font-mono text-xs">{code}</span>
  return (
    <button className="code-link" onClick={(e) => { e.stopPropagation(); onClick() }}>
      {code}
    </button>
  )
}
