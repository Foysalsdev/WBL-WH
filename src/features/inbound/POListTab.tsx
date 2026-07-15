'use client'

import { useState } from 'react'
import { PackageOpen, Eye, X, CheckCircle2 } from 'lucide-react'
import { EmptyState, StatusBadge } from '@/components/system'
import { CodeCell, DataTable, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { ViewDialog, type ViewField } from '@/components/system/view-dialog'
import { RowActions } from '@/components/system/row-actions'
import { usePurchaseOrders, usePatchPO } from './hooks'
import { GrnDialog } from './GrnDialog'
import { toast } from 'sonner'
import { bdt, num, date } from '@/lib/format'
import type { PurchaseOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  POListTab — list of all purchase orders with status-aware actions
// ═══════════════════════════════════════════════════════════════

export function POListTab() {
  const [search, setSearch] = useState('')
  const [viewItem, setViewItem] = useState<PurchaseOrder | null>(null)
  const [grnTarget, setGrnTarget] = useState<PurchaseOrder | null>(null)
  const { data, isLoading, isError, refetch } = usePurchaseOrders()
  const patchMutation = usePatchPO()

  const filtered = (data || []).filter((po) => {
    if (!search) return true
    const q = search.toLowerCase()
    return po.poNumber.toLowerCase().includes(q) ||
           po.supplier?.name.toLowerCase().includes(q) ||
           po.grnNumber?.toLowerCase().includes(q)
  })

  async function setStatus(po: PurchaseOrder, status: string) {
    try {
      await patchMutation.mutateAsync({ id: po.id, body: { action: 'status', status } })
      toast.success(`${po.poNumber} → ${status}`)
    } catch (e: any) {
      toast.error('Failed to update status', { description: e.message })
    }
  }

  function viewFields(po: PurchaseOrder): ViewField[] {
    return [
      { label: 'PO Number', value: po.poNumber, mono: true },
      { label: 'Status', value: <StatusBadge status={po.status} /> },
      { label: 'Supplier', value: po.supplier?.name || '—' },
      { label: 'Supplier Code', value: po.supplier?.code || '—', mono: true },
      { label: 'Order Date', value: date(po.orderDate) },
      { label: 'Expected Date', value: date(po.expectedDate) },
      { label: 'Received Date', value: date(po.receivedDate) },
      { label: 'Received By', value: po.receivedBy || '—' },
      { label: 'GRN Number', value: po.grnNumber || '—', mono: true },
      { label: 'Vehicle No', value: po.vehicleNo || '—', mono: true },
      { label: 'Invoice Ref', value: po.invoiceRef || '—', mono: true },
      { label: 'Total Amount', value: bdt(po.totalAmount), mono: true },
      { label: 'Notes', value: po.notes || '—', full: true },
    ]
  }

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'poNumber', header: 'PO Number',
      cell: (po) => <CodeCell code={po.poNumber} onClick={() => setViewItem(po)} />,
      sort: (a, b) => a.poNumber.localeCompare(b.poNumber),
    },
    { key: 'supplier', header: 'Supplier', cell: (po) => <span className="font-medium">{po.supplier?.name}</span> },
    { key: 'orderDate', header: 'Ordered', cell: (po) => <span className="text-sm">{date(po.orderDate)}</span>, sort: (a, b) => a.orderDate.getTime() - b.orderDate.getTime() },
    { key: 'expectedDate', header: 'Expected', cell: (po) => <span className="text-sm">{date(po.expectedDate)}</span> },
    {
      key: 'progress', header: 'Items', align: 'right',
      cell: (po) => {
        const ordered = (po.items || []).reduce((s, it) => s + it.quantity, 0)
        const received = (po.items || []).reduce((s, it) => s + (it.receivedQty || 0), 0)
        return <span className="tabular-nums">{received}/{ordered}</span>
      },
    },
    { key: 'totalAmount', header: 'Amount', align: 'right', cell: (po) => <span className="tabular-nums">{bdt(po.totalAmount)}</span>, sort: (a, b) => a.totalAmount - b.totalAmount },
    { key: 'status', header: 'Status', cell: (po) => <StatusBadge status={po.status} /> },
    {
      key: 'actions', header: '', align: 'right', noPadding: true,
      cell: (po) => {
        const canGrn = po.status === 'ordered' || po.status === 'partial'
        return (
          <div className="flex items-center justify-end gap-1.5">
            {po.status === 'draft' && (
              <button
                onClick={() => setStatus(po, 'ordered')}
                className="h-8 px-2.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
              >
                Order
              </button>
            )}
            {canGrn && (
              <button
                onClick={() => setGrnTarget(po)}
                className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
              >
                <ClipboardCheck className="h-3.5 w-3.5" />
                Receive
              </button>
            )}
            <RowActions
              onView={() => setViewItem(po)}
              onPrint={() => printPurchaseOrder(po)}
              onDelete={po.status === 'draft' ? () => setStatus(po, 'cancelled') : undefined}
            />
          </div>
        )
      },
    },
  ]

  return (
    <div>
      <MasterTabShell<PurchaseOrder>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by PO number, supplier, or GRN…"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && filtered.length === 0}
        emptyTitle="No purchase orders yet"
        emptyDescription="Create your first PO to source Whirlpool appliances."
        emptyIcon={PackageOpen}
        onRetry={() => refetch()}
      >
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(po) => po.id}
          initialSortKey="poNumber"
          initialSortDir="desc"
        />
      </MasterTabShell>

      <ViewDialog
        open={viewItem !== null}
        onOpenChange={(o) => !o && setViewItem(null)}
        code={viewItem?.poNumber}
        title={viewItem?.supplier?.name || 'Purchase Order'}
        subtitle={viewItem ? `Ordered ${date(viewItem.orderDate)}` : ''}
        badge={viewItem ? { label: viewItem.status, tone: viewItem.status === 'received' ? 'success' : viewItem.status === 'cancelled' ? 'destructive' : 'info' } : undefined}
        fields={viewItem ? viewFields(viewItem) : []}
        onPrint={() => viewItem && printPurchaseOrder(viewItem)}
        footer={
          viewItem && viewItem.items && viewItem.items.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Line Items</p>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">Product</th>
                      <th className="text-right p-2">Ordered</th>
                      <th className="text-right p-2">Received</th>
                      <th className="text-right p-2">Passed</th>
                      <th className="text-right p-2">Failed</th>
                      <th className="text-left p-2">Putaway</th>
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
                        <td className="text-right p-2 tabular-nums text-emerald-600">{it.receivedQty || 0}</td>
                        <td className="text-right p-2 tabular-nums">{it.passedQty || 0}</td>
                        <td className="text-right p-2 tabular-nums text-rose-600">{it.failedQty || 0}</td>
                        <td className="p-2 text-xs font-mono">{it.putawayLocation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : undefined
        }
      />

      <GrnDialog po={grnTarget} onClose={() => setGrnTarget(null)} />
    </div>
  )
}

