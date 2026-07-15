'use client'
import { useEffect, useState, useMemo } from 'react'
import { BarChart3, RefreshCw, FileText, History, ClipboardList } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts'
import { PageHeader, StatCard, MovementTypePill } from '@/components/erp/primitives'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { fmtBDT, fmtNum, fmtDateTime } from '@/lib/format'

const BAR_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

export function ReportsPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Reports & Analytics"
        description="Stock valuation, movement ledger and audit trail."
        icon={<BarChart3 className="h-5 w-5" />}
      />
      <Tabs defaultValue="valuation">
        <TabsList>
          <TabsTrigger value="valuation"><FileText className="h-4 w-4 mr-1.5" />Valuation</TabsTrigger>
          <TabsTrigger value="stock"><BarChart3 className="h-4 w-4 mr-1.5" />Stock Report</TabsTrigger>
          <TabsTrigger value="movements"><History className="h-4 w-4 mr-1.5" />Movement Ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="valuation" className="mt-4"><ValuationReport /></TabsContent>
        <TabsContent value="stock" className="mt-4"><StockReport /></TabsContent>
        <TabsContent value="movements" className="mt-4"><MovementReport /></TabsContent>
      </Tabs>
    </div>
  )
}

function ValuationReport() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/reports?type=valuation').then((r) => r.json()).then((d) => { setData(d); setLoading(false) })
  }, [])
  if (loading) return <Skeleton className="h-96 rounded-xl" />
  const total = data.rows.reduce((s: number, r: any) => s + r.value, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Stock Value" value={fmtBDT(total)} tone="success" />
        <StatCard label="Categories" value={fmtNum(data.rows.length)} />
        <StatCard label="Total Units" value={fmtNum(data.rows.reduce((s: number, r: any) => s + r.units, 0))} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Stock Value by Category</CardTitle><CardDescription>Cost-basis valuation across all warehouses</CardDescription></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.rows} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => fmtBDT(v)} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" name="Value" radius={[6, 6, 0, 0]}>
                {data.rows.map((_: any, i: number) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Value (cost)</TableHead>
                <TableHead className="text-right">% Share</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.rows.map((r: any) => (
                  <TableRow key={r.category}>
                    <TableCell className="font-medium">{r.category}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNum(r.units)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBDT(r.value)}</TableCell>
                    <TableCell className="text-right tabular-nums">{(r.value / total * 100).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtNum(data.rows.reduce((s: number, r: any) => s + r.units, 0))}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBDT(total)}</TableCell>
                  <TableCell className="text-right tabular-nums">100.0%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StockReport() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/reports?type=stock').then((r) => r.json()).then((d) => { setData(d); setLoading(false) })
  }, [])
  if (loading) return <Skeleton className="h-96 rounded-xl" />

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium">Detailed Stock Report</h2>
            <p className="text-sm text-muted-foreground">Total value: <span className="font-semibold text-foreground">{fmtBDT(data.totalValue)}</span></p>
          </div>
        </div>
        <div className="rounded-lg border overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>SKU</TableHead><TableHead>Name</TableHead><TableHead>Category</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Damaged</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((r: any) => (
                <TableRow key={r.sku} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.category || '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.onHand}</TableCell>
                  <TableCell className="text-right tabular-nums text-amber-600">{r.reserved}</TableCell>
                  <TableCell className="text-right tabular-nums text-rose-600">{r.damaged}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">{r.available}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtBDT(r.unitCost)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{fmtBDT(r.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function MovementReport() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/reports?type=movements').then((r) => r.json()).then((d) => { setData(d); setLoading(false) })
  }, [])
  if (loading) return <Skeleton className="h-96 rounded-xl" />

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-medium">Movement Ledger</h2>
            <p className="text-sm text-muted-foreground">{data.rows.length} entries (immutable)</p>
          </div>
        </div>
        <div className="rounded-lg border overflow-auto max-h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((m: any, i: number) => (
                <TableRow key={i} className="hover:bg-muted/40">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(m.date)}</TableCell>
                  <TableCell><MovementTypePill type={m.type} /></TableCell>
                  <TableCell><div className="font-medium text-sm">{m.name}</div><div className="text-xs text-muted-foreground font-mono">{m.sku}</div></TableCell>
                  <TableCell className="font-mono text-xs">{m.reference}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{m.notes}</TableCell>
                  <TableCell className={`text-right tabular-nums font-semibold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export function AuditPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetch('/api/audit-logs').then((r) => r.json()).then((d) => { setRows(d); setLoading(false) })
  }, [])
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Audit Log"
        description="Immutable activity trail — every system action is recorded here."
        icon={<ClipboardList className="h-5 w-5" />}
      />
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <ScrollArea className="h-[640px] pr-3">
              <ul className="space-y-2">
                {rows.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
                    <Badge variant="outline" className="font-mono text-[10px] uppercase mt-0.5">{a.action}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{a.details}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.userName} · {fmtDateTime(a.createdAt)} · <span className="font-mono">{a.entity}</span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
