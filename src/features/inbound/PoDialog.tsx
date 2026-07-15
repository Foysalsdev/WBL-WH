'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { CreateDialog } from '@/components/system/create-dialog'
import { Field } from '@/components/system/forms'
import { SearchableSelect } from '@/components/system/searchable-select'
import { inputClass, textareaClass } from '@/lib/styles'
import { useCreatePO, useSuppliersForSelect, useProductsForSelect } from './hooks'
import { toast } from 'sonner'
import { bdt } from '@/lib/format'

// ═══════════════════════════════════════════════════════════════
//  PoDialog — create a new purchase order with multi-line items
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

export function PoDialog({ open, onOpenChange }: Props) {
  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LineItem[]>([{ productId: '', quantity: '1', unitPrice: '0' }])

  const createMutation = useCreatePO()
  const { data: suppliers } = useSuppliersForSelect()
  const { data: products } = useProductsForSelect()

  // Reset form on open
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSupplierId('')
      setExpectedDate('')
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
      idx === i ? { ...l, productId, unitPrice: p ? String(p.costPrice) : l.unitPrice } : l,
    ))
  }

  function addLine() {
    setLines((a) => [...a, { productId: '', quantity: '1', unitPrice: '0' }])
  }

  function removeLine(i: number) {
    setLines((a) => a.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!supplierId) {
      toast.error('Select a sourcing partner')
      return
    }
    if (lines.length === 0 || lines.some((l) => !l.productId)) {
      toast.error('Add at least one line item with a product')
      return
    }
    try {
      const po = await createMutation.mutateAsync({
        supplierId,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        })),
      })
      toast.success('Purchase order created', { description: po.poNumber })
      onOpenChange(false)
    } catch (e: any) {
      toast.error('Failed to create PO', { description: e.message })
    }
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Purchase Order"
      description="Create a PO to source Whirlpool appliances. Number is auto-generated on save."
      onSubmit={submit}
      submitLabel={createMutation.isPending ? 'Creating…' : 'Create PO'}
      disabled={createMutation.isPending}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4">
        {/* Header fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sourcing Partner" required>
            <SearchableSelect
              items={suppliers || []}
              value={supplierId}
              onChange={setSupplierId}
              placeholder="Select supplier…"
              searchPlaceholder="Search by name or code…"
              renderItem={(s) => ({ label: s.name, sub: s.code })}
            />
          </Field>
          <Field label="Expected date">
            <input
              type="date"
              className={inputClass}
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea
                className={textareaClass}
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes for this PO…"
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
                  <SearchableSelect
                    items={products || []}
                    value={l.productId}
                    onChange={(v) => pickProduct(i, v)}
                    placeholder="Select product…"
                    searchPlaceholder="Search by SKU or name…"
                    renderItem={(p) => ({ label: p.name, sub: p.sku })}
                  />
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
