'use client'

import {
  Wallet, AlertTriangle, ShoppingCart, TrendingUp, Boxes, Users, Building2,
  Package, ArrowDownLeft, ArrowUpRight, Activity, ShieldCheck, Ban, Clock,
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { PageHeader, StatCard, MovementPill, StatusBadge, EmptyState } from '@/components/system'
import { PageHeaderSkeleton, StatCardGridSkeleton, ChartSkeleton } from '@/components/system/skeletons'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDashboard } from './useDashboard'
import { useUI } from '@/lib/store/ui'
import { bdt, num, timeAgo, dateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function DashboardPage() {
  const { data, isLoading, isError, refetch } = useDashboard()
  const setActiveModule = useUI((s) => s.setActiveModule)

  if (isLoading) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <PageHeaderSkeleton />
        <StatCardGridSkeleton count={4} />
        <div className="grid gap-4 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertTriangle}
          title="Couldn't load dashboard"
          description="There was a problem fetching live data. Try again."
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      </div>
    )
  }

  const { kpi, charts, recent, lowStock } = data

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Whirlpool Bangladesh · Warehouse Dashboard"
        description="Live snapshot of inbound, outbound, stock and dispatch operations."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <Activity className="h-4 w-4 mr-1.5" />Refresh
          </Button>
        }
      />

      {/* Brand banner */}
      <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
        <div className="flex items-center justify-between gap-4 p-4 md:p-6">
          <div className="flex-1 min-w-0">
            <img src="/whirlpool-logo.svg" alt="Whirlpool" className="h-7 md:h-9 mb-2 dark:hidden" style={{ objectFit: 'contain' }} />
            <img src="/whirlpool-logo-white.svg" alt="Whirlpool" className="h-7 md:h-9 mb-2 hidden dark:block" style={{ objectFit: 'contain' }} />
            <p className="text-xs md:text-sm text-muted-foreground">Official Warehouse Management System for Whirlpool Bangladesh operations.</p>
          </div>
          <img
            src="/whirlpool-banner.png"
            alt="Whirlpool Bangladesh"
            className="h-16 md:h-24 w-auto rounded-lg shrink-0 hidden sm:block"
            style={{ objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Primary KPIs */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Stock Value" value={bdt(kpi.totalValue)} hint={`${num(kpi.totalUnits)} units on-hand`} icon={Wallet} tone="success" />
        <StatCard label="Total Sales" value={bdt(kpi.totalSales)} hint={`${kpi.openSOs} open SOs`} icon={TrendingUp} tone="info" />
        <StatCard label="Total Purchases" value={bdt(kpi.totalPurchase)} hint={`${kpi.openPOs} open POs`} icon={ShoppingCart} tone="info" />
        <StatCard label="Low-Stock SKUs" value={num(kpi.lowStockCount)} hint={`${kpi.damagedUnits} damaged units`} icon={AlertTriangle} tone={kpi.lowStockCount > 0 ? 'warning' : 'default'} />
      </section>

      {/* Secondary KPIs */}
      <section className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Products" value={num(kpi.products)} icon={Boxes} />
        <StatCard label="Dealers" value={num(kpi.customers)} icon={Users} />
        <StatCard label="Sourcing" value={num(kpi.suppliers)} icon={Package} />
        <StatCard label="Warehouses" value={num(kpi.warehouses)} icon={Building2} />
        <StatCard label="Reserved" value={num(kpi.reservedUnits)} icon={Ban} tone="warning" />
        <StatCard label="Damaged" value={num(kpi.damagedUnits)} icon={AlertTriangle} tone="destructive" />
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Stock Movements — Last 14 days</CardTitle>
            <CardDescription>Inbound vs outbound flow across all warehouses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250} className="w-full">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Value by Category</CardTitle>
            <CardDescription>Cost-basis distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250} className="w-full">
              <PieChart>
                <Pie data={charts.byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {charts.byCategory.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any) => bdt(v)}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      {/* Activity + Alerts */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Recent Stock Movements</CardTitle>
                <CardDescription>Latest activity across the warehouse</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveModule('inventory')} disabled>View all</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-72 pr-3">
              <ul className="space-y-2">
                {recent.movements.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors">
                    <div className={cn(
                      'grid place-items-center h-9 w-9 rounded-lg shrink-0',
                      m.type === 'IN' && 'bg-emerald-500/10 text-emerald-600',
                      m.type === 'OUT' && 'bg-rose-500/10 text-rose-600',
                      m.type === 'ADJUST' && 'bg-amber-500/10 text-amber-600',
                      m.type === 'TRANSFER' && 'bg-sky-500/10 text-sky-600',
                    )}>
                      {m.type === 'IN' ? <ArrowDownLeft className="h-4 w-4" /> :
                       m.type === 'OUT' ? <ArrowUpRight className="h-4 w-4" /> :
                       <Activity className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.product?.name || 'Product'}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.product?.sku} · {m.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-sm font-semibold tabular-nums',
                        m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600',
                      )}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{timeAgo(m.createdAt)}</p>
                    </div>
                    <MovementPill type={m.type} />
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
              <Button variant="ghost" size="sm" onClick={() => setActiveModule('inbound')} disabled>Reorder</Button>
            </div>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <EmptyState icon={ShieldCheck} title="All stock levels healthy" description="No SKUs below reorder level." />
            ) : (
              <ScrollArea className="h-72 pr-3">
                <ul className="space-y-2">
                  {lowStock.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50 transition-colors">
                      <div className="grid place-items-center h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 shrink-0">
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
      </section>

      {/* Audit trail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Recent Audit Activity</CardTitle>
          <CardDescription>System action trail — last 8 events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2">
            {recent.audit.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-lg border p-2.5">
                <Badge variant="outline" className="font-mono text-[10px] uppercase shrink-0">{a.action}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{a.details}</p>
                  <p className="text-xs text-muted-foreground">{a.userName} · {dateTime(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
