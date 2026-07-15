'use client'

import { type ReactNode } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ═══════════════════════════════════════════════════════════════
//  FormDialog — shared dialog shell for both Create and Edit flows.
//  When `initial` is provided, runs in edit mode and the title defaults
//  to "Edit X" if no title is supplied. The children (form fields) are
//  re-mounted when the dialog opens, so callers can use `initial` to
//  pre-populate via useEffect.
// ═══════════════════════════════════════════════════════════════

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Form contents */
  children: ReactNode
  /** Submit handler — should throw on failure; on success, caller closes dialog */
  onSubmit: () => Promise<void>
  submitLabel?: string
  /** Disable submit (e.g. while saving or form invalid) */
  disabled?: boolean
  /** Override dialog width (default: max-w-lg) */
  maxWidth?: string
}

export function FormDialog({
  open, onOpenChange, title, description, children,
  onSubmit, submitLabel = 'Save', disabled, maxWidth,
}: FormDialogProps) {
  async function handleClick() {
    if (disabled) return
    try {
      await onSubmit()
    } catch (err) {
      console.error('[FormDialog] onSubmit threw:', err)
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

/** Backwards-compatible alias — same component, kept name */
export const CreateDialog = FormDialog
