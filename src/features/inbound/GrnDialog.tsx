'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/system/forms'
import { inputClass } from '@/lib/styles'
import { usePatchPO } from './hooks'
import { toast } from 'sonner'
import { bdt, num, date } from '@/lib/format'
import type { PurchaseOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  GrnDialog — receive PO line items with quality-check breakdown
// ═══════════════════════════════════════════════════════════════

interface Props {
  po: PurchaseOrder | null
  onClose: () => void
}

interface ReceiptLine {
  id: string
  sku: string
  name: string
  ordered: number
  previouslyReceived: number
  receiving: string
  passed: string
  failed: string
  putaway: string
}

export function GrnDialog({ po, onClose }: Props) {
  const [vehicleNo, setVehicleNo] = useState('')
  const [invoiceRef, setInvoiceRef] = useState('')
  const [receivedBy, setReceivedBy] = useState('')
  const [lines, setLines] = useState<ReceiptLine[]>([])
  const [saving, setSaving] = useState(false)

  const patchMutation = usePatchPO()

  useEffect(() => {
    if (po) {
      setVehicleNo(po.vehicleNo || '')
      setInvoiceRef(po.invoiceRef || '')
      setReceivedBy(po.receivedBy || 'Rakib Hossain')
      setLines((po.items || []).map((it) => ({
        id: it.id,
        sku: it.product?.sku || '',
        name: it.product?.name || '',
        ordered: it.quantity,
        previouslyReceived: it.receivedQty || 0,
        receiving: String(Math.max(0, it.quantity - (it.receivedQty || 0))),
        passed: String(Math.max(0, it.quantity - (it.receivedQty || 0))),
        failed: '0',
        putaway: it.putawayLocation || '',
      })))
    }
  }, [po])

  if (!po) return null

  function setLine(i: number, k: keyof ReceiptLine, v: string) {
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  }

  const totalReceiving = lines.reduce((s, l) => s + (Number(l.receiving) || 0), 0)
  const totalPassed = lines.reduce((s, l) => s + (Number(l.passed) || 0), 0)
  const totalFailed = lines.reduce((s, l) => s + (Number(l.failed) || 0), 0)

  async function submit() {
    if (!receivedBy) {
      toast.error('Receiver name required')
      return
    }
    setSaving(true)
    try {
      const result = await patchMutation.mutateAsync({
        id: po!.id,
        body: {
          action: 'receive',
          vehicleNo,
          invoiceRef,
          receivedBy,
          items: lines.map((l) => ({
            id: l.id,
            received: Number(l.receiving),
            passed: Number(l.passed),
            failed: Number(l.failed),
            putawayLocation: l.putaway,
          })),
        },
      })
      if (result.status === 'received' || result.status === 'partial') {
        toast.success('GRN posted', {
          description: `${result.grnNumber} · status: ${result.status}`,
        })
        onClose()
      } else {
        throw new Error(result.error || 'Failed to post GRN')
      }
    } catch (e: any) {
      toast.error('Failed to post GRN', { description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!po} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Goods Receipt — <span className="font-mono text-sm">{po.poNumber}</span>
          </DialogTitle>
          <DialogDescription>
            Receive from <span className="font-medium text-foreground">{po.supplier?.name}</span>
            {po.expectedDate && <> · expected {date(po.expectedDate)}</>}
          </DialogDescription>
        </DialogHeader>

        {/* GRN header fields */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Supplier vehicle no.">
            <input className={inputClass} value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="DHK-XXX-0000" />
          </Field>
          <Field label="Invoice / challan ref">
            <input className={inputClass} value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="WHP-INV-2026-XXXX" />
          </Field>
          <Field label="Received by" required>
            <input className={inputClass} value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
          </Field>
        </div>

        {/* Line items table */}
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-right p-2">Ordered</th>
                <th className="text-right p-2">Prev. Recd</th>
                <th className="text-right p-2">Receiving</th>
                <th className="text-right p-2">QC Pass</th>
                <th className="text-right p-2">QC Fail</th>
                <th className="text-left p-2">Putaway Loc</th>
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
                  <td className="text-right p-2 tabular-nums text-emerald-600">{l.previouslyReceived}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      className={inputClass + ' h-8 w-16 ml-auto text-right'}
                      value={l.receiving}
                      onChange={(e) => setLine(i, 'receiving', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      className={inputClass + ' h-8 w-16 ml-auto text-right'}
                      value={l.passed}
                      onChange={(e) => setLine(i, 'passed', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      className={inputClass + ' h-8 w-16 ml-auto text-right'}
                      value={l.failed}
                      onChange={(e) => setLine(i, 'failed', e.target.value)}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      className={inputClass + ' h-8 w-24 text-xs'}
                      placeholder="A-R1-01"
                      value={l.putaway}
                      onChange={(e) => setLine(i, 'putaway', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Receiving</p>
            <p className="text-xl font-semibold tabular-nums">{totalReceiving}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">QC Passed</p>
            <p className="text-xl font-semibold tabular-nums text-emerald-600">{totalPassed}</p>
          </div>
          <div className="rounded-lg bg-rose-500/10 p-3 text-center">
            <p className="text-xs text-rose-700 dark:text-rose-400">QC Failed</p>
            <p className="text-xl font-semibold tabular-nums text-rose-600">{totalFailed}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? 'Posting GRN…' : 'Post GRN & update stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
