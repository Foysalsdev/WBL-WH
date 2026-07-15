'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Truck, Plus, Search, RefreshCw, Trash2, Eye, CheckCircle2, X, Package,
} from 'lucide-react'
import { PageHeader, EmptyState, StatCard, BadgeFor } from '@/components/erp/primitives'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { fmtBDT, fmtNum, fmtDate } from '@/lib/format'

export function OutboundPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<any | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/sales-orders').then((r) => r.json()).then((d) => { setRows(d); setLoading(false) })
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const totals = useMemo(() => ({
    count: rows.length,
    open: rows.filter((r) => !['delivered', 'cancelled'].includes(r.status)).length,
    delivered: rows.filter((r) => r.status === 'delivered').length,
    value: rows.reduce((s, r) => s + r.totalAmount, 0),
  }), [rows])

  async function setStatus(so: any, status: string) {
    const r = await fetch('/api/sales-orders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: so.id, status }),
    })
    if (r.ok) {
      toast.success(`${so.soNumber} → ${status}`, { description: status === 'shipped' ? 'Stock has been deducted from inventory.' : undefined })
      load()
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Outbound · Sales Orders"
        description="Manage customer orders and dispatch shipments."
        icon={<Truck className="h-5 w-5" />}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New SO</Button>}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total SOs" value={fmtNum(totals.count)} icon={<Truck className="h-4 w-4" />} />
        <StatCard label="Open SOs" value={fmtNum(totals.open)} tone="info" />
        <StatCard label="Delivered" value={fmtNum(totals.delivered)} tone="success" />
        <StatCard label="Total Sales Value" value={fmtBDT(totals.value)} tone="success" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">All sales orders</h2>
            <Button variant="outline" size="icon" onClick={load} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState icon={<Truck className="h-6 w-6" />} title="No sales orders yet" action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New SO</Button>} />
          ) : (
            <div className="rounded-lg border overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Delivery</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((so) => (
                    <TableRow key={so.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{so.soNumber}</TableCell>
                      <TableCell className="font-medium">{so.customer?.name}</TableCell>
                      <TableCell className="text-sm">{fmtDate(so.orderDate)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(so.deliveryDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{so.items?.length || 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBDT(so.totalAmount)}</TableCell>
                      <TableCell><BadgeFor status={so.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setView(so)} title="View"><Eye className="h-4 w-4" /></Button>
                          {so.status === 'draft' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setStatus(so, 'confirmed')}>Confirm</Button>
                              <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setStatus(so, 'cancelled')}><X className="h-4 w-4" /></Button>
                            </>
                          )}
                          {so.status === 'confirmed' && (
                            <Button size="sm" onClick={() => setStatus(so, 'shipped')}><Package className="h-4 w-4 mr-1" />Ship</Button>
                          )}
                          {so.status === 'shipped' && (
                            <Button size="sm" onClick={() => setStatus(so, 'delivered')}><CheckCircle2 className="h-4 w-4 mr-1" />Deliver</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <SODialog open={open} onOpenChange={setOpen} onDone={() => { setOpen(false); load() }} />
      <SOViewDialog so={view} onClose={() => setView(null)} />
    </div>
  )
}

function SODialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [customerId, setCustomerId] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<{ productId: string; quantity: string; unitPrice: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      fetch('/api/customers').then((r) => r.json()).then(setCustomers)
      fetch('/api/products').then((r) => r.json()).then(setProducts)
      setCustomerId(''); setDeliveryDate(''); setNotes(''); setLines([{ productId: '', quantity: '1', unitPrice: '0' }])
    }
  }, [open])

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)

  function setLine(i: number, k: 'productId' | 'quantity' | 'unitPrice', v: string) {
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  }
  // when product picked, auto-fill unit price from sale price
  function pickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId)
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, productId, unitPrice: p ? String(p.salePrice) : l.unitPrice } : l))
  }
  function addLine() { setLines((a) => [...a, { productId: '', quantity: '1', unitPrice: '0' }]) }
  function removeLine(i: number) { setLines((a) => a.filter((_, idx) => idx !== i)) }

  async function submit() {
    if (!customerId) { toast.error('Select a customer'); return }
    if (lines.length === 0 || lines.some((l) => !l.productId)) { toast.error('Add at least one line item with a product'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/sales-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId, deliveryDate: deliveryDate || null, notes,
          items: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
        }),
      })
      if (r.ok) { const j = await r.json(); toast.success('SO created', { description: j.soNumber }); onDone() }
      else { const j = await r.json(); toast.error('Failed', { description: j.error }) }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Sales Order</DialogTitle>
          <DialogDescription>Create a customer order with line items. Number is auto-generated on save.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Delivery date</Label>
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Line items</Label>
            <Button size="sm" variant="outline" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" />Add line</Button>
          </div>
          <div className="rounded-lg border divide-y">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-2 items-center">
                <div className="col-span-5">
                  <Select value={l.productId} onValueChange={(v) => pickProduct(i, v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select product" /></SelectTrigger>
                    <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.sku} · {p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Input className="col-span-2 h-9 text-right" type="number" min="1" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
                <Input className="col-span-3 h-9 text-right" type="number" min="0" placeholder="Unit price" value={l.unitPrice} onChange={(e) => setLine(i, 'unitPrice', e.target.value)} />
                <div className="col-span-1 text-right text-sm tabular-nums">{fmtBDT((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}</div>
                <Button className="col-span-1 h-9" variant="ghost" size="icon" onClick={() => removeLine(i)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <div className="rounded-lg bg-muted/40 px-4 py-2 text-right">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-semibold tabular-nums">{fmtBDT(total)}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create SO'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SOViewDialog({ so, onClose }: { so: any | null; onClose: () => void }) {
  if (!so) return null
  return (
    <Dialog open={!!so} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono">{so.soNumber}</DialogTitle>
          <DialogDescription>{so.customer?.name} · ordered {fmtDate(so.orderDate)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-3 text-sm">
            <div><span className="text-muted-foreground">Status:</span> <BadgeFor status={so.status} /></div>
            <div><span className="text-muted-foreground">Delivery:</span> {fmtDate(so.deliveryDate)}</div>
          </div>
          {so.notes && <p className="text-sm bg-muted/40 rounded-lg p-3 border">{so.notes}</p>}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {so.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell><div className="font-medium">{it.product?.name}</div><div className="text-xs text-muted-foreground font-mono">{it.product?.sku}</div></TableCell>
                    <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtBDT(it.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmtBDT(it.quantity * it.unitPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-end">
            <div className="rounded-lg bg-muted/40 px-4 py-2 text-right">
              <p className="text-xs text-muted-foreground">Grand total</p>
              <p className="text-lg font-semibold tabular-nums">{fmtBDT(so.totalAmount)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
