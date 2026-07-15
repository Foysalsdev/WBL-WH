'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  PackageOpen, Plus, RefreshCw, Eye, X, CheckCircle2, ClipboardCheck,
  Package, FileText, Truck as TruckIcon, History,
} from 'lucide-react'
import { PageHeader, EmptyState, StatCard, BadgeFor } from '@/components/erp/primitives'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { fmtBDT, fmtNum, fmtDate, fmtDateTime } from '@/lib/format'

export function InboundPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<any | null>(null)
  const [grnTarget, setGrnTarget] = useState<any | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/purchase-orders').then((r) => r.json()).then((d) => { setRows(d); setLoading(false) })
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    total: rows.length,
    open: rows.filter((r) => ['draft', 'ordered', 'partial'].includes(r.status)).length,
    received: rows.filter((r) => r.status === 'received').length,
    damaged: rows.reduce((s, r) => s + (r.items || []).reduce((a: number, b: any) => a + (b.failedQty || 0), 0), 0),
  }), [rows])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Inbound · Goods Receipt"
        description="Receive Whirlpool appliance consignments from sourcing partners with quality-check & putaway."
        icon={<PackageOpen className="h-5 w-5" />}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New PO</Button>}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total POs" value={fmtNum(stats.total)} icon={<PackageOpen className="h-4 w-4" />} />
        <StatCard label="Open POs" value={fmtNum(stats.open)} tone="info" icon={<ClipboardCheck className="h-4 w-4" />} />
        <StatCard label="Fully Received" value={fmtNum(stats.received)} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="QC Failed Units" value={fmtNum(stats.damaged)} tone="destructive" icon={<X className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="po">
        <TabsList>
          <TabsTrigger value="po"><PackageOpen className="h-4 w-4 mr-1.5" />Purchase Orders</TabsTrigger>
          <TabsTrigger value="grn"><ClipboardCheck className="h-4 w-4 mr-1.5" />Goods Receipt (GRN)</TabsTrigger>
          <TabsTrigger value="history"><History className="h-4 w-4 mr-1.5" />Receipt History</TabsTrigger>
        </TabsList>

        <TabsContent value="po" className="mt-4">
          <POListTab rows={rows} loading={loading} onRefresh={load} onView={setView} onGrn={setGrnTarget} />
        </TabsContent>
        <TabsContent value="grn" className="mt-4">
          <GrnQueueTab rows={rows} loading={loading} onRefresh={load} onGrn={setGrnTarget} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <ReceiptHistoryTab rows={rows} loading={loading} onView={setView} />
        </TabsContent>
      </Tabs>

      <PODialog open={open} onOpenChange={setOpen} onDone={() => { setOpen(false); load() }} />
      <POViewDialog po={view} onClose={() => setView(null)} />
      <GrnDialog po={grnTarget} onClose={() => setGrnTarget(null)} onDone={() => { setGrnTarget(null); load() }} />
    </div>
  )
}

