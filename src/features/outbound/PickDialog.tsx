'use client'

import { useState, useEffect } from 'react'
import { ClipboardList } from 'lucide-react'
import { WorkflowStepDialog } from './WorkflowStepDialog'
import { usePatchSO } from './hooks'
import { toast } from 'sonner'
import { inputClass } from '@/lib/styles'
import { num } from '@/lib/format'
import type { SalesOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  PickDialog — Step 1: record picked quantities per line item
// ═══════════════════════════════════════════════════════════════

interface Props {
  so: SalesOrder | null
  onClose: () => void
}

interface PickLine {
  id: string
  sku: string
  name: string
  ordered: number
  picked: string
}

export function PickDialog({ so, onClose }: Props) {
  const [pickedBy, setPickedBy] = useState('Rakib Hossain')
  const [lines, setLines] = useState<PickLine[]>([])
  const patchMutation = usePatchSO()

  useEffect(() => {
    if (so) {
      setPickedBy('Rakib Hossain')
      setLines((so.items || []).map((it) => ({
        id: it.id,
        sku: it.product?.sku || '',
        name: it.product?.name || '',
        ordered: it.quantity,
        picked: String(it.quantity),
      })))
    }
  }, [so])

  if (!so) return null

  function setPicked(i: number, v: string) {
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, picked: v } : l))
  }

  const totalPicked = lines.reduce((s, l) => s + (Number(l.picked) || 0), 0)
  const totalOrdered = lines.reduce((s, l) => s + l.ordered, 0)

  async function submit() {
    try {
      const result = await patchMutation.mutateAsync({
        id: so!.id,
        body: {
          action: 'pick',
          pickedBy,
          items: lines.map((l) => ({ id: l.id, pickedQty: Number(l.picked) })),
        },
      })
      if (result.ok) {
        toast.success(`${so!.soNumber} picked`, { description: `By ${pickedBy} · ${totalPicked} units` })
        onClose()
      } else {
        throw new Error(result.error || 'Failed to pick')
      }
    } catch (e: any) {
      toast.error('Failed to pick', { description: e.message })
    }
  }

  return (
    <WorkflowStepDialog
      open={!!so}
      onClose={onClose}
      icon={<ClipboardList className="h-5 w-5 text-primary" />}
      title="Pick"
      description="Record picked quantities for each line item"
      soNumber={so.soNumber}
      customerName={so.customer?.name || ''}
      onSubmit={submit}
      submitLabel={patchMutation.isPending ? 'Picking…' : 'Confirm pick'}
      disabled={patchMutation.isPending}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium">Picked by</label>
          <input className={inputClass + ' mt-1'} value={pickedBy} onChange={(e) => setPickedBy(e.target.value)} />
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-right p-2">Ordered</th>
                <th className="text-right p-2">Picked Qty</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2">
                    <div className="font-medium text-sm">{l.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{l.sku}</div>
                  </td>
                  <td className="text-right p-2 tabular-nums">{l.ordered}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      max={l.ordered}
                      className={inputClass + ' h-8 w-20 ml-auto text-right'}
                      value={l.picked}
                      onChange={(e) => setPicked(i, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="rounded-lg bg-muted/40 px-4 py-2 text-right">
            <p className="text-xs text-muted-foreground">Total picked</p>
            <p className="text-lg font-semibold tabular-nums">{num(totalPicked)} / {num(totalOrdered)}</p>
          </div>
        </div>
      </div>
    </WorkflowStepDialog>
  )
}
