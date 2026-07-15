'use client'

import { MoreHorizontal, Eye, Pencil, Trash2, Printer, type LucideIcon } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
//  RowActions — the universal "⋮" menu for table rows
//  Provides View / Edit / Print / Delete with sensible defaults.
//  Callers can pass only the handlers they need — omitted actions
//  are not rendered.
// ═══════════════════════════════════════════════════════════════

interface RowActionsProps {
  onView?: () => void
  onEdit?: () => void
  onPrint?: () => void
  onDelete?: () => void
  /** Disable specific actions (e.g. can't delete received orders) */
  disabledActions?: ('view' | 'edit' | 'print' | 'delete')[]
  /** Alignment — usually right-aligned in the last column */
  align?: 'left' | 'right'
}

interface ActionDef {
  key: 'view' | 'edit' | 'print' | 'delete'
  label: string
  icon: LucideIcon
  handler?: () => void
  tone?: 'default' | 'destructive'
}

export function RowActions({
  onView, onEdit, onPrint, onDelete,
  disabledActions = [],
  align = 'right',
}: RowActionsProps) {
  const actions: ActionDef[] = [
    { key: 'view',  label: 'View details',  icon: Eye,     handler: onView,  tone: 'default' },
    { key: 'edit',  label: 'Edit',           icon: Pencil,  handler: onEdit,  tone: 'default' },
    { key: 'print', label: 'Print',          icon: Printer, handler: onPrint, tone: 'default' },
    { key: 'delete',label: 'Delete',         icon: Trash2,  handler: onDelete,tone: 'destructive' },
  ].filter((a) => a.handler) as ActionDef[]

  if (actions.length === 0) return null

  // Split destructive from non-destructive
  const mainActions = actions.filter((a) => a.tone !== 'destructive')
  const destructiveActions = actions.filter((a) => a.tone === 'destructive')

  return (
    <div
      className={cn('inline-flex', align === 'right' && 'justify-end w-full')}
      onClick={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted data-[state=open]:bg-muted"
            aria-label="Row actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {mainActions.map((a) => {
            const Icon = a.icon
            return (
              <DropdownMenuItem
                key={a.key}
                onClick={a.handler}
                disabled={disabledActions.includes(a.key)}
                className="cursor-pointer"
              >
                <Icon className="mr-2 h-4 w-4" />
                {a.label}
              </DropdownMenuItem>
            )
          })}
          {destructiveActions.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {destructiveActions.map((a) => {
                const Icon = a.icon
                return (
                  <DropdownMenuItem
                    key={a.key}
                    onClick={a.handler}
                    disabled={disabledActions.includes(a.key)}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {a.label}
                  </DropdownMenuItem>
                )
              })}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
