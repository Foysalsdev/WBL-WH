'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  PackageOpen, Plus, Search, RefreshCw, Trash2, Eye, CheckCircle2, X,
} from 'lucide-react'
import { PageHeader, EmptyState, StatCard, BadgeFor } from '@/components/erp/primitives'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { fmtBDT, fmtNum, fmtDate } from '@/lib/format'

export function InboundPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<any | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/purchase-orders').then((r) => r.json()).then((d) => { setRows(d); setLoading(false) })
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const totals = useMemo(() => ({
    count: rows.length,
    open: rows.filter((r) => r.status === 'ordered' || r.status === 'draft').length,
    received: rows.filter((r) => r.status === 'received').length,
    value: rows.reduce((s, r) => s + r.totalAmount, 0),
  }), [rows])

  async function setStatus(po: any, status: string) {
    const r = await fetch('/api/purchase-orders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: po.id, status }),
    })
    if (r.ok) {
      toast.success(`${po.poNumber} → ${status}`, { description: status === 'received' ? 'Stock has been posted to inventory.' : undefined })
      load()
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Inbound · Purchase Orders"
        description="Manage procurement from suppliers and post Goods Receipt Notes (GRN)."
        icon={<PackageOpen className="h-5 w-5" />}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New PO</Button>}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total POs" value={fmtNum(totals.count)} icon={<PackageOpen className="h-4 w-4" />} />
        <StatCard label="Open POs" value={fmtNum(totals.open)} tone="info" />
        <StatCard label="Received POs" value={fmtNum(totals.received)} tone="success" />
        <StatCard label="Total PO Value" value={fmtBDT(totals.value)} tone="success" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">All purchase orders</h2>
            <Button variant="outline" size="icon" onClick={load} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : rows.length === 0 ? (
            <EmptyState icon={<PackageOpen className="h-6 w-6" />} title="No purchase orders yet" action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New PO</Button>} />
          ) : (
            <div className="rounded-lg border overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((po) => (
                    <TableRow key={po.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{po.poNumber}</TableCell>
                      <TableCell className="font-medium">{po.supplier?.name}</TableCell>
                      <TableCell className="text-sm">{fmtDate(po.orderDate)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(po.expectedDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{po.items?.length || 0}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBDT(po.totalAmount)}</TableCell>
                      <TableCell><BadgeFor status={po.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setView(po)} title="View"><Eye className="h-4 w-4" /></Button>
                          {po.status === 'draft' && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(po, 'ordered')}>Order</Button>
                          )}
                          {po.status === 'ordered' && (
                            <Button size="sm" onClick={() => setStatus(po, 'received')}><CheckCircle2 className="h-4 w-4 mr-1" />Receive</Button>
                          )}
                          {po.status === 'draft' && (
                            <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setStatus(po, 'cancelled')}><X className="h-4 w-4" /></Button>
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

      <PODialog open={open} onOpenChange={setOpen} onDone={() => { setOpen(false); load() }} />
      <POViewDialog po={view} onClose={() => setView(null)} />
    </div>
  )
}

function PODialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [expectedDate, setExpectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<{ productId: string; quantity: string; unitPrice: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      fetch('/api/suppliers').then((r) => r.json()).then(setSuppliers)
      fetch('/api/products').then((r) => r.json()).then(setProducts)
      setSupplierId(''); setExpectedDate(''); setNotes(''); setLines([{ productId: '', quantity: '1', unitPrice: '0' }])
    }
  }, [open])

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)

  function setLine(i: number, k: 'productId' | 'quantity' | 'unitPrice', v: string) {
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  }
  function addLine() { setLines((a) => [...a, { productId: '', quantity: '1', unitPrice: '0' }]) }
  function removeLine(i: number) { setLines((a) => a.filter((_, idx) => idx !== i)) }

  async function submit() {
    if (!supplierId) { toast.error('Select a supplier'); return }
    if (lines.length === 0 || lines.some((l) => !l.productId)) { toast.error('Add at least one line item with a product'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/purchase-orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId, expectedDate: expectedDate || null, notes,
          items: lines.map((l) => ({ productId: l.productId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice) })),
        }),
      })
      if (r.ok) { const j = await r.json(); toast.success('PO created', { description: j.poNumber }); onDone() }
      else { const j = await r.json(); toast.error('Failed', { description: j.error }) }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Purchase Order</DialogTitle>
          <DialogDescription>Create a PO with line items. Number is auto-generated on save.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Expected date</Label>
            <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
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
                  <Select value={l.productId} onValueChange={(v) => setLine(i, 'productId', v)}>
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
          <Button onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create PO'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function POViewDialog({ po, onClose }: { po: any | null; onClose: () => void }) {
  if (!po) return null
  return (
    <Dialog open={!!po} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-mono">{po.poNumber}</DialogTitle>
          <DialogDescription>{po.supplier?.name} · ordered {fmtDate(po.orderDate)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-3 text-sm">
            <div><span className="text-muted-foreground">Status:</span> <BadgeFor status={po.status} /></div>
            <div><span className="text-muted-foreground">Expected:</span> {fmtDate(po.expectedDate)}</div>
            <div><span className="text-muted-foreground">Received:</span> {fmtDate(po.receivedDate)}</div>
          </div>
          {po.notes && <p className="text-sm bg-muted/40 rounded-lg p-3 border">{po.notes}</p>}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {po.items?.map((it: any) => (
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
              <p className="text-lg font-semibold tabular-nums">{fmtBDT(po.totalAmount)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
