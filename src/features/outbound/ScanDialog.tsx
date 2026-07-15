'use client'

import { useState, useEffect } from 'react'
import { ScanLine, CheckCircle2, XCircle } from 'lucide-react'
import { WorkflowStepDialog } from './WorkflowStepDialog'
import { usePatchSO } from './hooks'
import { toast } from 'sonner'
import { inputClass } from '@/lib/styles'
import { num } from '@/lib/format'
import type { SalesOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  ScanDialog — Step 2: barcode verification per line item
//  Each line shows: ordered → picked → scanned (with status icon)
// ═══════════════════════════════════════════════════════════════

interface Props {
  so: SalesOrder | null
  onClose: () => void
}

interface ScanLine {
  id: string
  sku: string
  name: string
  barcode: string
  ordered: number
  picked: number
  scanned: string
}

export function ScanDialog({ so, onClose }: Props) {
  const [scannedBy, setScannedBy] = useState('Rakib Hossain')
  const [lines, setLines] = useState<ScanLine[]>([])
  const [barcodeInput, setBarcodeInput] = useState('')
  const patchMutation = usePatchSO()

  useEffect(() => {
    if (so) {
      setScannedBy('Rakib Hossain')
      setLines((so.items || []).map((it) => ({
        id: it.id,
        sku: it.product?.sku || '',
        name: it.product?.name || '',
        barcode: '', // products don't expose barcode in SO items; scan is manual qty
        ordered: it.quantity,
        picked: it.pickedQty || 0,
        scanned: String(it.scannedQty || 0),
      })))
    }
  }, [so])

  if (!so) return null

  function setScanned(i: number, v: string) {
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, scanned: v } : l))
  }

  const totalScanned = lines.reduce((s, l) => s + (Number(l.scanned) || 0), 0)
  const totalPicked = lines.reduce((s, l) => s + l.picked, 0)
  const allMatched = lines.every((l) => Number(l.scanned) === l.picked)

  // Simulate barcode scan: if input matches a SKU, increment its scanned count
  function handleBarcodeEnter() {
    const input = barcodeInput.trim().toLowerCase()
    if (!input) return
    const idx = lines.findIndex((l) => l.sku.toLowerCase() === input || l.name.toLowerCase().includes(input))
    if (idx >= 0) {
      const current = Number(lines[idx].scanned) || 0
      if (current < lines[idx].picked) {
        setScanned(idx, String(current + 1))
        toast.success(`Scanned: ${lines[idx].sku}`, { description: `${current + 1}/${lines[idx].picked}` })
      } else {
        toast.warning(`Already fully scanned: ${lines[idx].sku}`)
      }
    } else {
      toast.error('No matching product', { description: `Barcode "${input}" not found` })
    }
    setBarcodeInput('')
  }

  async function submit() {
    try {
      const result = await patchMutation.mutateAsync({
        id: so!.id,
        body: {
          action: 'scan',
          scannedBy,
          items: lines.map((l) => ({ id: l.id, scannedQty: Number(l.scanned) })),
        },
      })
      if (result.ok) {
        toast.success(`${so!.soNumber} scanned`, { description: `By ${scannedBy} · ${totalScanned} units verified` })
        onClose()
      } else {
        throw new Error(result.error || 'Failed to scan')
      }
    } catch (e: any) {
      toast.error('Failed to scan', { description: e.message })
    }
  }

  return (
    <WorkflowStepDialog
      open={!!so}
      onClose={onClose}
      icon={<ScanLine className="h-5 w-5 text-primary" />}
      title="Scan"
      description="Verify picked items by barcode scan or manual entry"
      soNumber={so.soNumber}
      customerName={so.customer?.name || ''}
      onSubmit={submit}
      submitLabel={patchMutation.isPending ? 'Scanning…' : 'Confirm scan'}
      disabled={patchMutation.isPending}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Scanned by</label>
            <input className={inputClass + ' mt-1'} value={scannedBy} onChange={(e) => setScannedBy(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium">Barcode input</label>
            <input
              className={inputClass + ' mt-1 font-mono'}
              placeholder="Scan or type SKU…"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeEnter() } }}
              autoFocus
            />
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-2">Product</th>
                <th className="text-right p-2">Picked</th>
                <th className="text-right p-2">Scanned</th>
                <th className="text-center p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => {
                const scanned = Number(l.scanned) || 0
                const matched = scanned === l.picked
                const partial = scanned > 0 && scanned < l.picked
                return (
                  <tr key={l.id} className="border-t">
                    <td className="p-2">
                      <div className="font-medium text-sm">{l.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{l.sku}</div>
                    </td>
                    <td className="text-right p-2 tabular-nums">{l.picked}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        min="0"
                        max={l.picked}
                        className={inputClass + ' h-8 w-16 ml-auto text-right'}
                        value={l.scanned}
                        onChange={(e) => setScanned(i, e.target.value)}
                      />
                    </td>
                    <td className="p-2 text-center">
                      {matched ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 inline" />
                      ) : partial ? (
                        <span className="text-xs text-amber-600 font-medium">partial</span>
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center">
          <div className={`text-sm font-medium ${allMatched ? 'text-emerald-600' : 'text-amber-600'}`}>
            {allMatched ? '✓ All items verified' : `${totalScanned}/${totalPicked} units scanned`}
          </div>
          <div className="rounded-lg bg-muted/40 px-4 py-2 text-right">
            <p className="text-xs text-muted-foreground">Total scanned</p>
            <p className="text-lg font-semibold tabular-nums">{num(totalScanned)} / {num(totalPicked)}</p>
          </div>
        </div>
      </div>
    </WorkflowStepDialog>
  )
}
