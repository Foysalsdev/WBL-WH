'use client'

import { type ReactNode } from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
//  PageHeader — consistent page top with title, description, actions
// ═══════════════════════════════════════════════════════════════

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: ReactNode
  /** Optional breadcrumb trail above the title */
  breadcrumb?: ReactNode
}

export function PageHeader({ title, description, icon: Icon, actions, breadcrumb }: PageHeaderProps) {
  return (
    <div className="mb-4 md:mb-6 animate-slide-up">
      {breadcrumb && (
        <nav className="mb-2 hidden md:flex items-center gap-1.5 text-xs text-muted-foreground overflow-hidden">
          {breadcrumb}
        </nav>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="relative grid place-items-center h-10 w-10 md:h-12 md:w-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary shrink-0 border border-primary/10">
              <Icon className="h-4 md:h-5 w-4 md:w-5" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-semibold tracking-tight truncate leading-tight">{title}</h1>
            {description && <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1 line-clamp-2">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  StatCard — KPI tile with optional trend & tone
// ═══════════════════════════════════════════════════════════════

type StatTone = 'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info'

const TONE_STYLES: Record<StatTone, string> = {
  default:    'bg-muted text-foreground',
  primary:    'bg-primary/10 text-primary',
  success:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warning:    'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  destructive:'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  info:       'bg-sky-500/10 text-sky-600 dark:text-sky-400',
}

interface StatCardProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: LucideIcon
  tone?: StatTone
  /** Optional trend indicator like "+12% vs last week" */
  trend?: { value: string; direction: 'up' | 'down' | 'flat' }
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'default', trend }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl glass-card p-3 md:p-5">
      {/* Subtle tone-colored glow in top-right */}
      <div className={cn(
        'absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-40 transition-opacity group-hover:opacity-70',
        tone === 'success' && 'bg-emerald-500',
        tone === 'warning' && 'bg-amber-500',
        tone === 'destructive' && 'bg-rose-500',
        tone === 'info' && 'bg-sky-500',
        tone === 'primary' && 'bg-primary',
        tone === 'default' && 'bg-muted-foreground',
      )} />
      <div className="relative flex items-start justify-between mb-2 md:mb-3">
        <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{label}</p>
        {Icon && (
          <div className={cn('grid place-items-center h-7 w-7 md:h-9 md:w-9 rounded-lg transition-transform group-hover:scale-110 shrink-0', TONE_STYLES[tone])}>
            <Icon className="h-3.5 md:h-4 w-3.5 md:w-4" />
          </div>
        )}
      </div>
      <p className="relative text-lg md:text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="relative flex items-center gap-2 mt-1 md:mt-1.5">
        {hint && <p className="text-[10px] md:text-xs text-muted-foreground truncate">{hint}</p>}
        {trend && (
          <span className={cn(
            'text-xs font-medium tabular-nums',
            trend.direction === 'up' && 'text-emerald-600',
            trend.direction === 'down' && 'text-rose-600',
            trend.direction === 'flat' && 'text-muted-foreground',
          )}>
            {trend.direction === 'up' && '↑'}{trend.direction === 'down' && '↓'}{trend.value}
          </span>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  EmptyState — friendly placeholder for empty collections
// ═══════════════════════════════════════════════════════════════

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      {Icon && (
        <div className="grid place-items-center h-14 w-14 rounded-full bg-muted text-muted-foreground mb-4">
          <Icon className="h-6 w-6" />
        </div>
      )}
      <p className="text-base font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  StatusBadge — color-coded status pill for documents & orders
// ═══════════════════════════════════════════════════════════════

const STATUS_STYLES: Record<string, string> = {
  // PO statuses
  draft:       'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20',
  ordered:     'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  partial:     'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  received:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  // SO statuses (5-step workflow)
  confirmed:   'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
  picked:      'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  scanned:     'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
  invoiced:    'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  dispatched:  'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  delivered:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  cancelled:   'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  // POD
  pending:     'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  failed:      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  rescheduled: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
}

export function StatusBadge({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' }) {
  const cls = STATUS_STYLES[status] || 'bg-muted text-muted-foreground border-border'
  return (
    <span className={cn(
      'inline-flex items-center rounded-full border font-medium capitalize',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
      cls,
    )}>
      {status}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
//  MovementPill — typed pill for stock movements
// ═══════════════════════════════════════════════════════════════

const MOVEMENT_STYLES: Record<string, string> = {
  IN:       'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  OUT:      'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  ADJUST:   'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  TRANSFER: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
}

export function MovementPill({ type }: { type: string }) {
  const cls = MOVEMENT_STYLES[type] || 'bg-muted text-muted-foreground border-border'
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold', cls)}>
      {type}
    </span>
  )
}
