'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { CreateDialog } from '@/components/system/create-dialog'
import { Field } from '@/components/system/forms'
import { inputClass, textareaClass } from '@/lib/styles'
import { useCreateSO, useCustomersForSelect, useProductsForSelect } from './hooks'
import { toast } from 'sonner'
import { bdt } from '@/lib/format'

// ═══════════════════════════════════════════════════════════════
//  SoDialog — create a new sales order with multi-line items
// ═══════════════════════════════════════════════════════════════

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
}

interface LineItem {
  productId: string
  quantity: string
  unitPrice: string
}

export function SoDialog({ open, onOpenChange }: Props) {
  const [customerId, setCustomerId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ productId: '', quantity: '1', unitPrice: '0' }])

  const createMutation = useCreateSO()
  const { data: customers } = useCustomersForSelect()
  const { data: products } = useProductsForSelect()

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCustomerId('')
      setDeliveryDate('')
      setNotes('')
      setLines([{ productId: '', quantity: '1', unitPrice: '0' }])
    }
  }, [open])

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)

  function setLine(i: number, k: keyof LineItem, v: string) {
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  }

  function pickProduct(i: number, productId: string) {
    const p = products?.find((x) => x.id === productId)
    setLines((arr) => arr.map((l, idx) =>
      idx === i ? { ...l, productId, unitPrice: p ? String(p.salePrice) : l.unitPrice } : l,
    ))
  }

  function addLine() {
    setLines((a) => [...a, { productId: '', quantity: '1', unitPrice: '0' }])
  }

  function removeLine(i: number) {
    setLines((a) => a.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!customerId) {
      toast.error('Select a dealer')
      return
    }
    if (lines.length === 0 || lines.some((l) => !l.productId)) {
      toast.error('Add at least one line item with a product')
      return
    }
    try {
      const so = await createMutation.mutateAsync({
        customerId,
        deliveryDate: deliveryDate || undefined,
        notes: notes || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
      })
      toast.success('Sales order created', { description: so.soNumber })
      onOpenChange(false)
    } catch (e: any) {
      toast.error('Failed to create SO', { description: e.message })
    }
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Sales Order"
      description="Create a dealer order. Number is auto-generated on save."
      onSubmit={submit}
      submitLabel={createMutation.isPending ? 'Creating…' : 'Create SO'}
      disabled={createMutation.isPending}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Header fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Dealer / Showroom" required>
            <select
              className={inputClass}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Select dealer…</option>
              {(customers || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </Field>
          <Field label="Target delivery date">
            <input
              type="date"
              className={inputClass}
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                className={textareaClass}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this order…"
              />
            </Field>
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium">Line items</label>
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1 h-7 px-2 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add line
            </button>
          </div>
          <div className="rounded-lg border divide-y">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
                <div className="col-span-5">
                  <select
                    className={inputClass + ' h-9'}
                    value={l.productId}
                    onChange={(e) => pickProduct(i, e.target.value)}
                  >
                    <option value="">Select product…</option>
                    {(products || []).map((p) => (
                      <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="number"
                  min="1"
                  className={inputClass + ' col-span-2 h-9 text-right'}
                  placeholder="Qty"
                  value={l.quantity}
                  onChange={(e) => setLine(i, 'quantity', e.target.value)}
                />
                <input
                  type="number"
                  min="0"
                  className={inputClass + ' col-span-3 h-9 text-right'}
                  placeholder="Unit price"
                  value={l.unitPrice}
                  onChange={(e) => setLine(i, 'unitPrice', e.target.value)}
                />
                <div className="col-span-1 text-right text-sm tabular-nums">
                  {bdt((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}
                </div>
                <button
                  type="button"
                  className="col-span-1 h-9 grid place-items-center text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                  onClick={() => removeLine(i)}
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <div className="rounded-lg bg-muted/40 px-4 py-2 text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold tabular-nums">{bdt(total)}</p>
            </div>
          </div>
        </div>
      </div>
    </CreateDialog>
  )
}