// ───────────────────────────────────────────────
//  PO list (all POs)
// ───────────────────────────────────────────────
function POListTab({
  rows, loading, onRefresh, onView, onGrn,
}: { rows: any[]; loading: boolean; onRefresh: () => void; onView: (po: any) => void; onGrn: (po: any) => void }) {
  async function setStatus(po: any, status: string) {
    const r = await fetch('/api/purchase-orders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: po.id, action: 'status', status }),
    })
    if (r.ok) { toast.success(`${po.poNumber} → ${status}`); onRefresh() }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">All purchase orders</h2>
          <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<PackageOpen className="h-6 w-6" />} title="No purchase orders yet" />
        ) : (
          <div className="rounded-lg border overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Sourcing Partner</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((po) => {
                  const totalOrdered = (po.items || []).reduce((s: number, it: any) => s + it.quantity, 0)
                  const totalReceived = (po.items || []).reduce((s: number, it: any) => s + (it.receivedQty || 0), 0)
                  const canGrn = po.status === 'ordered' || po.status === 'partial'
                  return (
                    <TableRow key={po.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{po.poNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium">{po.supplier?.name}</div>
                        <div className="text-xs text-muted-foreground">{po.supplier?.code}</div>
                      </TableCell>
                      <TableCell className="text-sm">{fmtDate(po.orderDate)}</TableCell>
                      <TableCell className="text-sm">{fmtDate(po.expectedDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {totalReceived}/{totalOrdered}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBDT(po.totalAmount)}</TableCell>
                      <TableCell><BadgeFor status={po.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => onView(po)} title="View"><Eye className="h-4 w-4" /></Button>
                          {po.status === 'draft' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setStatus(po, 'ordered')}>Order</Button>
                              <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setStatus(po, 'cancelled')}><X className="h-4 w-4" /></Button>
                            </>
                          )}
                          {canGrn && (
                            <Button size="sm" onClick={() => onGrn(po)}><ClipboardCheck className="h-4 w-4 mr-1" />Receive</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ───────────────────────────────────────────────
//  GRN queue — POs awaiting receipt
// ───────────────────────────────────────────────
function GrnQueueTab({
  rows, loading, onRefresh, onGrn,
}: { rows: any[]; loading: boolean; onRefresh: () => void; onGrn: (po: any) => void }) {
  const queue = rows.filter((r) => r.status === 'ordered' || r.status === 'partial')

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" />GRN Queue</CardTitle>
            <CardDescription>POs awaiting goods receipt — process them with quality check &amp; putaway</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : queue.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No pending receipts" description="All purchase orders are fully received." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {queue.map((po) => {
              const totalOrdered = (po.items || []).reduce((s: number, it: any) => s + it.quantity, 0)
              const totalReceived = (po.items || []).reduce((s: number, it: any) => s + (it.receivedQty || 0), 0)
              const remaining = totalOrdered - totalReceived
              return (
                <div key={po.id} className="rounded-lg border p-4 hover:shadow-sm transition-shadow bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{po.poNumber}</p>
                      <p className="font-medium text-sm">{po.supplier?.name}</p>
                    </div>
                    <BadgeFor status={po.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                    <div><p className="text-xs text-muted-foreground">Ordered</p><p className="font-medium tabular-nums">{totalOrdered}</p></div>
                    <div><p className="text-xs text-muted-foreground">Received</p><p className="font-medium tabular-nums text-emerald-600">{totalReceived}</p></div>
                    <div><p className="text-xs text-muted-foreground">Pending</p><p className="font-medium tabular-nums text-amber-600">{remaining}</p></div>
                  </div>
                  {po.expectedDate && (
                    <p className="text-xs text-muted-foreground mb-3">Expected: {fmtDate(po.expectedDate)}</p>
                  )}
                  <Button className="w-full" onClick={() => onGrn(po)}>
                    <ClipboardCheck className="h-4 w-4 mr-1" />Receive goods
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ───────────────────────────────────────────────
//  Receipt history
// ───────────────────────────────────────────────
function ReceiptHistoryTab({
  rows, loading, onView,
}: { rows: any[]; loading: boolean; onView: (po: any) => void }) {
  const received = rows.filter((r) => r.status === 'received' || r.status === 'partial')

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-primary" />Receipt History</CardTitle>
        <CardDescription>All GRNs posted against purchase orders</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : received.length === 0 ? (
          <EmptyState icon={<History className="h-6 w-6" />} title="No receipts yet" />
        ) : (
          <div className="rounded-lg border overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>GRN Number</TableHead>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Invoice Ref</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Received On</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {received.map((po) => {
                  const totalReceived = (po.items || []).reduce((s: number, it: any) => s + (it.receivedQty || 0), 0)
                  const totalFailed = (po.items || []).reduce((s: number, it: any) => s + (it.failedQty || 0), 0)
                  return (
                    <TableRow key={po.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{po.grnNumber || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{po.poNumber}</TableCell>
                      <TableCell className="font-medium">{po.supplier?.name}</TableCell>
                      <TableCell className="text-xs">{po.vehicleNo || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{po.invoiceRef || '—'}</TableCell>
                      <TableCell className="text-sm">{po.receivedBy || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(po.receivedDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="text-emerald-600 font-medium">{totalReceived}</span>
                        {totalFailed > 0 && <span className="text-rose-600 ml-1">({totalFailed} rej.)</span>}
                      </TableCell>
                      <TableCell><BadgeFor status={po.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => onView(po)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ───────────────────────────────────────────────
//  PO creation dialog
// ───────────────────────────────────────────────
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
    if (!supplierId) { toast.error('Select a sourcing partner'); return }
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
          <DialogDescription>Create a PO to source Whirlpool appliances. Number is auto-generated on save.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Sourcing Partner *</Label>
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
                <Button className="col-span-1 h-9" variant="ghost" size="icon" onClick={() => removeLine(i)}><X className="h-4 w-4 text-rose-500" /></Button>
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

// ───────────────────────────────────────────────
//  GRN dialog — receive + QC + putaway
// ───────────────────────────────────────────────
function GrnDialog({ po, onClose, onDone }: { po: any | null; onClose: () => void; onDone: () => void }) {
  const [vehicleNo, setVehicleNo] = useState('')
  const [invoiceRef, setInvoiceRef] = useState('')
  const [receivedBy, setReceivedBy] = useState('')
  const [lines, setLines] = useState<{ id: string; sku: string; name: string; ordered: number; previouslyReceived: number; receiving: string; passed: string; failed: string; putaway: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (po) {
      setVehicleNo(po.vehicleNo || '')
      setInvoiceRef(po.invoiceRef || '')
      setReceivedBy(po.receivedBy || 'Rakib Hossain')
      setLines(po.items.map((it: any) => ({
        id: it.id,
        sku: it.product?.sku,
        name: it.product?.name,
        ordered: it.quantity,
        previouslyReceived: it.receivedQty || 0,
        receiving: String(Math.max(0, it.quantity - (it.receivedQty || 0))),
        passed: String(Math.max(0, it.quantity - (it.receivedQty || 0))),
        failed: '0',
        putaway: it.putawayLocation || '',
      })))
    }
  }, [po])

  if (!po) return null

  function setLine(i: number, k: 'receiving' | 'passed' | 'failed' | 'putaway', v: string) {
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  }

  async function submit() {
    if (!receivedBy) { toast.error('Receiver name required'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/purchase-orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: po.id, action: 'receive', vehicleNo, invoiceRef, receivedBy,
          items: lines.map((l) => ({ id: l.id, received: Number(l.receiving), passed: Number(l.passed), failed: Number(l.failed), putawayLocation: l.putaway })),
        }),
      })
      if (r.ok) {
        const j = await r.json()
        toast.success('GRN posted', { description: `${j.grnNumber} · status: ${j.status}` })
        onDone()
      } else {
        const j = await r.json(); toast.error('Failed', { description: j.error })
      }
    } finally { setSaving(false) }
  }

  const totalReceiving = lines.reduce((s, l) => s + (Number(l.receiving) || 0), 0)
  const totalPassed = lines.reduce((s, l) => s + (Number(l.passed) || 0), 0)
  const totalFailed = lines.reduce((s, l) => s + (Number(l.failed) || 0), 0)

  return (
    <Dialog open={!!po} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Goods Receipt — <span className="font-mono text-sm">{po.poNumber}</span>
          </DialogTitle>
          <DialogDescription>
            Receive from <span className="font-medium text-foreground">{po.supplier?.name}</span> · expected {fmtDate(po.expectedDate)}
          </DialogDescription>
        </DialogHeader>

        {/* GRN header */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier vehicle no.</Label>
            <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="DHK-XXX-0000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice / challan ref</Label>
            <Input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} placeholder="WHP-INV-2026-XXXX" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Received by *</Label>
            <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
          </div>
        </div>

        {/* Line items table */}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Prev. Recd</TableHead>
                <TableHead className="text-right">Receiving</TableHead>
                <TableHead className="text-right">QC Pass</TableHead>
                <TableHead className="text-right">QC Fail</TableHead>
                <TableHead>Putaway Loc</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{l.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{l.sku}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{l.ordered}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-600">{l.previouslyReceived}</TableCell>
                  <TableCell>
                    <Input className="h-8 w-16 ml-auto text-right" type="number" min="0" value={l.receiving} onChange={(e) => setLine(i, 'receiving', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 w-16 ml-auto text-right" type="number" min="0" value={l.passed} onChange={(e) => setLine(i, 'passed', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 w-16 ml-auto text-right" type="number" min="0" value={l.failed} onChange={(e) => setLine(i, 'failed', e.target.value)} />
                  </TableCell>
                  <TableCell>
                    <Input className="h-8 w-24 text-xs" placeholder="A-R1-01" value={l.putaway} onChange={(e) => setLine(i, 'putaway', e.target.value)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/40 p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Receiving</p>
            <p className="text-xl font-semibold tabular-nums">{totalReceiving}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/10 p-3 text-center">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">QC Passed</p>
            <p className="text-xl font-semibold tabular-nums text-emerald-600">{totalPassed}</p>
          </div>
          <div className="rounded-lg bg-rose-500/10 p-3 text-center">
            <p className="text-xs text-rose-700 dark:text-rose-400">QC Failed</p>
            <p className="text-xl font-semibold tabular-nums text-rose-600">{totalFailed}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Posting GRN…' : 'Post GRN & update stock'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────────────────────────
//  PO view dialog
// ───────────────────────────────────────────────
function POViewDialog({ po, onClose }: { po: any | null; onClose: () => void }) {
  if (!po) return null
  const totalReceived = (po.items || []).reduce((s: number, it: any) => s + (it.receivedQty || 0), 0)
  const totalOrdered = (po.items || []).reduce((s: number, it: any) => s + it.quantity, 0)
  const totalFailed = (po.items || []).reduce((s: number, it: any) => s + (it.failedQty || 0), 0)

  return (
    <Dialog open={!!po} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">{po.poNumber}</DialogTitle>
          <DialogDescription>{po.supplier?.name} · ordered {fmtDate(po.orderDate)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-3 text-sm">
            <div><span className="text-muted-foreground">Status:</span> <BadgeFor status={po.status} /></div>
            {po.grnNumber && <div><span className="text-muted-foreground">GRN:</span> <span className="font-mono">{po.grnNumber}</span></div>}
            {po.vehicleNo && <div><span className="text-muted-foreground">Vehicle:</span> {po.vehicleNo}</div>}
            {po.invoiceRef && <div><span className="text-muted-foreground">Invoice:</span> <span className="font-mono">{po.invoiceRef}</span></div>}
            {po.receivedBy && <div><span className="text-muted-foreground">Received by:</span> {po.receivedBy}</div>}
            {po.receivedDate && <div><span className="text-muted-foreground">Received:</span> {fmtDate(po.receivedDate)}</div>}
          </div>
          {po.notes && <p className="text-sm bg-muted/40 rounded-lg p-3 border">{po.notes}</p>}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Passed</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead>Putaway</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {po.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell><div className="font-medium">{it.product?.name}</div><div className="text-xs text-muted-foreground font-mono">{it.product?.sku}</div></TableCell>
                    <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{it.receivedQty || 0}</TableCell>
                    <TableCell className="text-right tabular-nums">{it.passedQty || 0}</TableCell>
                    <TableCell className="text-right tabular-nums text-rose-600">{it.failedQty || 0}</TableCell>
                    <TableCell className="text-xs font-mono">{it.putawayLocation || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{fmtBDT(it.quantity * it.unitPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <p className="text-xs text-muted-foreground">Receipt Progress</p>
              <p className="text-lg font-semibold tabular-nums">{totalReceived} / {totalOrdered} units</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${totalFailed > 0 ? 'bg-rose-500/10' : 'bg-muted/40'}`}>
              <p className={`text-xs ${totalFailed > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-muted-foreground'}`}>QC Failed Units</p>
              <p className={`text-lg font-semibold tabular-nums ${totalFailed > 0 ? 'text-rose-600' : ''}`}>{totalFailed}</p>
            </div>
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
