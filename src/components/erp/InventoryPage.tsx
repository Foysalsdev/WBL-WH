'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Boxes, Search, AlertTriangle, ArrowDownLeft, ArrowUpRight, RefreshCw, History, Plus, Minus,
} from 'lucide-react'
import { PageHeader, EmptyState, MovementTypePill, StatCard } from '@/components/erp/primitives'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { fmtBDT, fmtNum, fmtDateTime } from '@/lib/format'

export function InventoryPage() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Inventory"
        description="Real-time stock levels, adjustments and movement history."
        icon={<Boxes className="h-5 w-5" />}
      />
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock"><Boxes className="h-4 w-4 mr-1.5" />Stock on Hand</TabsTrigger>
          <TabsTrigger value="movements"><History className="h-4 w-4 mr-1.5" />Movement Ledger</TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="mt-4"><StockTab /></TabsContent>
        <TabsContent value="movements" className="mt-4"><MovementsTab /></TabsContent>
      </Tabs>
    </div>
  )
}

function StockTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'low'>('all')
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/inventory').then((r) => r.json()).then((d) => {
      setRows(d)
      setLoading(false)
    })
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    let r = rows
    if (search) {
      const q = search.toLowerCase()
      r = r.filter((x) => x.sku.toLowerCase().includes(q) || x.name.toLowerCase().includes(q) || x.category?.toLowerCase().includes(q))
    }
    if (filter === 'low') r = r.filter((x) => x.isLow)
    return r
  }, [rows, search, filter])

  const totals = useMemo(() => ({
    units: rows.reduce((s, r) => s + r.quantity, 0),
    value: rows.reduce((s, r) => s + r.value, 0),
    low: rows.filter((r) => r.isLow).length,
    damaged: rows.reduce((s, r) => s + r.damaged, 0),
  }), [rows])

  function openAdjust(row: any) {
    setSelected(row)
    setAdjustOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Units" value={fmtNum(totals.units)} icon={<Boxes className="h-4 w-4" />} />
        <StatCard label="Stock Value (cost)" value={fmtBDT(totals.value)} icon={<RefreshCw className="h-4 w-4" />} tone="success" />
        <StatCard label="Low-Stock SKUs" value={fmtNum(totals.low)} icon={<AlertTriangle className="h-4 w-4" />} tone="warning" />
        <StatCard label="Damaged Units" value={fmtNum(totals.damaged)} icon={<AlertTriangle className="h-4 w-4" />} tone="destructive" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
            <div className="flex flex-1 gap-2 items-center max-w-md">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by SKU, name or category…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stock</SelectItem>
                  <SelectItem value="low">Low stock only</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={load} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Boxes className="h-6 w-6" />} title="No products match your filter" description="Try clearing the search or changing the filter." />
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[560px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reserved</TableHead>
                      <TableHead className="text-right">Available</TableHead>
                      <TableHead className="text-right">Damaged</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell><span className="text-xs text-muted-foreground">{r.category}</span></TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{fmtNum(r.quantity)}</TableCell>
                        <TableCell className="text-right tabular-nums text-amber-600">{fmtNum(r.reserved)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600 font-medium">{fmtNum(r.available)}</TableCell>
                        <TableCell className="text-right tabular-nums text-rose-600">{fmtNum(r.damaged)}</TableCell>
                        <TableCell className="text-right tabular-nums">{fmtBDT(r.value)}</TableCell>
                        <TableCell className="text-center">
                          {r.isLow
                            ? <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/5">Low</Badge>
                            : <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">OK</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openAdjust(r)}>Adjust</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AdjustDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        row={selected}
        onDone={() => { setAdjustOpen(false); load() }}
      />
    </div>
  )
}

function AdjustDialog({
  open, onOpenChange, row, onDone,
}: { open: boolean; onOpenChange: (o: boolean) => void; row: any | null; onDone: () => void }) {
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [qty, setQty] = useState('1')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setDirection('in'); setQty('1'); setReason('') }
  }, [open, row])

  if (!row) return null
  const delta = (direction === 'in' ? 1 : -1) * Math.abs(Number(qty) || 0)

  async function submit() {
    setSaving(true)
    try {
      const r = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: row.productId,
          type: 'ADJUST',
          quantity: delta,
          reference: `ADJ-${Date.now().toString().slice(-6)}`,
          notes: reason || `Manual adjustment (${direction})`,
        }),
      })
      if (r.ok) {
        toast.success('Stock adjusted', { description: `${row.sku}: ${delta > 0 ? '+' : ''}${delta} units` })
        onDone()
      } else {
        const j = await r.json()
        toast.error('Failed', { description: j.error })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {row.sku}</DialogTitle>
          <DialogDescription>{row.name} · currently {fmtNum(row.quantity)} on hand</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={direction === 'in' ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1"
              onClick={() => setDirection('in')}
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs">Add stock</span>
            </Button>
            <Button
              type="button"
              variant={direction === 'out' ? 'destructive' : 'outline'}
              className="h-16 flex flex-col gap-1"
              onClick={() => setDirection('out')}
            >
              <Minus className="h-5 w-5" />
              <span className="text-xs">Remove stock</span>
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input id="qty" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason / notes</Label>
            <Textarea id="reason" placeholder="e.g. Damaged write-off, stock-take correction…" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="rounded-lg border bg-muted/40 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Current</span><span className="font-medium tabular-nums">{fmtNum(row.quantity)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Change</span><span className={`font-medium tabular-nums ${delta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{delta > 0 ? '+' : ''}{delta}</span></div>
            <div className="flex justify-between border-t mt-2 pt-2"><span className="text-muted-foreground">New on-hand</span><span className="font-semibold tabular-nums">{fmtNum(Math.max(0, row.quantity + delta))}</span></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !qty}>{saving ? 'Posting…' : 'Post adjustment'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MovementsTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/movements?limit=100').then((r) => r.json()).then((d) => {
      setRows(d)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter((r) =>
      r.product?.sku?.toLowerCase().includes(q) ||
      r.product?.name?.toLowerCase().includes(q) ||
      r.reference?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q)
    )
  }, [rows, search])

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by SKU, reference or notes…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Badge variant="outline" className="font-mono">{filtered.length} entries</Badge>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="rounded-lg border overflow-hidden max-h-[600px] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/40">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDateTime(m.createdAt)}</TableCell>
                    <TableCell><MovementTypePill type={m.type} /></TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{m.product?.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{m.product?.sku}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.reference || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{m.notes || '—'}</TableCell>
                    <TableCell className={`text-right tabular-nums font-semibold ${m.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
