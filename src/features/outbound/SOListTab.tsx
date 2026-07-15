'use client'

import { useState } from 'react'
import { Truck, X, ClipboardList, ScanLine, FileText, PackageCheck, ShieldCheck } from 'lucide-react'
import { StatusBadge } from '@/components/system'
import { CodeCell, DataTable, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { ViewDialog, type ViewField } from '@/components/system/view-dialog'
import { RowActions } from '@/components/system/row-actions'
import { useSalesOrders, usePatchSO } from './hooks'
import { WorkflowDialog } from './WorkflowDialog'
import { toast } from 'sonner'
import { bdt, num, date } from '@/lib/format'
import type { SalesOrder } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  SOListTab — all sales orders with status-aware action buttons
// ═══════════════════════════════════════════════════════════════

export function SOListTab() {
  const [search, setSearch] = useState('')
  const [viewItem, setViewItem] = useState<SalesOrder | null>(null)
  const [workflowTarget, setWorkflowTarget] = useState<{ so: SalesOrder; step: string } | null>(null)
  const { data, isLoading, isError, refetch } = useSalesOrders()
  const patchMutation = usePatchSO()

  const filtered = (data || []).filter((so) => {
    if (!search) return true
    const q = search.toLowerCase()
    return so.soNumber.toLowerCase().includes(q) ||
           so.customer?.name.toLowerCase().includes(q) ||
           so.invoiceNo?.toLowerCase().includes(q) ||
           so.challanNo?.toLowerCase().includes(q)
  })

  async function setStatus(so: SalesOrder, status: string) {
    try {
      await patchMutation.mutateAsync({ id: so.id, body: { action: 'status', status } })
      toast.success(`${so.soNumber} → ${status}`)
    } catch (e: any) {
      toast.error('Failed to update status', { description: e.message })
    }
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
      { label: 'Picked By', value: so.pickedBy || '—' },
      { label: 'Picked At', value: date(so.pickedAt) },
      { label: 'Scanned By', value: so.scannedBy || '—' },
      { label: 'Scanned At', value: date(so.scannedAt) },
      { label: 'Invoice No', value: so.invoiceNo || '—', mono: true },
      { label: 'Invoice Date', value: date(so.invoiceDate) },
      { label: 'Cartons', value: num(so.cartonCount), mono: true },
      { label: 'Challan No', value: so.challanNo || '—', mono: true },
      { label: 'Vehicle', value: so.vehicleNo || '—', mono: true },
      { label: 'Driver', value: so.driverName || '—' },
      { label: 'Dispatched At', value: date(so.dispatchedAt) },
      { label: 'POD Status', value: so.podStatus || '—' },
      { label: 'POD Received By', value: so.podReceivedBy || '—' },
      { label: 'POD Date', value: date(so.podDate) },
      { label: 'Notes', value: so.notes || '—', full: true },
      { label: 'POD Notes', value: so.podNotes || '—', full: true },
    ]
  }

  const columns: Column<SalesOrder>[] = [
    {
      key: 'soNumber', header: 'SO Number',
      cell: (so) => <CodeCell code={so.soNumber} onClick={() => setViewItem(so)} />,
      sort: (a, b) => a.soNumber.localeCompare(b.soNumber),
    },
    { key: 'customer', header: 'Dealer', cell: (so) => <span className="font-medium">{so.customer?.name}</span> },
    { key: 'orderDate', header: 'Ordered', cell: (so) => <span className="text-sm">{date(so.orderDate)}</span>, sort: (a, b) => a.orderDate.getTime() - b.orderDate.getTime() },
    { key: 'deliveryDate', header: 'Delivery', cell: (so) => <span className="text-sm">{date(so.deliveryDate)}</span> },
    { key: 'items', header: 'Items', align: 'right', cell: (so) => <span className="tabular-nums">{so.items?.length || 0}</span> },
    { key: 'totalAmount', header: 'Amount', align: 'right', cell: (so) => <span className="tabular-nums">{bdt(so.totalAmount)}</span>, sort: (a, b) => a.totalAmount - b.totalAmount },
    {
      key: 'status', header: 'Status',
      cell: (so) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={so.status} size="sm" />
          {so.podStatus && so.podStatus !== 'pending' && (
            <StatusBadge status={so.podStatus} size="sm" />
          )}
        </div>
      ),
    },
    {
      key: 'actions', header: '', align: 'right', noPadding: true,
      cell: (so) => {
        return (
          <div className="flex items-center justify-end gap-1.5">
            {so.status === 'draft' && (
              <>
                <button
                  onClick={() => setStatus(so, 'confirmed')}
                  className="h-8 px-2.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setStatus(so, 'cancelled')}
                  className="h-8 px-2.5 text-xs font-medium rounded-md border border-input text-rose-600 hover:bg-rose-500/10 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
            {so.status === 'confirmed' && (
              <button
                onClick={() => setWorkflowTarget({ so, step: 'pick' })}
                className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                Pick
              </button>
            )}
            {so.status === 'picked' && (
              <button
                onClick={() => setWorkflowTarget({ so, step: 'scan' })}
                className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Scan
              </button>
            )}
            {so.status === 'scanned' && (
              <button
                onClick={() => setWorkflowTarget({ so, step: 'invoice' })}
                className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
              >
                <FileText className="h-3.5 w-3.5" />
                Invoice
              </button>
            )}
            {so.status === 'invoiced' && (
              <button
                onClick={() => setWorkflowTarget({ so, step: 'dispatch' })}
                className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
              >
                <PackageCheck className="h-3.5 w-3.5" />
                Dispatch
              </button>
            )}
            {so.status === 'dispatched' && so.podStatus === 'pending' && (
              <button
                onClick={() => setWorkflowTarget({ so, step: 'pod' })}
                className="h-8 px-2.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                POD
              </button>
            )}
            <RowActions
              onView={() => setViewItem(so)}
              onPrint={() => toast.info('Print coming soon', { description: `Print for ${so.soNumber}` })}
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
        searchPlaceholder="Search by SO number, dealer, invoice or challan…"
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
                      <th className="text-right p-2">Picked</th>
                      <th className="text-right p-2">Scanned</th>
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
                        <td className="text-right p-2 tabular-nums">{bdt(it.unitPrice)}</td>
                        <td className="text-right p-2 tabular-nums font-medium">{bdt(it.quantity * it.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : undefined
        }
      />

      <WorkflowDialog
        target={workflowTarget}
        onClose={() => setWorkflowTarget(null)}
      />
    </div>
  )
}
