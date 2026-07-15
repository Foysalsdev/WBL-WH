'use client'

import { PickDialog } from './PickDialog'
import { ScanDialog } from './ScanDialog'
import { InvoiceDialog } from './InvoiceDialog'
import { DispatchDialog } from './DispatchDialog'
import { PodDialog } from './PodDialog'
import type { SalesOrder, Dispatch } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  WorkflowDialog — dispatcher that renders the right dialog
//  for the current workflow step.
//  For POD, an optional dispatch can be specified (per-dispatch POD).
// ═══════════════════════════════════════════════════════════════

interface Props {
  target: { so: SalesOrder; step: string; dispatch?: Dispatch | null } | null
  onClose: () => void
}

export function WorkflowDialog({ target, onClose }: Props) {
  if (!target) return null

  switch (target.step) {
    case 'pick':     return <PickDialog     so={target.so} onClose={onClose} />
    case 'scan':     return <ScanDialog     so={target.so} onClose={onClose} />
    case 'invoice':  return <InvoiceDialog  so={target.so} onClose={onClose} />
    case 'dispatch': return <DispatchDialog so={target.so} onClose={onClose} />
    case 'pod':      return <PodDialog      so={target.so} dispatch={target.dispatch || null} onClose={onClose} />
    default:         return null
  }
}