// ─── Print helper — Purchase Order PDF ──────────────────────────
function printPurchaseOrder(po: PurchaseOrder) {
  const rows = (po.items || []).map((it, i) => `
    <tr>
      <td style="text-align:center">${i + 1}</td>
      <td style="font-family:monospace">${it.product?.sku || '—'}</td>
      <td>${it.product?.name || '—'}</td>
      <td style="text-align:right">${it.quantity}</td>
      <td style="text-align:right">TK ${it.unitPrice.toLocaleString('en-IN')}</td>
      <td style="text-align:right;font-weight:600">TK ${(it.quantity * it.unitPrice).toLocaleString('en-IN')}</td>
    </tr>
  `).join('')
  const w = window.open('', '_blank', 'width=800,height=1000')
  if (!w) { toast.error('Pop-up blocked'); return }
  w.document.write(`
    <html><head><title>${po.poNumber} — Purchase Order</title>
    <style>
      body{font-family:Arial,sans-serif;margin:32px;color:#142032}
      .header{display:flex;justify-content:space-between;border-bottom:3px solid #0c389f;padding-bottom:12px;margin-bottom:20px}
      .brand{font-size:20px;font-weight:700;color:#0c389f}
      h1{font-size:20px;margin:12px 0 4px}
      .info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;font-size:13px}
      .info-box{border:1px solid #e5e7eb;border-radius:4px;padding:10px}
      .info-box h3{font-size:10px;text-transform:uppercase;color:#6b7280;margin:0 0 4px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:12px}
      th{background:#0c389f;color:white;padding:6px;text-align:left;font-size:11px;text-transform:uppercase}
      td{padding:6px 8px;border-bottom:1px solid #e5e7eb}
      .total{margin-top:12px;text-align:right;font-weight:700;font-size:16px}
      .footer{margin-top:40px;display:grid;grid-template-columns:repeat(3,1fr);gap:40px}
      .sign{border-top:1px solid #142032;margin-top:40px;padding-top:6px;font-size:11px;color:#6b7280;text-align:center}
      .meta{margin-top:32px;padding-top:8px;border-top:1px solid #e5e7eb;font-size:10px;color:#6b7280;text-align:center}
    </style></head><body>
    <div class="header">
      <div><div class="brand">Whirlpool Bangladesh</div><div style="font-size:11px;color:#6b7280">Warehouse Management System</div></div>
      <div style="text-align:right"><strong style="font-size:16px;color:#0c389f">PURCHASE ORDER</strong><br/><span style="font-family:monospace;font-weight:600">${po.poNumber}</span><br/><span style="font-size:11px;color:#6b7280">${date(po.orderDate)}</span></div>
    </div>
    <div class="info">
      <div class="info-box"><h3>Supplier</h3><p><strong>${po.supplier?.name || '—'}</strong></p><p>Code: ${po.supplier?.code || '—'}</p></div>
      <div class="info-box"><h3>Order Details</h3><p>Expected: ${date(po.expectedDate)}</p><p>GRN: ${po.grnNumber || '—'}</p><p>Status: ${po.status}</p></div>
    </div>
    ${po.notes ? `<p style="font-size:12px;color:#6b7280;margin-bottom:8px"><strong>Notes:</strong> ${po.notes}</p>` : ''}
    <table><thead><tr><th style="width:30px;text-align:center">#</th><th style="width:100px">SKU</th><th>Product</th><th style="text-align:right;width:50px">Qty</th><th style="text-align:right;width:90px">Unit Price</th><th style="text-align:right;width:110px">Total</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="total">Grand Total: TK ${po.totalAmount.toLocaleString('en-IN')}</div>
    <div class="footer">
      <div class="sign">Prepared By</div>
      <div class="sign">Approved By</div>
      <div class="sign">Supplier Signature</div>
    </div>
    <div class="meta">Whirlpool Bangladesh · WMS · PO ${po.poNumber} · Generated ${new Date().toLocaleString('en-GB')}</div>
    </body></html>
  `)
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
}

// Need to import ClipboardCheck icon here for the JSX above
import { ClipboardCheck } from 'lucide-react'
