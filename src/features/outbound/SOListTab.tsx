'use client'

import { useState } from 'react'
import { Truck, X, ClipboardList, ScanLine, FileText, PackageCheck, ShieldCheck, Send, Printer, FileCheck, ScanLine as ScanIcon } from 'lucide-react'
import { StatusBadge } from '@/components/system'
import { CodeCell, DataTable, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { ViewDialog, type ViewField } from '@/components/system/view-dialog'
import { RowActions } from '@/components/system/row-actions'
import { printDeliveryChallan, printGatePass } from './print-docs'
import { useSalesOrders, usePatchSO } from './hooks'
import { WorkflowDialog } from './WorkflowDialog'
import { toast } from 'sonner'
import { bdt, num, date, dateTime } from '@/lib/format'
import type { SalesOrder, Dispatch } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  SOListTab — all sales orders with status-aware action buttons
//  Supports partial dispatch + per-dispatch POD
// ═══════════════════════════════════════════════════════════════

export function SOListTab() {
  const [search, setSearch] = useState('')
  const [viewItem, setViewItem] = useState<SalesOrder | null>(null)
  const [workflowTarget, setWorkflowTarget] = useState<{ so: SalesOrder; step: string; dispatch?: Dispatch | null } | null>(null)
  const { data, isLoading, isError, refetch } = useSalesOrders()
  const patchMutation = usePatchSO()

  const filtered = (data || []).filter((so) => {
    if (!search) return true
    const q = search.toLowerCase()
    return so.soNumber.toLowerCase().includes(q) ||
           so.customer?.name.toLowerCase().includes(q) ||
           so.invoiceNo?.toLowerCase().includes(q) ||
           so.dispatches?.some((d) => d.challanNo?.toLowerCase().includes(q) || d.dispatchNo.toLowerCase().includes(q))
  })

  async function setStatus(so: SalesOrder, status: string) {
    try {
      await patchMutation.mutateAsync({ id: so.id, body: { action: 'status', status } })
      toast.success(`${so.soNumber} → ${status}`)
    } catch (e: any) {
      toast.error('Failed to update status', { description: e.message })
    }
  }

  function printInvoice(so: SalesOrder) {
    const w = window.open('', '_blank', 'width=800,height=1000')
    if (!w) { toast.error('Pop-up blocked'); return }
    const rows = (so.items || []).map((it) => `
      <tr>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${it.product?.sku || ''}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;">${it.product?.name || ''}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right;">${it.quantity}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right;">TK ${it.unitPrice.toLocaleString('en-IN')}</td>
        <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">TK ${(it.quantity * it.unitPrice).toLocaleString('en-IN')}</td>
      </tr>
    `).join('')
    w.document.write(`
      <html><head><title>${so.soNumber} — Invoice</title>
      <style>
        body{font-family:Arial,sans-serif;margin:32px;color:#142032}
        .header{display:flex;justify-content:space-between;border-bottom:2px solid #0c389f;padding-bottom:12px;margin-bottom:20px}
        .brand{font-size:20px;font-weight:700;color:#0c389f}
        h1{font-size:18px;margin:16px 0 4px}
        table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
        th{background:#f3f4f6;padding:6px;text-align:left;font-size:11px;text-transform:uppercase}
        .total{margin-top:16px;text-align:right;font-size:16px;font-weight:700}
        .info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:13px}
      </style></head><body>
      <div class="header"><div><div class="brand">Whirlpool Bangladesh</div><div style="font-size:11px;color:#6b7280">Warehouse Management System</div></div>
      <div style="text-align:right;font-size:13px"><strong>INVOICE</strong><br/>${so.invoiceNo || so.soNumber}<br/>${date(so.invoiceDate || so.orderDate)}</div></div>
      <div class="info">
        <div><strong>Dealer:</strong> ${so.customer?.name || ''}<br/><strong>Code:</strong> ${so.customer?.code || ''}<br/><strong>City:</strong> ${so.customer?.city || ''}</div>
        <div><strong>SO Number:</strong> ${so.soNumber}<br/><strong>Order Date:</strong> ${date(so.orderDate)}<br/><strong>Delivery Date:</strong> ${date(so.deliveryDate)}</div>
      </div>
      <table><thead><tr><th>SKU</th><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="total">Grand Total: TK ${so.totalAmount.toLocaleString('en-IN')}</div>
      </body></html>
    `)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  function viewFields(so: SalesOrder): ViewField[] {
    return [
      { label: 'SO Number', value: so.soNumber, mono: true },
      { label: 'Status', value: <StatusBadge status={so.status} /> },
      { label: 'Dealer', value: so.customer?.name || '—' },
      { label: 'Dealer Code', value: so.customer?.code || '—', mono: true },
      { label: 'Order Date', value: date(so.orderDate) },
      { label: 'Delivery Date', value: date(so.deliveryDate) },
      { label: 'Total Amount', value: bdt(so.totalAmount), mono: true },
      { label: 'Invoice No', value: so.invoiceNo || '—', mono: true },
      { label: 'Picked By', value: so.pickedBy || '—' },
      { label: 'Scanned By', value: so.scannedBy || '—' },
      { label: 'Notes', value: so.notes || '—', full: true },
    ]
  }

  // Calculate delivery progress for an SO
  function deliveryProgress(so: SalesOrder): { delivered: number; total: number; pct: number } {
    const total = (so.items || []).reduce((s, it) => s + (it.pickedQty || it.quantity), 0)
    const delivered = (so.items || []).reduce((s, it) => s + (it.deliveredQty || 0), 0)
    return { delivered, total, pct: total > 0 ? Math.round((delivered / total) * 100) : 0 }
  }

  // Find pending POD dispatches
  function pendingPodDispatches(so: SalesOrder): Dispatch[] {
    return (so.dispatches || []).filter((d) => d.podStatus === 'pending')
  }

  const columns: Column<SalesOrder>[] = [
    {
      key: 'soNumber', header: 'SO Number',
      cell: (so) => <CodeCell code={so.soNumber} onClick={() => setViewItem(so)} />,
      sort: (a, b) => a.soNumber.localeCompare(b.soNumber),
    },
    { key: 'customer', header: 'Dealer', cell: (so) => <span className="font-medium">{so.customer?.name}</span> },
    {
      key: 'progress', header: 'Delivery', align: 'center',
      cell: (so) => {
        const { delivered, total, pct } = deliveryProgress(so)
        if (total === 0) return <span className="text-xs text-muted-foreground">—</span>
        return (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs tabular-nums">{delivered}/{total}</span>
            <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
              <div className={`h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
    { key: 'totalAmount', header: 'Amount', align: 'right', cell: (so) => <span className="tabular-nums">{bdt(so.totalAmount)}</span>, sort: (a, b) => a.totalAmount - b.totalAmount },
    {
      key: 'dispatches', header: 'Trips', align: 'center',
      cell: (so) => {
        const count = so.dispatches?.length || 0
        return count > 0 ? <span className="text-xs tabular-nums">{count}</span> : <span className="text-xs text-muted-foreground">—</span>
      },
    },
    { key: 'status', header: 'Status', cell: (so) => <StatusBadge status={so.status} size="sm" /> },
    {
      key: 'actions', header: '', align: 'right', noPadding: true,
      cell: (so) => {
        const pendingPods = pendingPodDispatches(so)
        return (
          <div className="flex items-center justify-end gap-1.5">
            {so.status === 'draft' && (
              <>
                <button onClick={() => setStatus(so, 'confirmed')} className="h-8 px-2.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors">Confirm</button>
                <button onClick={() => setStatus(so, 'cancelled')} className="h-8 px-2.5 text-xs font-medium rounded-md border border-input text-rose-600 hover:bg-rose-500/10 transition-colors"><X className="h-3.5 w-3.5" /></button>
              </>
            )}
            {so.status === 'confirmed' && (
              <button onClick={() => setWorkflowTarget({ so, step: 'pick' })} className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"><ClipboardList className="h-3.5 w-3.5" />Pick</button>
            )}
            {so.status === 'picked' && (
              <button onClick={() => setWorkflowTarget({ so, step: 'scan' })} className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"><ScanLine className="h-3.5 w-3.5" />Scan</button>
            )}
            {so.status === 'scanned' && (
              <button onClick={() => setWorkflowTarget({ so, step: 'invoice' })} className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />Invoice</button>
            )}
            {(so.status === 'invoiced' || so.status === 'partially_dispatched') && (
              <button onClick={() => setWorkflowTarget({ so, step: 'dispatch' })} className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"><PackageCheck className="h-3.5 w-3.5" />Dispatch</button>
            )}
            {pendingPods.length > 0 && (
              <button onClick={() => setWorkflowTarget({ so, step: 'pod', dispatch: pendingPods[0] })} className="h-8 px-2.5 text-xs font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />POD ({pendingPods.length})</button>
            )}
            <RowActions
              onView={() => setViewItem(so)}
              onPrint={() => printInvoice(so)}
            />
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <MasterTabShell<SalesOrder>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by SO number, dealer, invoice, challan or dispatch no…"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && filtered.length === 0}
        emptyTitle="No sales orders yet"
        emptyDescription="Create your first SO to start the dispatch workflow."
        emptyIcon={Truck}
        onRetry={() => refetch()}
      >
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(so) => so.id}
          initialSortKey="soNumber"
          initialSortDir="desc"
        />
      </MasterTabShell>

      <ViewDialog
        open={viewItem !== null}
        onOpenChange={(o) => !o && setViewItem(null)}
        code={viewItem?.soNumber}
        title={viewItem?.customer?.name || 'Sales Order'}
        subtitle={viewItem ? `Ordered ${date(viewItem.orderDate)}` : ''}
        badge={viewItem ? {
          label: viewItem.status,
          tone: viewItem.status === 'delivered' ? 'success' : viewItem.status === 'cancelled' ? 'destructive' : 'info',
        } : undefined}
        fields={viewItem ? viewFields(viewItem) : []}
        onEdit={undefined}
        onPrint={() => viewItem && printInvoice(viewItem)}
        footer={
          viewItem ? (
            <div className="space-y-4">
              {/* Line items with delivery progress */}
              {viewItem.items && viewItem.items.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Line Items</p>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                        <tr>
                          <th className="text-left p-2">Product</th>
                          <th className="text-right p-2">Ordered</th>
                          <th className="text-right p-2">Picked</th>
                          <th className="text-right p-2">Scanned</th>
                          <th className="text-right p-2">Delivered</th>
                          <th className="text-right p-2">Unit Price</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewItem.items.map((it) => (
                          <tr key={it.id} className="border-t">
                            <td className="p-2">
                              <div className="font-medium">{it.product?.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{it.product?.sku}</div>
                            </td>
                            <td className="text-right p-2 tabular-nums">{it.quantity}</td>
                            <td className="text-right p-2 tabular-nums text-violet-600">{it.pickedQty || 0}</td>
                            <td className="text-right p-2 tabular-nums text-indigo-600">{it.scannedQty || 0}</td>
                            <td className="text-right p-2 tabular-nums text-emerald-600 font-medium">{it.deliveredQty || 0}</td>
                            <td className="text-right p-2 tabular-nums">{bdt(it.unitPrice)}</td>
                            <td className="text-right p-2 tabular-nums font-medium">{bdt(it.quantity * it.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Dispatch / delivery tracking */}
              {viewItem.dispatches && viewItem.dispatches.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Dispatch History ({viewItem.dispatches.length} {viewItem.dispatches.length === 1 ? 'trip' : 'trips'})
                  </p>
                  <div className="space-y-2">
                    {viewItem.dispatches.map((d) => (
                      <div key={d.id} className="rounded-md border p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="font-mono text-sm font-medium">{d.dispatchNo}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{date(d.dispatchedAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground capitalize">{d.deliveryMethod}</span>
                            <StatusBadge status={d.podStatus} size="sm" />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Challan: </span>
                            <span className="font-mono">{d.challanNo || '—'}</span>
                          </div>
                          {d.deliveryMethod === 'transport' ? (
                            <>
                              <div><span className="text-muted-foreground">Vehicle: </span>{d.vehicleNo || '—'}</div>
                              <div><span className="text-muted-foreground">Driver: </span>{d.driverName || '—'}</div>
                            </>
                          ) : (
                            <>
                              <div><span className="text-muted-foreground">Courier: </span>{d.courierName || '—'}</div>
                              <div><span className="text-muted-foreground">Tracking: </span><span className="font-mono">{d.trackingNumber || '—'}</span></div>
                            </>
                          )}
                          <div><span className="text-muted-foreground">Units: </span><span className="tabular-nums font-medium">{d.totalQty}</span></div>
                        </div>
                        {d.podStatus === 'confirmed' && (
                          <div className="mt-2 pt-2 border-t text-xs text-emerald-600">
                            ✓ Delivered to {d.podReceivedBy || '—'} on {date(d.podDate)}
                            {d.podNotes && <span className="text-muted-foreground"> — {d.podNotes}</span>}
                          </div>
                        )}
                        {d.podStatus === 'pending' && (
                          <button
                            onClick={() => { setWorkflowTarget({ so: viewItem, step: 'pod', dispatch: d }); setViewItem(null) }}
                            className="mt-2 h-7 px-2 text-xs font-medium rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors inline-flex items-center gap-1"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Record POD
                          </button>
                        )}
                        {/* Print buttons — Delivery Challan & Gate Pass */}
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => printDeliveryChallan(viewItem, d)}
                            className="h-7 px-2 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors inline-flex items-center gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            Delivery Challan
                          </button>
                          <button
                            onClick={() => printGatePass(viewItem, d)}
                            className="h-7 px-2 text-xs font-medium rounded-md border border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors inline-flex items-center gap-1"
                          >
                            <FileCheck className="h-3 w-3" />
                            Gate Pass
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : undefined
        }
      />

      <WorkflowDialog target={workflowTarget} onClose={() => setWorkflowTarget(null)} />
    </div>
  )
}
