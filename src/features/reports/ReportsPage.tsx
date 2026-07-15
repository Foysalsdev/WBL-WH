'use client'

import { useState } from 'react'
import {
  BarChart3, Boxes, History, TrendingUp, ShoppingCart, Printer, ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, Legend,
} from 'recharts'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/system'
import { DataTable, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { bdt, num, date, dateTime } from '@/lib/format'
import { toast } from 'sonner'
import { inputClass } from '@/lib/styles'

// ═══════════════════════════════════════════════════════════════
//  ReportsPage — Stock Valuation, Movement Ledger, Sales & Purchase Summary
// ═══════════════════════════════════════════════════════════════

const BAR_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function ReportsPage() {
  const [tab, setTab] = useState('valuation')

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Reports & Analytics"
        description="Stock valuation, movement ledger, sales & purchase summaries"
        icon={BarChart3}
        breadcrumb={
          <>
            <span>Whirlpool BD</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Reports</span>
          </>
        }
      />

      {/* Tab selector — using buttons instead of Tabs for more control */}
      <div className="flex flex-wrap gap-2 border-b pb-px">
        {[
          { key: 'valuation',  label: 'Stock Valuation',  icon: Boxes },
          { key: 'stock',      label: 'Stock Report',      icon: BarChart3 },
          { key: 'movements',  label: 'Movement Ledger',   icon: History },
          { key: 'sales',      label: 'Sales Summary',     icon: TrendingUp },
          { key: 'purchases',  label: 'Purchase Summary',  icon: ShoppingCart },
        ].map((t) => {
          const Icon = t.icon
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="animate-fade-in">
        {tab === 'valuation'  && <ValuationReport />}
        {tab === 'stock'      && <StockReport />}
        {tab === 'movements'  && <MovementReport />}
        {tab === 'sales'      && <SalesReport />}
        {tab === 'purchases'  && <PurchaseReport />}
      </div>
    </div>
  )
}

// ─── Valuation Report ────────────────────────────────────────────
function ValuationReport() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report', 'valuation'],
    queryFn: () => api.get<any>('/api/reports?type=valuation'),
  })

  const rows = data?.rows || []
  const totalCost = data?.totalCost || 0
  const totalSale = data?.totalSale || 0
  const potentialProfit = totalSale - totalCost

  function print() {
    const w = window.open('', '_blank', 'width=800,height=900')
    if (!w) { toast.error('Pop-up blocked'); return }
    w.document.write(`
      <html><head><title>Stock Valuation Report</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#142032}
      h1{color:#0c389f;font-size:20px;border-bottom:2px solid #0c389f;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
      th{background:#f3f4f6;padding:8px;text-align:left;text-transform:uppercase;font-size:11px}
      td{padding:6px 8px;border-bottom:1px solid #e5e7eb}
      .total{margin-top:16px;text-align:right;font-weight:700;font-size:14px}
      .meta{font-size:11px;color:#6b7280;margin-bottom:16px}</style></head><body>
      <h1>Stock Valuation Report</h1>
      <div class="meta">Generated: ${new Date().toLocaleString('en-GB')} · Whirlpool Bangladesh WMS</div>
      <table><thead><tr><th>Category</th><th style="text-align:right">Units</th><th style="text-align:right">Cost Value</th><th style="text-align:right">Sale Value</th><th style="text-align:right">Potential Profit</th></tr></thead>
      <tbody>${rows.map((r:any) => `<tr><td>${r.category}</td><td style="text-align:right">${num(r.units)}</td><td style="text-align:right">${bdt(r.value)}</td><td style="text-align:right">${bdt(r.saleValue)}</td><td style="text-align:right">${bdt(r.saleValue - r.value)}</td></tr>`).join('')}</tbody></table>
      <div class="total">Total Cost Value: ${bdt(totalCost)}<br/>Total Sale Value: ${bdt(totalSale)}<br/>Potential Profit: ${bdt(potentialProfit)}</div>
      </body></html>
    `)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-3 stagger">
        <StatCard label="Total Stock Value (cost)" value={bdt(totalCost)} icon={Boxes} tone="success" />
        <StatCard label="Total Sale Value" value={bdt(totalSale)} icon={TrendingUp} tone="info" />
        <StatCard label="Potential Profit" value={bdt(potentialProfit)} icon={TrendingUp} tone="success" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Valuation by Category</h2>
        <button onClick={print} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : isError ? (
        <EmptyState icon={BarChart3} title="Failed to load" action={<button onClick={() => refetch()}>Retry</button>} />
      ) : (
        <>
          <div className="rounded-xl border bg-card p-6">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={rows} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => bdt(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" name="Cost Value" radius={[6, 6, 0, 0]}>
                  {rows.map((_: any, i: number) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                </Bar>
                <Bar dataKey="saleValue" name="Sale Value" radius={[6, 6, 0, 0]} fill="var(--chart-4)" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <DataTable
            data={rows}
            rowKey={(r: any) => r.category}
            columns={[
              { key: 'category', header: 'Category', cell: (r: any) => <span className="font-medium">{r.category}</span>, sort: (a: any, b: any) => a.category.localeCompare(b.category) },
              { key: 'units', header: 'Units', align: 'right', cell: (r: any) => <span className="tabular-nums">{num(r.units)}</span>, sort: (a: any, b: any) => a.units - b.units },
              { key: 'value', header: 'Cost Value', align: 'right', cell: (r: any) => <span className="tabular-nums">{bdt(r.value)}</span>, sort: (a: any, b: any) => a.value - b.value },
              { key: 'saleValue', header: 'Sale Value', align: 'right', cell: (r: any) => <span className="tabular-nums">{bdt(r.saleValue)}</span>, sort: (a: any, b: any) => a.saleValue - b.saleValue },
              { key: 'profit', header: 'Potential Profit', align: 'right', cell: (r: any) => <span className="tabular-nums text-emerald-600">{bdt(r.saleValue - r.value)}</span> },
              { key: 'pct', header: '% Share', align: 'right', cell: (r: any) => <span className="tabular-nums">{totalCost > 0 ? (r.value / totalCost * 100).toFixed(1) : '0'}%</span> },
            ]}
          />
        </>
      )}
    </div>
  )
}

// ─── Stock Report ────────────────────────────────────────────────
function StockReport() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report', 'stock'],
    queryFn: () => api.get<any>('/api/reports?type=stock'),
  })

  const rows = data?.rows || []
  const totalValue = data?.totalValue || 0

  function print() {
    const w = window.open('', '_blank', 'width=1000,height=900')
    if (!w) { toast.error('Pop-up blocked'); return }
    w.document.write(`
      <html><head><title>Stock Report</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#142032}
      h1{color:#0c389f;font-size:20px;border-bottom:2px solid #0c389f;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}
      th{background:#f3f4f6;padding:6px;text-align:left;text-transform:uppercase}
      td{padding:4px 6px;border-bottom:1px solid #e5e7eb}
      .total{margin-top:12px;text-align:right;font-weight:700}
      .meta{font-size:11px;color:#6b7280;margin-bottom:16px}</style></head><body>
      <h1>Detailed Stock Report</h1>
      <div class="meta">Generated: ${new Date().toLocaleString('en-GB')} · Whirlpool Bangladesh WMS</div>
      <table><thead><tr><th>SKU</th><th>Name</th><th>Category</th><th style="text-align:right">On Hand</th><th style="text-align:right">Reserved</th><th style="text-align:right">Damaged</th><th style="text-align:right">Available</th><th style="text-align:right">Cost</th><th style="text-align:right">Value</th></tr></thead>
      <tbody>${rows.map((r:any) => `<tr><td>${r.sku}</td><td>${r.name}</td><td>${r.category || '—'}</td><td style="text-align:right">${r.onHand}</td><td style="text-align:right">${r.reserved}</td><td style="text-align:right">${r.damaged}</td><td style="text-align:right">${r.available}</td><td style="text-align:right">${bdt(r.unitCost)}</td><td style="text-align:right">${bdt(r.value)}</td></tr>`).join('')}</tbody></table>
      <div class="total">Total Stock Value: ${bdt(totalValue)}</div>
      </body></html>
    `)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">Detailed Stock Report</h2>
          <p className="text-sm text-muted-foreground">Total value: <span className="font-semibold text-foreground">{bdt(totalValue)}</span></p>
        </div>
        <button onClick={print} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : isError ? (
        <EmptyState icon={BarChart3} title="Failed to load" action={<button onClick={() => refetch()}>Retry</button>} />
      ) : (
        <DataTable
          data={rows}
          rowKey={(r: any) => r.sku}
          columns={[
            { key: 'sku', header: 'SKU', cell: (r: any) => <span className="font-mono text-xs">{r.sku}</span>, sort: (a: any, b: any) => a.sku.localeCompare(b.sku) },
            { key: 'name', header: 'Product', cell: (r: any) => <span className="font-medium">{r.name}</span> },
            { key: 'category', header: 'Category', cell: (r: any) => <span className="text-xs text-muted-foreground">{r.category || '—'}</span> },
            { key: 'onHand', header: 'On Hand', align: 'right', cell: (r: any) => <span className="tabular-nums font-medium">{num(r.onHand)}</span>, sort: (a: any, b: any) => a.onHand - b.onHand },
            { key: 'reserved', header: 'Reserved', align: 'right', cell: (r: any) => <span className="tabular-nums text-amber-600">{num(r.reserved)}</span> },
            { key: 'damaged', header: 'Damaged', align: 'right', cell: (r: any) => <span className="tabular-nums text-rose-600">{num(r.damaged)}</span> },
            { key: 'available', header: 'Available', align: 'right', cell: (r: any) => <span className="tabular-nums text-emerald-600 font-medium">{num(r.available)}</span> },
            { key: 'value', header: 'Value', align: 'right', cell: (r: any) => <span className="tabular-nums">{bdt(r.value)}</span>, sort: (a: any, b: any) => a.value - b.value },
          ]}
        />
      )}
    </div>
  )
}

