'use client'

import { ClipboardCheck, CheckCircle2 } from 'lucide-react'
import { EmptyState, StatusBadge } from '@/components/system'
import { usePurchaseOrders } from './hooks'
import { GrnDialog } from './GrnDialog'
import { useState } from 'react'
import { bdt, num, date } from '@/lib/format'
import type { PurchaseOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  GrnQueueTab — POs awaiting goods receipt (ordered or partial)
// ═══════════════════════════════════════════════════════════════

export function GrnQueueTab() {
  const { data, isLoading } = usePurchaseOrders()
  const [grnTarget, setGrnTarget] = useState<PurchaseOrder | null>(null)

  const queue = (data || []).filter((po) => po.status === 'ordered' || po.status === 'partial')

  if (isLoading) {
    return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading GRN queue…</div>
  }

  if (queue.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={CheckCircle2}
          title="No pending receipts"
          description="All purchase orders are fully received. New receipts will appear here when POs are in 'ordered' or 'partial' status."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            GRN Queue
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">POs awaiting goods receipt — process them with quality check &amp; putaway</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 stagger">
        {queue.map((po) => {
          const totalOrdered = (po.items || []).reduce((s, it) => s + it.quantity, 0)
          const totalReceived = (po.items || []).reduce((s, it) => s + (it.receivedQty || 0), 0)
          const remaining = totalOrdered - totalReceived
          const progressPct = totalOrdered > 0 ? Math.round((totalReceived / totalOrdered) * 100) : 0
          return (
            <div
              key={po.id}
              className="card-premium cursor-pointer group p-4"
              onClick={() => setGrnTarget(po)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-xs text-muted-foreground">{po.poNumber}</p>
                  <p className="font-medium text-sm mt-0.5">{po.supplier?.name}</p>
                </div>
                <StatusBadge status={po.status} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Ordered</p>
                  <p className="font-medium tabular-nums">{num(totalOrdered)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Received</p>
                  <p className="font-medium tabular-nums text-emerald-600">{num(totalReceived)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="font-medium tabular-nums text-amber-600">{num(remaining)}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 text-right">{progressPct}% received</p>
              </div>

              {po.expectedDate && (
                <p className="text-xs text-muted-foreground mb-3">Expected: {date(po.expectedDate)}</p>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); setGrnTarget(po) }}
                className="w-full h-8 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-1"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Receive goods
              </button>
            </div>
          )
        })}
      </div>

      <GrnDialog po={grnTarget} onClose={() => setGrnTarget(null)} />
    </div>
  )
}
