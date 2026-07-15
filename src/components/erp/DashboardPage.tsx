'use client'
import { useEffect, useState } from 'react'
import {
  Boxes, Wallet, AlertTriangle, ShoppingCart, Package, Users, Building2,
  ArrowDownLeft, ArrowUpRight, Activity, TrendingUp, Ban,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  Area, AreaChart, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { PageHeader, StatCard, MovementTypePill } from '@/components/erp/primitives'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { fmtBDT, fmtNum, fmtDateTime, timeAgo } from '@/lib/format'
import { useApp } from '@/store/app'
import { Button } from '@/components/ui/button'

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function DashboardPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const setActive = useApp((s) => s.setActive)

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then((d) => {
      setData(d)
      setLoading(false)
    })
  }, [])

  if (loading || !data) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 rounded-xl lg:col-span-2" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  }

  const { kpi, charts, recent, lowStock } = data

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Whirlpool Bangladesh · Warehouse Dashboard"
        description="Live snapshot of inbound, outbound, stock and dispatch operations."
      />

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Stock Value" value={fmtBDT(kpi.totalValue)} hint={`${fmtNum(kpi.totalUnits)} units on-hand`} icon={<Wallet className="h-5 w-5" />} tone="success" />
        <StatCard label="Total Sales" value={fmtBDT(kpi.totalSales)} hint={`${kpi.openSOs} open SOs`} icon={<TrendingUp className="h-5 w-5" />} tone="info" />
        <StatCard label="Total Purchases" value={fmtBDT(kpi.totalPurchase)} hint={`${kpi.openPOs} open POs`} icon={<ShoppingCart className="h-5 w-5" />} tone="info" />
        <StatCard label="Low-Stock Items" value={fmtNum(kpi.lowStockCount)} hint={`${kpi.damagedUnits} damaged units`} icon={<AlertTriangle className="h-5 w-5" />} tone={kpi.lowStockCount > 0 ? 'warning' : 'default'} />
      </div>

      {/* Mini stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Products" value={fmtNum(kpi.products)} icon={<Boxes className="h-4 w-4" />} />
        <StatCard label="Customers" value={fmtNum(kpi.customers)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Suppliers" value={fmtNum(kpi.suppliers)} icon={<Package className="h-4 w-4" />} />
        <StatCard label="Warehouses" value={fmtNum(kpi.warehouses)} icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="Reserved Units" value={fmtNum(kpi.reservedUnits)} icon={<Ban className="h-4 w-4" />} tone="warning" />
        <StatCard label="Damaged Units" value={fmtNum(kpi.damagedUnits)} icon={<AlertTriangle className="h-4 w-4" />} tone="destructive" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* In/Out trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Stock Movements — Last 14 days</CardTitle>
            <CardDescription>Inbound vs outbound flow across all warehouses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={charts.trend} margin={{ left: -16, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="in" name="Inbound" stroke="var(--chart-1)" strokeWidth={2} fill="url(#gIn)" />
                <Area type="monotone" dataKey="out" name="Outbound" stroke="var(--chart-4)" strokeWidth={2} fill="url(#gOut)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Value by Category</CardTitle>
            <CardDescription>Cost-basis distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={charts.byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {charts.byCategory.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => fmtBDT(v)}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row — recent movements + low stock */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Recent Stock Movements</CardTitle>
                <CardDescription>Latest activity across the warehouse</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActive('inventory')}>View all</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 pr-3">
              <ul className="space-y-2">
                {recent.movements.map((m: any) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors">
                    <div className={`grid place-items-center h-9 w-9 rounded-lg ${m.type === 'IN' ? 'bg-emerald-500/10 text-emerald-600' : m.type === 'OUT' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'}`}>
                      {m.type === 'IN' ? <ArrowDownLeft className="h-4 w-4" /> : m.type === 'OUT' ? <ArrowUpRight className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.productName}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.productSku} · {m.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold tabular-nums ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{timeAgo(m.createdAt)}</p>
                    </div>
                    <MovementTypePill type={m.type} />
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" />Low-Stock Alerts</CardTitle>
                <CardDescription>Items at or below reorder level</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActive('inbound')}>Reorder</Button>
            </div>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">All stock levels are healthy.</div>
            ) : (
              <ScrollArea className="h-72 pr-3">
                <ul className="space-y-2">
                  {lowStock.map((p: any) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors">
                      <div className="grid place-items-center h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.sku} · reorder at {p.reorderLevel}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums text-amber-600">{p.onHand}</p>
                        <p className="text-[11px] text-muted-foreground">on hand</p>
                      </div>
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/5">Low</Badge>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Audit activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Recent Audit Activity</CardTitle>
          <CardDescription>System action trail — last 8 events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {recent.audit.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border p-2.5">
                <Badge variant="outline" className="font-mono text-[10px] uppercase">{a.action}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{a.details}</p>
                  <p className="text-xs text-muted-foreground">{a.userName} · {fmtDateTime(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
