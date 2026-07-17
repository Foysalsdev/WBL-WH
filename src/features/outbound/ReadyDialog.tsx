'use client'

import { useState, useEffect } from 'react'
import { FileText } from 'lucide-react'
import { WorkflowStepDialog } from './WorkflowStepDialog'
import { usePatchSO } from './hooks'
import { toast } from 'sonner'
import { inputClass } from '@/lib/styles'
import { bdt, num, date } from '@/lib/format'
import type { SalesOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  ReadyDialog — Step 3: generate ready
// ═══════════════════════════════════════════════════════════════

interface Props {
  so: SalesOrder | null
  onClose: () => void
}

export function ReadyDialog({ so, onClose }: Props) {
  const [readyBy, setReadyBy] = useState('Sadia Karim')
  const [sapInvoiceRef, setSapInvoiceRef] = useState('')
  const [cartonCount, setCartonCount] = useState('1')
  const patchMutation = usePatchSO()

  useEffect(() => {
    if (so) {
      setReadyBy('Sadia Karim')
      setSapInvoiceRef('') // from SAP, optional
      setCartonCount('1')
    }
  }, [so])

  if (!so) return null

  async function submit() {
    try {
      const result = await patchMutation.mutateAsync({
        id: so!.id,
        body: {
          action: 'ready',
          readyBy,
          cartonCount: Number(cartonCount),
          sapInvoiceRef: sapInvoiceRef || undefined,
        },
      })
      if (result.ok) {
        toast.success(`${so!.soNumber} ready`, {
          description: `SAP Ref ${result.sapInvoiceRef} · ${num(Number(cartonCount))} cartons · ${date(new Date())}`,
        })
        onClose()
      } else {
        throw new Error(result.error || 'Failed to ready')
      }
    } catch (e: any) {
      toast.error('Failed to ready', { description: e.message })
    }
  }

  const totalQty = (so.items || []).reduce((s, it) => s + (it.scannedQty || it.pickedQty || it.quantity), 0)

  return (
    <WorkflowStepDialog
      open={!!so}
      onClose={onClose}
      icon={<FileText className="h-5 w-5 text-primary" />}
      title="SAP Ref"
      description="Generate ready for this order"
      soNumber={so.soNumber}
      customerName={so.customer?.name || ''}
      onSubmit={submit}
      submitLabel={patchMutation.isPending ? 'Marking ready…' : 'Generate ready'}
      disabled={patchMutation.isPending}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Order summary */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span className="font-medium">{num(so.items?.length || 0)} SKUs</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Total units</span><span className="font-medium tabular-nums">{num(totalQty)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Order amount</span><span className="font-semibold tabular-nums">{bdt(so.totalAmount)}</span></div>
        </div>

        {/* SAP Ref fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">SAP Ref no. (from SAP, optional)</label>
            <input
              className={inputClass + ' mt-1'}
              value={sapInvoiceRef}
              onChange={(e) => setSapInvoiceRef(e.target.value)}
              placeholder="INV-2026-XXXX"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Carton count</label>
            <input
              type="number"
              min="1"
              className={inputClass + ' mt-1'}
              value={cartonCount}
              onChange={(e) => setCartonCount(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium">SAP Refd by</label>
            <input
              className={inputClass + ' mt-1'}
              value={readyBy}
              onChange={(e) => setReadyBy(e.target.value)}
            />
          </div>
        </div>
      </div>
    </WorkflowStepDialog>
  )
}
