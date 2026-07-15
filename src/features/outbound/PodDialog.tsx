'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck } from 'lucide-react'
import { WorkflowStepDialog } from './WorkflowStepDialog'
import { usePatchSO } from './hooks'
import { toast } from 'sonner'
import { inputClass, textareaClass } from '@/lib/styles'
import { bdt, num, date } from '@/lib/format'
import type { SalesOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  PodDialog — Step 5: proof of delivery confirmation
// ═══════════════════════════════════════════════════════════════

interface Props {
  so: SalesOrder | null
  onClose: () => void
}

type PodOutcome = 'confirmed' | 'failed' | 'rescheduled'

export function PodDialog({ so, onClose }: Props) {
  const [podStatus, setPodStatus] = useState<PodOutcome>('confirmed')
  const [podReceivedBy, setPodReceivedBy] = useState('')
  const [podNotes, setPodNotes] = useState('')
  const patchMutation = usePatchSO()

  useEffect(() => {
    if (so) {
      setPodStatus('confirmed')
      setPodReceivedBy('')
      setPodNotes('')
    }
  }, [so])

  if (!so) return null

  async function submit() {
    try {
      const result = await patchMutation.mutateAsync({
        id: so!.id,
        body: {
          action: 'pod',
          podStatus,
          podReceivedBy,
          podNotes,
        },
      })
      if (result.ok) {
        const msg = result.status === 'delivered'
          ? `${so!.soNumber} delivered ✓`
          : `${so!.soNumber} POD ${podStatus}`
        toast.success(msg, {
          description: podNotes || (result.status === 'delivered' ? 'Delivery confirmed' : undefined),
        })
        onClose()
      } else {
        throw new Error(result.error || 'Failed to record POD')
      }
    } catch (e: any) {
      toast.error('Failed to record POD', { description: e.message })
    }
  }

  const totalQty = (so.items || []).reduce((s, it) => s + (it.pickedQty || it.quantity), 0)

  return (
    <WorkflowStepDialog
      open={!!so}
      onClose={onClose}
      icon={<ShieldCheck className="h-5 w-5 text-primary" />}
      title="POD"
      description="Record proof of delivery"
      soNumber={so.soNumber}
      customerName={so.customer?.name || ''}
      onSubmit={submit}
      submitLabel={patchMutation.isPending ? 'Saving…' : 'Record POD'}
      disabled={patchMutation.isPending}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Shipment summary */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Challan</span><span className="font-mono font-medium">{so.challanNo || '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-medium">{so.vehicleNo || '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Driver</span><span className="font-medium">{so.driverName || '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Dispatched</span><span className="font-medium">{date(so.dispatchedAt)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Units</span><span className="font-medium tabular-nums">{num(totalQty)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold tabular-nums">{bdt(so.totalAmount)}</span></div>
        </div>

        {/* POD fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium">Delivery outcome</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPodStatus('confirmed')}
                className={`h-12 rounded-md border text-sm font-medium transition-colors ${
                  podStatus === 'confirmed'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-input bg-background hover:bg-accent'
                }`}
              >
                Confirmed
              </button>
              <button
                type="button"
                onClick={() => setPodStatus('failed')}
                className={`h-12 rounded-md border text-sm font-medium transition-colors ${
                  podStatus === 'failed'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    : 'border-input bg-background hover:bg-accent'
                }`}
              >
                Failed
              </button>
              <button
                type="button"
                onClick={() => setPodStatus('rescheduled')}
                className={`h-12 rounded-md border text-sm font-medium transition-colors ${
                  podStatus === 'rescheduled'
                    ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-400'
                    : 'border-input bg-background hover:bg-accent'
                }`}
              >
                Rescheduled
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Received by (at dealer)</label>
            <input
              className={inputClass + ' mt-1'}
              value={podReceivedBy}
              onChange={(e) => setPodReceivedBy(e.target.value)}
              placeholder="Showroom manager name"
            />
          </div>

          <div>
            <label className="text-xs font-medium">POD notes</label>
            <textarea
              className={textareaClass + ' mt-1'}
              rows={3}
              value={podNotes}
              onChange={(e) => setPodNotes(e.target.value)}
              placeholder="e.g. signed in good condition, partial damage noted, customer not available, etc."
            />
          </div>
        </div>
      </div>
    </WorkflowStepDialog>
  )
}
