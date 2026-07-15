'use client'

import { type ReactNode } from 'react'
import { Plus, type LucideIcon } from 'lucide-react'
import { PageHeader, EmptyState } from '@/components/system'
import { SearchToolbar, ListLoadingState } from '@/components/system/forms'
import { Button } from '@/components/ui/button'

// ═══════════════════════════════════════════════════════════════
//  MasterTabShell — the universal skeleton for a master tab
//  Handles: PageHeader-equivalent, search toolbar, refresh, loading,
//  empty, error states. The caller supplies just the data + table.
// ═══════════════════════════════════════════════════════════════

interface MasterTabShellProps<T> {
  /** Show the search input + refresh button (default: true) */
  searchable?: boolean
  searchPlaceholder?: string
  search: string
  onSearchChange: (v: string) => void

  /** Slot for filter dropdowns etc. */
  filters?: ReactNode

  /** Optional right-aligned action (e.g. "New product" button) */
  primaryAction?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }

  /** Loading / error / empty state */
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  isEmpty?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: LucideIcon

  /** Retry handler when in error state */
  onRetry?: () => void
  onRefresh?: () => void

  /** The actual content (table, card grid, etc.) */
  children: ReactNode

  /** Optional secondary content below the table (e.g. footer count) */
  footer?: ReactNode
}

export function MasterTabShell<T>({
  searchable = true,
  searchPlaceholder = 'Search…',
  search, onSearchChange,
  filters,
  primaryAction,
  isLoading, isError, errorMessage,
  isEmpty, emptyTitle = 'No records', emptyDescription, emptyIcon,
  onRetry, onRefresh,
  children, footer,
}: MasterTabShellProps<T>) {
  // (We use useDebounce at the call site instead of here so callers control
  //  the timing of when queries are issued.)

  if (isError) {
    return (
      <EmptyState
        icon={emptyIcon}
        title="Couldn't load data"
        description={errorMessage || 'There was a problem fetching data.'}
        action={onRetry ? <Button onClick={onRetry}>Retry</Button> : undefined}
      />
    )
  }

  if (isEmpty && !isLoading) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
        action={primaryAction ? (
          <Button onClick={primaryAction.onClick}>
            {primaryAction.icon ? <primaryAction.icon className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {primaryAction.label}
          </Button>
        ) : undefined}
      />
    )
  }

  return (
    <div className="space-y-4">
      {searchable && (
        <SearchToolbar
          search={search}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          onRefresh={onRefresh || (() => {})}
          isRefreshing={isLoading}
          filters={filters}
          actions={primaryAction ? (
            <Button onClick={primaryAction.onClick}>
              {primaryAction.icon ? <primaryAction.icon className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {primaryAction.label}
            </Button>
          ) : undefined}
        />
      )}

      {isLoading ? (
        <ListLoadingState rows={8} />
      ) : (
        <>
          {children}
          {footer}
        </>
      )}
    </div>
  )
}

// Re-export so callers can do everything from one file
export { PageHeader }
