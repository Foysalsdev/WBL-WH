'use client'
import { ReactNode } from 'react'

export function PageHeader({
  title, description, actions, icon,
}: {
  title: string
  description?: string
  actions?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="grid place-items-center h-11 w-11 rounded-xl bg-primary/10 text-primary shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({
  label, value, hint, icon, tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info'
}) {
  const toneMap = {
    default: 'bg-muted text-foreground',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    destructive: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  } as const
  return (
    <div className="rounded-xl border bg-card p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {icon && <div className={`grid place-items-center h-9 w-9 rounded-lg ${toneMap[tone]}`}>{icon}</div>}
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && <div className="grid place-items-center h-14 w-14 rounded-full bg-muted text-muted-foreground mb-4">{icon}</div>}
      <p className="text-base font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function BadgeFor({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:        'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
    ordered:      'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    partial:      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    confirmed:    'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    picked:       'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    packed:       'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    shipped:      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    received:     'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    delivered:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    cancelled:    'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  }
  const cls = map[status] || 'bg-muted text-muted-foreground border-border'
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  )
}

export function MovementTypePill({ type }: { type: string }) {
  const map: Record<string, string> = {
    IN:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    OUT:     'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    ADJUST:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    TRANSFER:'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  }
  const cls = map[type] || 'bg-muted text-muted-foreground border-border'
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {type}
    </span>
  )
}