// ─── Movement Report ─────────────────────────────────────────────
function MovementReport() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report', 'movements'],
    queryFn: () => api.get<any>('/api/reports?type=movements'),
  })

  const rows = data?.rows || []
  const totalIn = rows.filter((r: any) => r.type === 'IN').reduce((s: number, r: any) => s + r.quantity, 0)
  const totalOut = rows.filter((r: any) => r.type === 'OUT').reduce((s: number, r: any) => s + Math.abs(r.quantity), 0)

  function print() {
    const w = window.open('', '_blank', 'width=1000,height=900')
    if (!w) { toast.error('Pop-up blocked'); return }
    w.document.write(`
      <html><head><title>Movement Ledger</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#142032}
      h1{color:#0c389f;font-size:20px;border-bottom:2px solid #0c389f;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:16px}
      th{background:#f3f4f6;padding:6px;text-align:left;text-transform:uppercase}
      td{padding:4px 6px;border-bottom:1px solid #e5e7eb}
      .meta{font-size:11px;color:#6b7280;margin-bottom:16px}</style></head><body>
      <h1>Movement Ledger</h1>
      <div class="meta">Generated: ${new Date().toLocaleString('en-GB')} · Whirlpool Bangladesh WMS</div>
      <table><thead><tr><th>When</th><th>Type</th><th>Product</th><th>Reference</th><th>Notes</th><th style="text-align:right">Qty</th></tr></thead>
      <tbody>${rows.map((r:any) => `<tr><td>${dateTime(r.date)}</td><td>${r.type}</td><td>${r.name} (${r.sku})</td><td>${r.reference || '—'}</td><td>${r.notes || '—'}</td><td style="text-align:right">${r.quantity > 0 ? '+' : ''}${r.quantity}</td></tr>`).join('')}</tbody></table>
      </body></html>
    `)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-3 stagger">
        <StatCard label="Total Inbound" value={num(totalIn)} icon={Boxes} tone="success" />
        <StatCard label="Total Outbound" value={num(totalOut)} icon={TrendingUp} tone="destructive" />
        <StatCard label="Total Entries" value={num(rows.length)} icon={History} tone="info" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Movement Ledger</h2>
        <button onClick={print} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : isError ? (
        <EmptyState icon={History} title="Failed to load" action={<button onClick={() => refetch()}>Retry</button>} />
      ) : (
        <DataTable
          data={rows}
          rowKey={(_: any, i: number) => i}
          columns={[
            { key: 'date', header: 'When', cell: (r: any) => <span className="text-xs text-muted-foreground whitespace-nowrap">{dateTime(r.date)}</span>, sort: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(), defaultDir: 'desc' },
            { key: 'type', header: 'Type', cell: (r: any) => <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${r.type === 'IN' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : r.type === 'OUT' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>{r.type}</span> },
            { key: 'product', header: 'Product', cell: (r: any) => <><div className="font-medium text-sm">{r.name}</div><div className="text-xs text-muted-foreground font-mono">{r.sku}</div></> },
            { key: 'reference', header: 'Reference', cell: (r: any) => <span className="font-mono text-xs">{r.reference || '—'}</span> },
            { key: 'notes', header: 'Notes', cell: (r: any) => <span className="text-xs text-muted-foreground max-w-xs truncate block">{r.notes || '—'}</span> },
            { key: 'quantity', header: 'Qty', align: 'right', cell: (r: any) => <span className={`tabular-nums font-semibold ${r.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{r.quantity > 0 ? '+' : ''}{r.quantity}</span>, sort: (a: any, b: any) => a.quantity - b.quantity },
          ]}
        />
      )}
    </div>
  )
}

// ─── Sales Summary ───────────────────────────────────────────────
function SalesReport() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report', 'sales'],
    queryFn: () => api.get<any>('/api/reports?type=sales'),
  })

  const rows = data?.rows || []
  const totalSales = data?.totalSales || 0
  const totalUnits = data?.totalUnits || 0
  const totalDelivered = data?.totalDelivered || 0

  function print() {
    const w = window.open('', '_blank', 'width=1000,height=900')
    if (!w) { toast.error('Pop-up blocked'); return }
    w.document.write(`
      <html><head><title>Sales Summary</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#142032}
      h1{color:#0c389f;font-size:20px;border-bottom:2px solid #0c389f;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
      th{background:#f3f4f6;padding:6px;text-align:left;text-transform:uppercase}
      td{padding:4px 6px;border-bottom:1px solid #e5e7eb}
      .meta{font-size:11px;color:#6b7280;margin-bottom:16px}</style></head><body>
      <h1>Sales Summary</h1>
      <div class="meta">Generated: ${new Date().toLocaleString('en-GB')} · Whirlpool Bangladesh WMS</div>
      <table><thead><tr><th>SO Number</th><th>Invoice</th><th>Dealer</th><th>City</th><th>Status</th><th style="text-align:right">Units</th><th style="text-align:right">Delivered</th><th style="text-align:right">Trips</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows.map((r:any) => `<tr><td>${r.soNumber}</td><td>${r.invoiceNo || '—'}</td><td>${r.dealer}</td><td>${r.city}</td><td>${r.status}</td><td style="text-align:right">${r.totalQty}</td><td style="text-align:right">${r.deliveredQty}</td><td style="text-align:right">${r.dispatchCount}</td><td style="text-align:right">${bdt(r.totalAmount)}</td></tr>`).join('')}</tbody></table>
      </body></html>
    `)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-3 stagger">
        <StatCard label="Total Sales Value" value={bdt(totalSales)} icon={TrendingUp} tone="success" />
        <StatCard label="Total Units Ordered" value={num(totalUnits)} icon={Boxes} tone="info" />
        <StatCard label="Total Units Delivered" value={num(totalDelivered)} icon={TrendingUp} tone="success" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Sales Summary</h2>
        <button onClick={print} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : isError ? (
        <EmptyState icon={TrendingUp} title="Failed to load" action={<button onClick={() => refetch()}>Retry</button>} />
      ) : (
        <DataTable
          data={rows}
          rowKey={(r: any) => r.soNumber}
          columns={[
            { key: 'soNumber', header: 'SO Number', cell: (r: any) => <span className="font-mono text-xs">{r.soNumber}</span>, sort: (a: any, b: any) => a.soNumber.localeCompare(b.soNumber) },
            { key: 'invoiceNo', header: 'Invoice', cell: (r: any) => <span className="font-mono text-xs">{r.invoiceNo || '—'}</span> },
            { key: 'dealer', header: 'Dealer', cell: (r: any) => <span className="font-medium">{r.dealer}</span> },
            { key: 'city', header: 'City', cell: (r: any) => <span className="text-sm">{r.city}</span> },
            { key: 'status', header: 'Status', cell: (r: any) => <StatusBadge status={r.status} size="sm" /> },
            { key: 'totalQty', header: 'Units', align: 'right', cell: (r: any) => <span className="tabular-nums">{num(r.totalQty)}</span> },
            { key: 'deliveredQty', header: 'Delivered', align: 'right', cell: (r: any) => <span className="tabular-nums text-emerald-600">{num(r.deliveredQty)}</span> },
            { key: 'dispatchCount', header: 'Trips', align: 'center', cell: (r: any) => <span className="tabular-nums">{r.dispatchCount}</span> },
            { key: 'totalAmount', header: 'Amount', align: 'right', cell: (r: any) => <span className="tabular-nums font-medium">{bdt(r.totalAmount)}</span>, sort: (a: any, b: any) => a.totalAmount - b.totalAmount },
          ]}
        />
      )}
    </div>
  )
}

// ─── Purchase Summary ────────────────────────────────────────────
function PurchaseReport() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report', 'purchases'],
    queryFn: () => api.get<any>('/api/reports?type=purchases'),
  })

  const rows = data?.rows || []
  const totalPurchases = data?.totalPurchases || 0
  const totalUnits = data?.totalUnits || 0
  const totalReceived = data?.totalReceived || 0

  function print() {
    const w = window.open('', '_blank', 'width=1000,height=900')
    if (!w) { toast.error('Pop-up blocked'); return }
    w.document.write(`
      <html><head><title>Purchase Summary</title>
      <style>body{font-family:Arial,sans-serif;margin:32px;color:#142032}
      h1{color:#0c389f;font-size:20px;border-bottom:2px solid #0c389f;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
      th{background:#f3f4f6;padding:6px;text-align:left;text-transform:uppercase}
      td{padding:4px 6px;border-bottom:1px solid #e5e7eb}
      .meta{font-size:11px;color:#6b7280;margin-bottom:16px}</style></head><body>
      <h1>Purchase Summary</h1>
      <div class="meta">Generated: ${new Date().toLocaleString('en-GB')} · Whirlpool Bangladesh WMS</div>
      <table><thead><tr><th>PO Number</th><th>GRN</th><th>Supplier</th><th>Status</th><th style="text-align:right">Ordered</th><th style="text-align:right">Received</th><th style="text-align:right">Failed</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows.map((r:any) => `<tr><td>${r.poNumber}</td><td>${r.grnNumber || '—'}</td><td>${r.supplier}</td><td>${r.status}</td><td style="text-align:right">${r.totalQty}</td><td style="text-align:right">${r.receivedQty}</td><td style="text-align:right">${r.failedQty}</td><td style="text-align:right">${bdt(r.totalAmount)}</td></tr>`).join('')}</tbody></table>
      </body></html>
    `)
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-3 stagger">
        <StatCard label="Total Purchase Value" value={bdt(totalPurchases)} icon={ShoppingCart} tone="info" />
        <StatCard label="Total Units Ordered" value={num(totalUnits)} icon={Boxes} />
        <StatCard label="Total Units Received" value={num(totalReceived)} icon={ShoppingCart} tone="success" />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-medium">Purchase Summary</h2>
        <button onClick={print} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent transition-colors">
          <Printer className="h-4 w-4" /> Print
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">Loading…</div>
      ) : isError ? (
        <EmptyState icon={ShoppingCart} title="Failed to load" action={<button onClick={() => refetch()}>Retry</button>} />
      ) : (
        <DataTable
          data={rows}
          rowKey={(r: any) => r.poNumber}
          columns={[
            { key: 'poNumber', header: 'PO Number', cell: (r: any) => <span className="font-mono text-xs">{r.poNumber}</span>, sort: (a: any, b: any) => a.poNumber.localeCompare(b.poNumber) },
            { key: 'grnNumber', header: 'GRN', cell: (r: any) => <span className="font-mono text-xs">{r.grnNumber || '—'}</span> },
            { key: 'supplier', header: 'Supplier', cell: (r: any) => <span className="font-medium">{r.supplier}</span> },
            { key: 'status', header: 'Status', cell: (r: any) => <StatusBadge status={r.status} size="sm" /> },
            { key: 'totalQty', header: 'Ordered', align: 'right', cell: (r: any) => <span className="tabular-nums">{num(r.totalQty)}</span> },
            { key: 'receivedQty', header: 'Received', align: 'right', cell: (r: any) => <span className="tabular-nums text-emerald-600">{num(r.receivedQty)}</span> },
            { key: 'failedQty', header: 'QC Failed', align: 'right', cell: (r: any) => <span className="tabular-nums text-rose-600">{num(r.failedQty)}</span> },
            { key: 'totalAmount', header: 'Amount', align: 'right', cell: (r: any) => <span className="tabular-nums font-medium">{bdt(r.totalAmount)}</span>, sort: (a: any, b: any) => a.totalAmount - b.totalAmount },
          ]}
        />
      )}
    </div>
  )
}
