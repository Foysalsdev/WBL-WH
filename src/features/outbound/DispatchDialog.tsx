'use client'

import { useState, useEffect } from 'react'
import { PackageCheck } from 'lucide-react'
import { WorkflowStepDialog } from './WorkflowStepDialog'
import { usePatchSO } from './hooks'
import { toast } from 'sonner'
import { inputClass } from '@/lib/styles'
import { bdt, num, date } from '@/lib/format'
import type { SalesOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  DispatchDialog — Step 4: ship out with vehicle/driver
//  Stock is deducted on dispatch.
// ═══════════════════════════════════════════════════════════════

interface Props {
  so: SalesOrder | null
  onClose: () => void
}

export function DispatchDialog({ so, onClose }: Props) {
  const [challanNo, setChallanNo] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const patchMutation = usePatchSO()

  useEffect(() => {
    if (so) {
      setChallanNo('')
      setVehicleNo('')
      setDriverName('')
      setDriverPhone('')
    }
  }, [so])

  if (!so) return null

  async function submit() {
    if (!vehicleNo) {
      toast.error('Vehicle number required')
      return
    }
    try {
      const result = await patchMutation.mutateAsync({
        id: so!.id,
        body: {
          action: 'dispatch',
          challanNo: challanNo || undefined,
          vehicleNo,
          driverName: driverName || undefined,
          driverPhone: driverPhone || undefined,
        },
      })
      if (result.ok) {
        toast.success(`${so!.soNumber} dispatched`, {
          description: `Challan ${result.challanNo} · Vehicle ${vehicleNo} · Stock deducted`,
        })
        onClose()
      } else {
        throw new Error(result.error || 'Failed to dispatch')
      }
    } catch (e: any) {
      toast.error('Failed to dispatch', { description: e.message })
    }
  }

  const totalQty = (so.items || []).reduce((s, it) => s + (it.pickedQty || it.quantity), 0)

  return (
    <WorkflowStepDialog
      open={!!so}
      onClose={onClose}
      icon={<PackageCheck className="h-5 w-5 text-primary" />}
      title="Dispatch"
      description="Ship out — stock will be deducted on dispatch"
      soNumber={so.soNumber}
      customerName={so.customer?.name || ''}
      onSubmit={submit}
      submitLabel={patchMutation.isPending ? 'Dispatching…' : 'Dispatch & generate challan'}
      disabled={patchMutation.isPending}
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Order summary */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Invoice</span><span className="font-mono font-medium">{so.invoiceNo || '—'}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Cartons</span><span className="font-medium tabular-nums">{num(so.cartonCount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Units to dispatch</span><span className="font-medium tabular-nums">{num(totalQty)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Order amount</span><span className="font-semibold tabular-nums">{bdt(so.totalAmount)}</span></div>
        </div>

        {/* Dispatch fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium">Challan no. (auto if blank)</label>
            <input
              className={inputClass + ' mt-1'}
              value={challanNo}
              onChange={(e) => setChallanNo(e.target.value)}
              placeholder="CH-2026-XXXX"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Vehicle no. *</label>
            <input
              className={inputClass + ' mt-1'}
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
              placeholder="DHK-GAZ-0000"
            />
          </div>
          <div>
            <label className="text-xs font-medium">Driver name</label>
            <input
              className={inputClass + ' mt-1'}
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">Driver phone</label>
            <input
              className={inputClass + ' mt-1'}
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="+88017…"
            />
          </div>
        </div>
      </div>
    </WorkflowStepDialog>
  )
}
