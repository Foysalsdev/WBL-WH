'use client'

import { type ReactNode } from 'react'
import { Search, RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
//  SearchToolbar — the universal list-page toolbar
//  Combines: search input (with icon) + optional filter slot + refresh
// ═══════════════════════════════════════════════════════════════

interface SearchToolbarProps {
  search: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  onRefresh: () => void
  isRefreshing?: boolean
  /** Slot for filter dropdowns, range pickers, etc. */
  filters?: ReactNode
  /** Optional extra actions on the right (e.g. "New" button) */
  actions?: ReactNode
}

export function SearchToolbar({
  search, onSearchChange, searchPlaceholder = 'Search…',
  onRefresh, isRefreshing, filters, actions,
}: SearchToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center justify-between mb-3 md:mb-4">
      <div className="relative flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          className="pl-9 h-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {filters}
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={onRefresh} title="Refresh" aria-label="Refresh">
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
        </Button>
        {actions}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  Field — labeled form field wrapper
// ═══════════════════════════════════════════════════════════════

interface FieldProps {
  label: string
  /** Hint text shown below the input */
  hint?: string
  /** Mark label with red asterisk */
  required?: boolean
  /** Span N columns in a grid parent */
  className?: string
  children: ReactNode
}

export function Field({ label, hint, required, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  EmptyTableState — friendly empty state inside a bordered table card
// ═══════════════════════════════════════════════════════════════

export function ListLoadingState({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
  // (cols is used implicitly by parent grid; kept for API symmetry)
  void cols
}
