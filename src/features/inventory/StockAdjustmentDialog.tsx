'use client'

import { useEffect, useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MovementPill } from '@/components/system'
import { cn } from '@/lib/utils'
import { bdt, num } from '@/lib/format'
import type { InventoryItem } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  StockAdjustmentDialog — add/remove stock with reason & live preview
// ═══════════════════════════════════════════════════════════════

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  item: InventoryItem | null
  onDone: () => void
}

type Direction = 'in' | 'out'

export function StockAdjustmentDialog({ open, onOpenChange, item, onDone }: Props) {
  const [direction, setDirection] = useState<Direction>('in')
  const [qty, setQty] = useState('1')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset form whenever dialog opens
  useEffect(() => {
    if (open) {
      setDirection('in')
      setQty('1')
      setReason('')
    }
  }, [open, item])

  if (!item) return null

  const qtyNum = Math.abs(Number(qty) || 0)
  const delta = (direction === 'in' ? 1 : -1) * qtyNum
  const newQty = Math.max(0, item.quantity + delta)

  async function submit() {
    if (qtyNum === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: item!.productId,
          type: 'ADJUST',
          quantity: delta,
          reference: `ADJ-${Date.now().toString().slice(-6)}`,
          notes: reason || `${direction === 'in' ? 'Added' : 'Removed'} ${qtyNum} units (manual adjustment)`,
        }),
      })
      if (res.ok) {
        onDone()
      } else {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Failed to adjust stock')
      }
    } catch (e: any) {
      // sonner toast is shown by parent — rethrow
      throw e
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {item.sku}</DialogTitle>
          <DialogDescription>{item.name} · currently {num(item.quantity)} on hand</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Direction toggle */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={direction === 'in' ? 'default' : 'outline'}
              className={cn('h-16 flex flex-col gap-1', direction === 'in' && 'ring-2 ring-primary')}
              onClick={() => setDirection('in')}
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs">Add stock</span>
            </Button>
            <Button
              type="button"
              variant={direction === 'out' ? 'destructive' : 'outline'}
              className={cn('h-16 flex flex-col gap-1', direction === 'out' && 'ring-2 ring-destructive')}
              onClick={() => setDirection('out')}
            >
              <Minus className="h-5 w-5" />
              <span className="text-xs">Remove stock</span>
            </Button>
          </div>

          {/* Quantity & reason */}
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason / notes</Label>
            <Textarea
              id="reason"
              placeholder="e.g. Damaged write-off, stock-take correction, found stock, etc."
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Live preview */}
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Current on-hand</span>
              <span className="font-medium tabular-nums">{num(item.quantity)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                Change
                <MovementPill type={direction === 'in' ? 'IN' : 'OUT'} />
              </span>
              <span className={cn('font-medium tabular-nums', delta > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {delta > 0 ? '+' : ''}{delta}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-2">
              <span className="text-muted-foreground">New on-hand</span>
              <span className="font-semibold tabular-nums">{num(newQty)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Value change</span>
              <span className={cn('tabular-nums', delta > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                {delta > 0 ? '+' : ''}{bdt(delta * item.costPrice)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={saving || qtyNum === 0}
            variant={direction === 'out' ? 'destructive' : 'default'}
          >
            {saving ? 'Posting…' : direction === 'in' ? 'Add stock' : 'Remove stock'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
