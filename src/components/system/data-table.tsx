'use client'

import { useState, useMemo, type ReactNode } from 'react'
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
//  DataTable — sortable, scrollable table with sticky header
//  Replaces the repeated sort-state + table markup pattern.
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
  /** Show hover effect on rows (default: true) */
  hover?: boolean
  /** Initial sort column key */
  initialSortKey?: string
  initialSortDir?: 'asc' | 'desc'
  /** Empty state element shown when data is empty */
  emptyState?: ReactNode
}

export function DataTable<T>({
  data, columns, rowKey, onRowClick,
  maxHeight = 600, hover = true,
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
    <div className="rounded-lg border overflow-hidden">
      <div style={{ maxHeight }} className="overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-card z-10">
            <TableRow>
              {columns.map((col) => {
                const isSortable = !!col.sort
                const isActive = sortKey === col.key
                return (
                  <TableHead
                    key={col.key}
                    className={cn(
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.className,
                    )}
                  >
                    {isSortable ? (
                      <button
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-foreground transition-colors',
                          col.align === 'right' && 'flex-row-reverse',
                          isActive && 'text-foreground',
                        )}
                      >
                        {col.header}
                        {isActive ? (
                          sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-40" />
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
            {sorted.map((row) => (
              <TableRow
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(hover && 'hover:bg-muted/40', onRowClick && 'cursor-pointer')}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.className,
                    )}
                  >
                    {col.cell(row)}
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
