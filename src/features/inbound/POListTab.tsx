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
              onPrint={() => toast.info('Print coming soon', { description: `Print for ${po.poNumber}` })}
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
        onPrint={() => toast.info('Print coming soon')}
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

// Need to import ClipboardCheck icon here for the JSX above
import { ClipboardCheck } from 'lucide-react'
