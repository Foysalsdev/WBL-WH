'use client'

import { useState } from 'react'
import { ClipboardList, ScanLine, FileText, PackageCheck, ShieldCheck, CheckCircle2, MapPin } from 'lucide-react'
import { EmptyState, StatusBadge } from '@/components/system'
import { useSalesOrders } from './hooks'
import { WorkflowDialog } from './WorkflowDialog'
import { bdt, num, date } from '@/lib/format'
import type { SalesOrder, Dispatch } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  WorkflowTab — card grid for each workflow step
//  Shows only SOs that are ready for the current step
// ═══════════════════════════════════════════════════════════════

interface Props {
  step: 'pick' | 'scan' | 'invoice' | 'dispatch' | 'pod'
}

const STEP_META: Record<string, {
  title: string
  description: string
  icon: any
  expectedStatus: string
  actionLabel: string
}> = {
  pick:     { title: 'Pick Queue',        description: 'Confirmed orders awaiting warehouse pick',           icon: ClipboardList, expectedStatus: 'confirmed', actionLabel: 'Start picking' },
  scan:     { title: 'Scan Queue',        description: 'Picked orders awaiting barcode verification',         icon: ScanLine,       expectedStatus: 'picked',    actionLabel: 'Start scanning' },
  invoice:  { title: 'Invoice Queue',     description: 'Scanned orders awaiting invoice generation',          icon: FileText,       expectedStatus: 'scanned',   actionLabel: 'Generate invoice' },
  dispatch: { title: 'Dispatch Queue',    description: 'Invoiced orders awaiting dispatch (supports partial delivery)', icon: PackageCheck,   expectedStatus: 'invoiced',  actionLabel: 'Dispatch order' },
  pod:      { title: 'POD Confirmation',  description: 'Dispatched shipments awaiting proof of delivery',     icon: ShieldCheck,    expectedStatus: 'dispatched',actionLabel: 'Record POD' },
}

export function WorkflowTab({ step }: Props) {
  const { data, isLoading } = useSalesOrders()
  const [target, setTarget] = useState<{ so: SalesOrder; step: string; dispatch?: Dispatch | null } | null>(null)

  const meta = STEP_META[step]
  const Icon = meta.icon

  // For dispatch tab, include both 'invoiced' and 'partially_dispatched'
  // For POD tab, include any SO that has at least one dispatch with pending POD
  let queue: SalesOrder[]
  if (step === 'dispatch') {
    queue = (data || []).filter((so) => so.status === 'invoiced' || so.status === 'partially_dispatched')
  } else if (step === 'pod') {
    queue = (data || []).filter((so) =>
      (so.status === 'dispatched' || so.status === 'partially_dispatched') &&
      (so.dispatches || []).some((d) => d.podStatus === 'pending'),
    )
  } else {
    queue = (data || []).filter((so) => so.status === meta.expectedStatus)
  }

  if (isLoading) {
    return <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
  }

  if (queue.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={CheckCircle2}
          title={`No orders in ${meta.title.toLowerCase()}`}
          description={`Orders will appear here when they reach the '${meta.expectedStatus}' status.`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" />
            {meta.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 stagger">
        {queue.map((so) => {
          const totalQty = (so.items || []).reduce((s, it) => s + it.quantity, 0)
          const pickedQty = (so.items || []).reduce((s, it) => s + (it.pickedQty || 0), 0)
          const scannedQty = (so.items || []).reduce((s, it) => s + (it.scannedQty || 0), 0)
          return (
            <div
              key={so.id}
              className="card-premium cursor-pointer group p-4"
              onClick={() => setTarget({ so, step })}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-muted-foreground">{so.soNumber}</p>
                  <p className="font-medium text-sm mt-0.5 truncate">{so.customer?.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {so.customer?.city || '—'}
                  </p>
                </div>
                <StatusBadge status={so.status} size="sm" />
              </div>

              {/* Step-specific stats */}
              <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Items</p>
                  <p className="font-medium tabular-nums">{num(so.items?.length || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Units</p>
                  <p className="font-medium tabular-nums">{num(totalQty)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-medium tabular-nums text-xs">{bdt(so.totalAmount)}</p>
                </div>
              </div>

              {/* Step-specific extra info */}
              {step === 'pick' && so.deliveryDate && (
                <p className="text-xs text-muted-foreground mb-3">Target delivery: {date(so.deliveryDate)}</p>
              )}
              {step === 'scan' && (
                <div className="mb-3">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-violet-500" style={{ width: `${totalQty > 0 ? (pickedQty / totalQty) * 100 : 0}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{pickedQty}/{totalQty} units picked</p>
                </div>
              )}
              {step === 'dispatch' && (
                <div className="mb-3 space-y-1">
                  {so.invoiceNo && (
                    <p className="text-xs text-muted-foreground font-mono">Invoice: {so.invoiceNo} · {num(so.cartonCount)} cartons</p>
                  )}
                  {so.status === 'partially_dispatched' && (
                    <p className="text-xs text-amber-600 font-medium">
                      {num((so.items || []).reduce((s, it) => s + (it.deliveredQty || 0), 0))}/{num(totalQty)} units already dispatched
                    </p>
                  )}
                </div>
              )}
              {step === 'pod' && (
                <div className="mb-3 space-y-1">
                  {(so.dispatches || []).filter((d) => d.podStatus === 'pending').map((d) => (
                    <div key={d.id} className="text-xs text-muted-foreground font-mono">
                      {d.dispatchNo} · {d.deliveryMethod === 'transport' ? `Vehicle ${d.vehicleNo}` : `${d.courierName} ${d.trackingNumber}`}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // For POD, pass the first pending dispatch
                  if (step === 'pod') {
                    const pendingDispatch = (so.dispatches || []).find((d) => d.podStatus === 'pending')
                    setTarget({ so, step, dispatch: pendingDispatch || null })
                  } else {
                    setTarget({ so, step })
                  }
                }}
                className="w-full h-8 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center justify-center gap-1"
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.actionLabel}
              </button>
            </div>
          )
        })}
      </div>

      <WorkflowDialog target={target} onClose={() => setTarget(null)} />
    </div>
  )
}
