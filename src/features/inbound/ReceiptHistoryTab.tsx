'use client'

import { History, Eye } from 'lucide-react'
import { EmptyState, StatusBadge } from '@/components/system'
import { CodeCell, DataTable, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { ViewDialog, type ViewField } from '@/components/system/view-dialog'
import { usePurchaseOrders } from './hooks'
import { useState } from 'react'
import { bdt, num, date } from '@/lib/format'
import type { PurchaseOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  ReceiptHistoryTab — all GRNs that have been posted
// ═══════════════════════════════════════════════════════════════

export function ReceiptHistoryTab() {
  const [search, setSearch] = useState('')
  const [viewItem, setViewItem] = useState<PurchaseOrder | null>(null)
  const { data, isLoading, isError, refetch } = usePurchaseOrders()

  const received = (data || []).filter((po) => po.status === 'received' || po.status === 'partial')

  const filtered = received.filter((po) => {
    if (!search) return true
    const q = search.toLowerCase()
    return po.poNumber.toLowerCase().includes(q) ||
           po.grnNumber?.toLowerCase().includes(q) ||
           po.supplier?.name.toLowerCase().includes(q) ||
           po.vehicleNo?.toLowerCase().includes(q) ||
           po.invoiceRef?.toLowerCase().includes(q)
  })

  function viewFields(po: PurchaseOrder): ViewField[] {
    return [
      { label: 'GRN Number', value: po.grnNumber || '—', mono: true },
      { label: 'PO Number', value: po.poNumber, mono: true },
      { label: 'Status', value: <StatusBadge status={po.status} /> },
      { label: 'Supplier', value: po.supplier?.name || '—' },
      { label: 'Vehicle No', value: po.vehicleNo || '—', mono: true },
      { label: 'Invoice Ref', value: po.invoiceRef || '—', mono: true },
      { label: 'Received By', value: po.receivedBy || '—' },
      { label: 'Received Date', value: date(po.receivedDate) },
    ]
  }

  const columns: Column<PurchaseOrder>[] = [
    {
      key: 'grnNumber', header: 'GRN Number',
      cell: (po) => <CodeCell code={po.grnNumber || '—'} onClick={() => setViewItem(po)} />,
      sort: (a, b) => (a.grnNumber || '').localeCompare(b.grnNumber || ''),
    },
    { key: 'poNumber', header: 'PO Number', cell: (po) => <span className="font-mono text-xs">{po.poNumber}</span> },
    { key: 'supplier', header: 'Supplier', cell: (po) => <span className="font-medium">{po.supplier?.name}</span> },
    { key: 'vehicleNo', header: 'Vehicle', cell: (po) => <span className="text-xs font-mono">{po.vehicleNo || '—'}</span> },
    { key: 'invoiceRef', header: 'Invoice', cell: (po) => <span className="text-xs font-mono">{po.invoiceRef || '—'}</span> },
    { key: 'receivedBy', header: 'Received By', cell: (po) => <span className="text-sm">{po.receivedBy || '—'}</span> },
    { key: 'receivedDate', header: 'Received', cell: (po) => <span className="text-xs text-muted-foreground">{date(po.receivedDate)}</span> },
    {
      key: 'items', header: 'Items', align: 'right',
      cell: (po) => {
        const received = (po.items || []).reduce((s, it) => s + (it.receivedQty || 0), 0)
        const failed = (po.items || []).reduce((s, it) => s + (it.failedQty || 0), 0)
        return (
          <span className="tabular-nums">
            <span className="text-emerald-600 font-medium">{received}</span>
            {failed > 0 && <span className="text-rose-600 ml-1">({failed} rej.)</span>}
          </span>
        )
      },
    },
    { key: 'status', header: 'Status', cell: (po) => <StatusBadge status={po.status} /> },
  ]

  return (
    <MasterTabShell<PurchaseOrder>
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Search by GRN, PO, supplier, vehicle or invoice…"
      onRefresh={() => refetch()}
      isLoading={isLoading}
      isError={isError}
      isEmpty={!isLoading && filtered.length === 0}
      emptyTitle="No receipts yet"
      emptyDescription="GRNs will appear here once purchase orders are received."
      emptyIcon={History}
      onRetry={() => refetch()}
    >
      <DataTable
        data={filtered}
        columns={columns}
        rowKey={(po) => po.id}
        initialSortKey="receivedDate"
        initialSortDir="desc"
      />

      <ViewDialog
        open={viewItem !== null}
        onOpenChange={(o) => !o && setViewItem(null)}
        code={viewItem?.grnNumber || viewItem?.poNumber}
        title={viewItem?.supplier?.name || 'Receipt'}
        subtitle={viewItem ? `Received ${date(viewItem.receivedDate)}` : ''}
        badge={viewItem ? { label: viewItem.status, tone: viewItem.status === 'received' ? 'success' : 'info' } : undefined}
        fields={viewItem ? viewFields(viewItem) : []}
        footer={
          viewItem && viewItem.items && viewItem.items.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Received Items</p>
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
    </MasterTabShell>
  )
}
