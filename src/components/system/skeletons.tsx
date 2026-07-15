'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
//  Loading skeletons — composable placeholders
// ═══════════════════════════════════════════════════════════════

export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex items-center gap-3">
      <Skeleton className="h-11 w-11 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
    </div>
  )
}

export function StatCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-32 mb-1.5" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-6', className)}>
      <Skeleton className="h-5 w-48 mb-1" />
      <Skeleton className="h-4 w-64 mb-4" />
      <Skeleton className="h-[280px] w-full" />
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="bg-muted/30 px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="border-t px-4 py-3 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, c) => <Skeleton key={c} className="h-4 w-full" />)}
        </div>
      ))}
    </div>
  )
}
