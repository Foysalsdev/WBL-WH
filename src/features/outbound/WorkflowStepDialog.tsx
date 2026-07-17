'use client'

import { type ReactNode } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ═══════════════════════════════════════════════════════════════
//  WorkflowStepDialog — shared shell for all 5 workflow step dialogs
// ═══════════════════════════════════════════════════════════════

interface Props {
  open: boolean
  onClose: () => void
  icon: ReactNode
  title: string
  description: string
  soNumber: string
  customerName: string
  children: ReactNode
  onSubmit: () => Promise<void>
  submitLabel: string
  submitVariant?: 'default' | 'destructive'
  disabled?: boolean
  maxWidth?: string
}

export function WorkflowStepDialog({
  open, onClose, icon, title, description, soNumber, customerName,
  children, onSubmit, submitLabel, submitVariant = 'default', disabled, maxWidth,
}: Props) {
  async function handleClick() {
    if (disabled) return
    try {
      await onSubmit()
    } catch (err) {
      console.error('[WorkflowStepDialog] onSubmit threw:', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={maxWidth || 'max-w-2xl'} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {icon}
            {title}
            <span className="font-mono text-sm text-muted-foreground">— {soNumber}</span>
          </DialogTitle>
          <DialogDescription>
            {description} · <span className="font-medium text-foreground">{customerName}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="py-2">{children}</div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleClick} disabled={disabled} variant={submitVariant}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
