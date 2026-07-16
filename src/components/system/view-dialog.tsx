'use client'

import { type ReactNode } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@/components/ui/visually-hidden'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, Printer, Pencil } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
//  ViewDialog — universal detail view for master records
//  Header shows the record code, name, and optional status badge
//  + Edit / Print actions in the top-right.
// ═══════════════════════════════════════════════════════════════

interface ViewField {
  label: string
  value: ReactNode
  /** Span full width in grid */
  full?: boolean
  /** Mono font for codes/numbers */
  mono?: boolean
}

interface ViewDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  /** Big code shown in header (e.g. "WHP-REF-265L-IM") */
  code?: string
  /** Primary title (e.g. "Whirlpool Protton 265L Refrigerator") */
  title: string
  /** Subtitle (e.g. "Refrigerator · pcs") */
  subtitle?: string
  /** Optional status badge shown in header */
  badge?: { label: string; tone?: 'default' | 'success' | 'warning' | 'destructive' | 'info' }
  /** Formatted detail fields */
  fields: ViewField[]
  /** Optional footer content (e.g. related records) */
  footer?: ReactNode
  /** Header actions */
  onEdit?: () => void
  onPrint?: () => void
  /** Override width */
  maxWidth?: string
}

const BADGE_TONES: Record<string, string> = {
  default:    'bg-muted text-muted-foreground border-border',
  success:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  warning:    'bg-amber-500/10 text-amber-600 border-amber-500/30',
  destructive:'bg-rose-500/10 text-rose-600 border-rose-500/30',
  info:       'bg-sky-500/10 text-sky-600 border-sky-500/30',
}

export function ViewDialog({
  open, onOpenChange, code, title, subtitle, badge, fields,
  footer, onEdit, onPrint, maxWidth,
}: ViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidth || 'max-w-3xl'} showCloseButton={false} >
        <VisuallyHidden>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </VisuallyHidden>

        {/* Header — code + title + badge + close */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b">
          <div className="min-w-0 flex-1">
            {code && (
              <p className="font-mono text-xs text-muted-foreground mb-1">{code}</p>
            )}
            <h2 className="text-xl font-semibold tracking-tight truncate">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {badge && (
              <Badge variant="outline" className={BADGE_TONES[badge.tone || 'default']}>
                {badge.label}
              </Badge>
            )}
            {onPrint && (
              <Button variant="outline" size="icon" onClick={onPrint} title="Print" aria-label="Print">
                <Printer className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" size="icon" onClick={onEdit} title="Edit" aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} title="Close" aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Detail fields grid */}
        <ScrollArea className="max-h-[60vh]">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 py-4">
            {fields.map((f, i) => (
              <div key={i} className={f.full ? 'col-span-2' : ''}>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {f.label}
                </dt>
                <dd className={f.mono ? 'text-sm font-mono' : 'text-sm'}>
                  {f.value || <span className="text-muted-foreground">—</span>}
                </dd>
              </div>
            ))}
          </dl>
          {footer && <div className="border-t pt-4 mt-2">{footer}</div>}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
