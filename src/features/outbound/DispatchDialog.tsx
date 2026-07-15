'use client'

import { useState, useEffect } from 'react'
import { PackageCheck, Truck, Send } from 'lucide-react'
import { WorkflowStepDialog } from './WorkflowStepDialog'
import { usePatchSO } from './hooks'
import { SearchableSelect } from '@/components/system/searchable-select'
import { courierVendorsApi } from '@/lib/api/endpoints'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { inputClass, textareaClass } from '@/lib/styles'
import { bdt, num } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SalesOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  DispatchDialog — Step 4: ship out via Transport or Courier
//  Supports partial delivery (per-line quantities).
//  Stock is deducted only for the dispatched quantities.
// ═══════════════════════════════════════════════════════════════

interface Props {
  so: SalesOrder | null
  onClose: () => void
}

interface DispatchLine {
  soItemId: string
  productId: string
  sku: string
  name: string
  ordered: number
  picked: number
  delivered: number  // already delivered across previous dispatches
  dispatching: string  // qty being dispatched now
  unitPrice: number
}

export function DispatchDialog({ so, onClose }: Props) {
  const [deliveryMethod, setDeliveryMethod] = useState<'transport' | 'courier'>('transport')
  // Transport fields
  const [vehicleNo, setVehicleNo] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  // Courier fields
  const [courierName, setCourierName] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  // Common
  const [challanNo, setChallanNo] = useState('')
  const [dispatchedBy, setDispatchedBy] = useState('Rakib Hossain')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DispatchLine[]>([])

  const patchMutation = usePatchSO()
  const { data: courierVendors } = useQuery({
    queryKey: ['courier-vendors', 'dispatch-select'],
    queryFn: () => courierVendorsApi.list(),
  })

  useEffect(() => {
    if (so) {
      setDeliveryMethod('transport')
      setVehicleNo('')
      setDriverName('')
      setDriverPhone('')
      setCourierName('')
      setTrackingNumber('')
      setChallanNo('')
      setDispatchedBy('Rakib Hossain')
      setNotes('')
      setLines((so.items || []).map((it) => ({
        soItemId: it.id,
        productId: it.productId,
        sku: it.product?.sku || '',
        name: it.product?.name || '',
        ordered: it.quantity,
        picked: it.pickedQty || it.quantity,
        delivered: it.deliveredQty || 0,
        dispatching: String(Math.max(0, (it.pickedQty || it.quantity) - (it.deliveredQty || 0))),
        unitPrice: it.unitPrice,
      })))
    }
  }, [so])

  if (!so) return null

  function setDispatching(i: number, v: string) {
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, dispatching: v } : l))
  }

  const totalDispatching = lines.reduce((s, l) => s + (Number(l.dispatching) || 0), 0)
  const totalRemaining = lines.reduce((s, l) => s + Math.max(0, l.picked - l.delivered), 0)
  const dispatchAmount = lines.reduce((s, l) => s + (Number(l.dispatching) || 0) * l.unitPrice, 0)

  async function submit() {
    if (deliveryMethod === 'transport' && !vehicleNo) {
      toast.error('Vehicle number required for transport delivery')
      return
    }
    if (deliveryMethod === 'courier' && !courierName) {
      toast.error('Courier name required for courier delivery')
      return
    }
    const itemsToDispatch = lines
      .map((l) => ({ ...l, qty: Number(l.dispatching) || 0 }))
      .filter((l) => l.qty > 0)
    if (itemsToDispatch.length === 0) {
      toast.error('At least one item must have a dispatch quantity > 0')
      return
    }
    // Validate against remaining
    for (const l of itemsToDispatch) {
      const remaining = l.picked - l.delivered
      if (l.qty > remaining) {
        toast.error(`Cannot dispatch ${l.qty} units of ${l.sku} — only ${remaining} remaining`)
        return
      }
    }

    try {
      const result = await patchMutation.mutateAsync({
        id: so!.id,
        body: {
          action: 'dispatch',
          deliveryMethod,
          vehicleNo: deliveryMethod === 'transport' ? vehicleNo : undefined,
          driverName: deliveryMethod === 'transport' ? driverName : undefined,
          driverPhone: deliveryMethod === 'transport' ? driverPhone : undefined,
          courierName: deliveryMethod === 'courier' ? courierName : undefined,
          trackingNumber: deliveryMethod === 'courier' ? trackingNumber : undefined,
          challanNo: challanNo || undefined,
          dispatchedBy,
          notes: notes || undefined,
          items: itemsToDispatch.map((l) => ({
            soItemId: l.soItemId,
            productId: l.productId,
            quantity: l.qty,
            unitPrice: l.unitPrice,
          })),
        },
      })
      if (result.ok) {
        toast.success(`${so!.soNumber} dispatched`, {
          description: `${result.dispatchNo} · ${num(totalDispatching)} units via ${deliveryMethod}${result.allDelivered ? ' · All delivered' : ' · Partial'}`,
        })
        onClose()
      } else {
        throw new Error(result.error || 'Failed to dispatch')
      }
    } catch (e: any) {
      toast.error('Failed to dispatch', { description: e.message })
    }
  }

  return (
    <WorkflowStepDialog
      open={!!so}
      onClose={onClose}
      icon={<PackageCheck className="h-5 w-5 text-primary" />}
      title="Dispatch"
      description="Ship out — supports partial delivery. Stock deducted for dispatched quantities only."
      soNumber={so.soNumber}
      customerName={so.customer?.name || ''}
      onSubmit={submit}
      submitLabel={patchMutation.isPending ? 'Dispatching…' : `Dispatch ${num(totalDispatching)} units`}
      disabled={patchMutation.isPending}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Order summary */}
        <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-4 gap-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Invoice</p><p className="font-mono font-medium text-xs">{so.invoiceNo || '—'}</p></div>
          <div><p className="text-xs text-muted-foreground">Total units</p><p className="font-medium tabular-nums">{num(totalRemaining + (lines.reduce((s, l) => s + l.delivered, 0)))}</p></div>
          <div><p className="text-xs text-muted-foreground">Already delivered</p><p className="font-medium tabular-nums text-emerald-600">{num(lines.reduce((s, l) => s + l.delivered, 0))}</p></div>
          <div><p className="text-xs text-muted-foreground">Remaining</p><p className="font-medium tabular-nums text-amber-600">{num(totalRemaining)}</p></div>
        </div>

        {/* Delivery method selector */}
        <div>
          <label className="text-xs font-medium">Delivery method</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDeliveryMethod('transport')}
              className={cn(
                'h-14 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2',
                deliveryMethod === 'transport'
                  ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                  : 'border-input bg-background hover:bg-accent',
              )}
            >
              <Truck className="h-4 w-4" />
              Transport (own vehicle)
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMethod('courier')}
              className={cn(
                'h-14 rounded-md border text-sm font-medium transition-colors flex items-center justify-center gap-2',
                deliveryMethod === 'courier'
                  ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                  : 'border-input bg-background hover:bg-accent',
              )}
            >
              <Send className="h-4 w-4" />
              Courier (3rd party)
            </button>
          </div>
        </div>

        {/* Transport / Courier fields */}
        {deliveryMethod === 'transport' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Vehicle no. *</label>
              <input className={inputClass + ' mt-1'} value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="DHK-GAZ-0000" />
            </div>
            <div>
              <label className="text-xs font-medium">Driver name</label>
              <input className={inputClass + ' mt-1'} value={driverName} onChange={(e) => setDriverName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium">Driver phone</label>
              <input className={inputClass + ' mt-1'} value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+88017…" />
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Courier vendor *</label>
              <SearchableSelect
                items={(courierVendors || []) as any[]}
                value={courierName}
                onChange={(v) => {
                  // Find the vendor name from the selected id
                  const vendor = (courierVendors || []).find((c: any) => c.id === v) as any
                  setCourierName(vendor?.name || '')
                }}
                placeholder="Select courier…"
                searchPlaceholder="Search courier…"
                renderItem={(c: any) => ({ label: c.name, sub: c.code })}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Tracking number</label>
              <input className={inputClass + ' mt-1 font-mono'} value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="SF123456789" />
            </div>
          </div>
        )}

        {/* Common fields */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-medium">Challan no. (auto if blank)</label>
            <input className={inputClass + ' mt-1'} value={challanNo} onChange={(e) => setChallanNo(e.target.value)} placeholder="CH-2026-XXXX" />
          </div>
          <div>
            <label className="text-xs font-medium">Dispatched by</label>
            <input className={inputClass + ' mt-1'} value={dispatchedBy} onChange={(e) => setDispatchedBy(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Notes</label>
            <input className={inputClass + ' mt-1'} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        {/* Line items with partial dispatch quantities */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-right p-2">Picked</th>
                <th className="text-right p-2">Delivered</th>
                <th className="text-right p-2">Remaining</th>
                <th className="text-right p-2">Dispatch now</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const remaining = Math.max(0, l.picked - l.delivered)
                const dispatching = Number(l.dispatching) || 0
                return (
                  <tr key={l.soItemId} className="border-t">
                    <td className="p-2">
                      <div className="font-medium text-sm">{l.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{l.sku}</div>
                    </td>
                    <td className="text-right p-2 tabular-nums">{l.picked}</td>
                    <td className="text-right p-2 tabular-nums text-emerald-600">{l.delivered}</td>
                    <td className="text-right p-2 tabular-nums text-amber-600">{remaining}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        className={inputClass + ' h-8 w-20 ml-auto text-right'}
                        value={l.dispatching}
                        onChange={(e) => setDispatching(i, e.target.value)}
                        disabled={remaining === 0}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {totalDispatching === totalRemaining
              ? <span className="text-emerald-600 font-medium">✓ Full delivery — all remaining units</span>
              : <span className="text-amber-600 font-medium">Partial delivery — {num(totalDispatching)} of {num(totalRemaining)} units</span>
            }
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-2 text-right">
            <p className="text-xs text-muted-foreground">Dispatch value</p>
            <p className="text-lg font-semibold tabular-nums">{bdt(dispatchAmount)}</p>
          </div>
        </div>
      </div>
    </WorkflowStepDialog>
  )
}
