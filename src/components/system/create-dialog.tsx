'use client'

import { type ReactNode } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ═══════════════════════════════════════════════════════════════
//  CreateDialog — shared dialog shell for all master "Create" forms
//  Uses direct button onClick (no form onSubmit) because Radix Dialog
//  doesn't always propagate form submit reliably inside its portal.
// ═══════════════════════════════════════════════════════════════

interface CreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  onSubmit: () => Promise<void>
  submitLabel?: string
  disabled?: boolean
  maxWidth?: string
}

export function CreateDialog({
  open, onOpenChange, title, description, children,
  onSubmit, submitLabel = 'Create', disabled, maxWidth,
}: CreateDialogProps) {
  async function handleClick() {
    if (disabled) return
    try {
      await onSubmit()
    } catch (err) {
      console.error('[CreateDialog] onSubmit threw:', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={maxWidth || 'max-w-lg'}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="py-2">{children}</div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleClick} disabled={disabled}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
