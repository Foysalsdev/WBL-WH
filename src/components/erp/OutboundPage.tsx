'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Truck, Plus, RefreshCw, Eye, X, CheckCircle2, Package, PackageCheck,
  ClipboardList, MapPin, ShieldCheck,
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { fmtBDT, fmtNum, fmtDate, fmtDateTime } from '@/lib/format'

export function OutboundPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<any | null>(null)
  const [action, setAction] = useState<{ so: any; type: 'pick' | 'pack' | 'dispatch' | 'pod' } | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/sales-orders').then((r) => r.json()).then((d) => { setRows(d); setLoading(false) })
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const stats = useMemo(() => ({
    total: rows.length,
    confirmed: rows.filter((r) => r.status === 'confirmed').length,
    picked: rows.filter((r) => r.status === 'picked' || r.status === 'packed').length,
    inTransit: rows.filter((r) => r.status === 'shipped').length,
    delivered: rows.filter((r) => r.status === 'delivered').length,
    podPending: rows.filter((r) => r.status === 'shipped' && r.podStatus === 'pending').length,
  }), [rows])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Outbound · Order Dispatch"
        description="Manage Whirlpool dealer orders through pick → pack → dispatch → delivery confirmation."
        icon={<Truck className="h-5 w-5" />}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New SO</Button>}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Awaiting Pick" value={fmtNum(stats.confirmed)} tone="info" icon={<ClipboardList className="h-4 w-4" />} />
        <StatCard label="In Pick/Pack" value={fmtNum(stats.picked)} tone="warning" icon={<Package className="h-4 w-4" />} />
        <StatCard label="In Transit" value={fmtNum(stats.inTransit)} tone="info" icon={<Truck className="h-4 w-4" />} />
        <StatCard label="POD Pending" value={fmtNum(stats.podPending)} tone="destructive" icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all"><Truck className="h-4 w-4 mr-1.5" />All Orders</TabsTrigger>
          <TabsTrigger value="pick"><ClipboardList className="h-4 w-4 mr-1.5" />Pick Queue</TabsTrigger>
          <TabsTrigger value="dispatch"><Package className="h-4 w-4 mr-1.5" />Dispatch</TabsTrigger>
          <TabsTrigger value="pod"><ShieldCheck className="h-4 w-4 mr-1.5" />POD Confirmation</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AllOrdersTab rows={rows} loading={loading} onRefresh={load} onView={setView} onAction={(so, type) => setAction({ so, type })} />
        </TabsContent>
        <TabsContent value="pick" className="mt-4">
          <PickQueueTab rows={rows} loading={loading} onRefresh={load} onAction={(so, type) => setAction({ so, type })} />
        </TabsContent>
        <TabsContent value="dispatch" className="mt-4">
          <DispatchTab rows={rows} loading={loading} onRefresh={load} onView={setView} onAction={(so, type) => setAction({ so, type })} />
        </TabsContent>
        <TabsContent value="pod" className="mt-4">
          <PodTab rows={rows} loading={loading} onRefresh={load} onAction={(so, type) => setAction({ so, type })} />
        </TabsContent>
      </Tabs>

      <SODialog open={open} onOpenChange={setOpen} onDone={() => { setOpen(false); load() }} />
      <SOViewDialog so={view} onClose={() => setView(null)} onAction={(type) => { setView(null); setAction({ so: view, type }) }} />
      <ActionDialog ctx={action} onClose={() => setAction(null)} onDone={() => { setAction(null); load() }} />
    </div>
  )
}

// ───────────────────────────────────────────────
//  All orders
// ───────────────────────────────────────────────
function AllOrdersTab({
  rows, loading, onRefresh, onView, onAction,
}: { rows: any[]; loading: boolean; onRefresh: () => void; onView: (so: any) => void; onAction: (so: any, type: 'pick' | 'pack' | 'dispatch' | 'pod') => void }) {
  async function setStatus(so: any, status: string) {
    const r = await fetch('/api/sales-orders', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: so.id, action: 'status', status }),
    })
    if (r.ok) { toast.success(`${so.soNumber} → ${status}`); onRefresh() }
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">All sales orders</h2>
          <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Truck className="h-6 w-6" />} title="No sales orders yet" />
        ) : (
          <div className="rounded-lg border overflow-auto max-h-[600px]">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>SO Number</TableHead>
                  <TableHead>Dealer</TableHead>
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
                    <TableCell>
                      <BadgeFor status={so.status} />
                      {so.podStatus && so.podStatus !== 'pending' && (
                        <Badge variant="outline" className={`ml-1 text-[10px] ${so.podStatus === 'confirmed' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5' : so.podStatus === 'failed' ? 'text-rose-600 border-rose-500/30 bg-rose-500/5' : ''}`}>POD: {so.podStatus}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => onView(so)} title="View"><Eye className="h-4 w-4" /></Button>
                        {so.status === 'draft' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setStatus(so, 'confirmed')}>Confirm</Button>
                            <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => setStatus(so, 'cancelled')}><X className="h-4 w-4" /></Button>
                          </>
                        )}
                        {so.status === 'confirmed' && (
                          <Button size="sm" onClick={() => onAction(so, 'pick')}><ClipboardList className="h-4 w-4 mr-1" />Pick</Button>
                        )}
                        {so.status === 'picked' && (
                          <Button size="sm" onClick={() => onAction(so, 'pack')}><Package className="h-4 w-4 mr-1" />Pack</Button>
                        )}
                        {so.status === 'packed' && (
                          <Button size="sm" onClick={() => onAction(so, 'dispatch')}><Truck className="h-4 w-4 mr-1" />Dispatch</Button>
                        )}
                        {so.status === 'shipped' && (
                          <Button size="sm" onClick={() => onAction(so, 'pod')}><ShieldCheck className="h-4 w-4 mr-1" />POD</Button>
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
  )
}

// ───────────────────────────────────────────────
//  Pick queue
// ───────────────────────────────────────────────
function PickQueueTab({
  rows, loading, onRefresh, onAction,
}: { rows: any[]; loading: boolean; onRefresh: () => void; onAction: (so: any, type: 'pick') => void }) {
  const queue = rows.filter((r) => r.status === 'confirmed')
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />Pick Queue</CardTitle>
            <CardDescription>Confirmed dealer orders awaiting warehouse pick</CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : queue.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No pending picks" description="All confirmed orders have been picked." />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {queue.map((so) => {
              const totalQty = (so.items || []).reduce((s: number, it: any) => s + it.quantity, 0)
              return (
                <div key={so.id} className="rounded-lg border p-4 hover:shadow-sm transition-shadow bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{so.soNumber}</p>
                      <p className="font-medium text-sm">{so.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{so.customer?.city}</p>
                    </div>
                    <Badge variant="outline">{so.items?.length || 0} SKUs · {totalQty} units</Badge>
                  </div>
                  {so.deliveryDate && (
                    <p className="text-xs text-muted-foreground mb-3">Target delivery: {fmtDate(so.deliveryDate)}</p>
                  )}
                  <Button className="w-full" onClick={() => onAction(so, 'pick')}>
                    <ClipboardList className="h-4 w-4 mr-1" />Start picking
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
//  Dispatch — packed orders ready to ship
// ───────────────────────────────────────────────
function DispatchTab({
  rows, loading, onRefresh, onView, onAction,
}: { rows: any[]; loading: boolean; onRefresh: () => void; onView: (so: any) => void; onAction: (so: any, type: 'dispatch' | 'pod') => void }) {
  const packed = rows.filter((r) => r.status === 'packed')
  const shipped = rows.filter((r) => r.status === 'shipped')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Ready for Dispatch</CardTitle>
          <CardDescription>Packed orders awaiting vehicle assignment &amp; dispatch</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 rounded-xl" /> : packed.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No packed orders awaiting dispatch" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {packed.map((so) => {
                const totalQty = (so.items || []).reduce((s: number, it: any) => s + (it.pickedQty || it.quantity), 0)
                return (
                  <div key={so.id} className="rounded-lg border p-4 hover:shadow-sm transition-shadow bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">{so.soNumber}</p>
                        <p className="font-medium text-sm">{so.customer?.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{so.customer?.city}</p>
                      </div>
                      <Badge variant="outline">{so.cartonCount} cartons</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{totalQty} units · {fmtBDT(so.totalAmount)}</p>
                    <Button className="w-full" onClick={() => onAction(so, 'dispatch')}>
                      <Truck className="h-4 w-4 mr-1" />Dispatch
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-primary" />In Transit</CardTitle>
          <CardDescription>Dispatched shipments awaiting delivery confirmation (POD)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 rounded-xl" /> : shipped.length === 0 ? (
            <EmptyState icon={<Truck className="h-6 w-6" />} title="No shipments in transit" />
          ) : (
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Challan</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Dealer</TableHead>
                    <TableHead>Shipped</TableHead>
                    <TableHead>POD</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipped.map((so) => (
                    <TableRow key={so.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{so.soNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{so.challanNo}</TableCell>
                      <TableCell className="text-sm">{so.vehicleNo}</TableCell>
                      <TableCell>
                        <div className="text-sm">{so.driverName}</div>
                        <div className="text-xs text-muted-foreground">{so.driverPhone}</div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{so.customer?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(so.shippedAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={so.podStatus === 'confirmed' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5' : so.podStatus === 'failed' ? 'text-rose-600 border-rose-500/30 bg-rose-500/5' : 'text-amber-600 border-amber-500/30 bg-amber-500/5'}>
                          {so.podStatus || 'pending'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {so.podStatus === 'pending' && (
                          <Button size="sm" onClick={() => onAction(so, 'pod')}><ShieldCheck className="h-4 w-4 mr-1" />Confirm POD</Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => onView(so)}><Eye className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ───────────────────────────────────────────────
//  POD confirmation
// ───────────────────────────────────────────────
function PodTab({
  rows, loading, onRefresh, onAction,
}: { rows: any[]; loading: boolean; onRefresh: () => void; onAction: (so: any, type: 'pod') => void }) {
  const pending = rows.filter((r) => r.status === 'shipped' && r.podStatus === 'pending')
  const confirmed = rows.filter((r) => r.podStatus === 'confirmed' || r.podStatus === 'failed' || r.podStatus === 'rescheduled')

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" />POD Pending</CardTitle>
          <CardDescription>Shipments awaiting proof-of-delivery confirmation</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-24 rounded-xl" /> : pending.length === 0 ? (
            <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No pending PODs" description="All shipments have been confirmed." />
          ) : (
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead><TableHead>Challan</TableHead><TableHead>Vehicle</TableHead>
                    <TableHead>Dealer</TableHead><TableHead>Shipped</TableHead><TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((so) => (
                    <TableRow key={so.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{so.soNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{so.challanNo}</TableCell>
                      <TableCell className="text-sm">{so.vehicleNo}</TableCell>
                      <TableCell className="font-medium">{so.customer?.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(so.shippedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => onAction(so, 'pod')}><ShieldCheck className="h-4 w-4 mr-1" />Record POD</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {confirmed.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />POD History</CardTitle>
            <CardDescription>Recently closed deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead><TableHead>Dealer</TableHead><TableHead>POD Status</TableHead>
                    <TableHead>Received By</TableHead><TableHead>POD Date</TableHead><TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmed.map((so) => (
                    <TableRow key={so.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{so.soNumber}</TableCell>
                      <TableCell className="font-medium">{so.customer?.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={so.podStatus === 'confirmed' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5' : so.podStatus === 'failed' ? 'text-rose-600 border-rose-500/30 bg-rose-500/5' : 'text-amber-600 border-amber-500/30 bg-amber-500/5'}>
                          {so.podStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{so.podReceivedBy || '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(so.podDate)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{so.podNotes || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ───────────────────────────────────────────────
//  SO creation dialog
// ───────────────────────────────────────────────
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
  function pickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId)
    setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, productId, unitPrice: p ? String(p.salePrice) : l.unitPrice } : l))
  }
  function addLine() { setLines((a) => [...a, { productId: '', quantity: '1', unitPrice: '0' }]) }
  function removeLine(i: number) { setLines((a) => a.filter((_, idx) => idx !== i)) }

  async function submit() {
    if (!customerId) { toast.error('Select a dealer'); return }
    if (lines.length === 0 || lines.some((l) => !l.productId)) { toast.error('Add at least one line item'); return }
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
          <DialogDescription>Create a dealer order. Number is auto-generated on save.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Dealer / Showroom *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Select dealer" /></SelectTrigger>
              <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Target delivery date</Label>
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
          <Button onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create SO'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────────────────────────
//  Action dialog — pick / pack / dispatch / pod
// ───────────────────────────────────────────────
function ActionDialog({
  ctx, onClose, onDone,
}: { ctx: { so: any; type: 'pick' | 'pack' | 'dispatch' | 'pod' } | null; onClose: () => void; onDone: () => void }) {
  if (!ctx) return null
  return (
    <Dialog open={!!ctx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {ctx.type === 'pick'    && <PickForm    so={ctx.so} onDone={onDone} onCancel={onClose} />}
        {ctx.type === 'pack'    && <PackForm    so={ctx.so} onDone={onDone} onCancel={onClose} />}
        {ctx.type === 'dispatch'&& <DispatchForm so={ctx.so} onDone={onDone} onCancel={onClose} />}
        {ctx.type === 'pod'     && <PodForm     so={ctx.so} onDone={onDone} onCancel={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function PickForm({ so, onDone, onCancel }: { so: any; onDone: () => void; onCancel: () => void }) {
  const [pickedBy, setPickedBy] = useState('Rakib Hossain')
  const [lines, setLines] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    setLines((so.items || []).map((it: any) => ({ id: it.id, name: it.product?.name, sku: it.product?.sku, ordered: it.quantity, picked: String(it.quantity) })))
  }, [so])
  function setPicked(i: number, v: string) { setLines((arr) => arr.map((l, idx) => idx === i ? { ...l, picked: v } : l)) }

  async function submit() {
    setSaving(true)
    try {
      const r = await fetch('/api/sales-orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: so.id, action: 'pick', pickedBy, items: lines.map((l) => ({ id: l.id, pickedQty: Number(l.picked) })) }),
      })
      if (r.ok) { toast.success(`${so.soNumber} picked`, { description: `By ${pickedBy}` }); onDone() }
      else { const j = await r.json(); toast.error('Failed', { description: j.error }) }
    } finally { setSaving(false) }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Pick List — <span className="font-mono text-sm">{so.soNumber}</span></DialogTitle>
        <DialogDescription>Dealer: {so.customer?.name} · {so.customer?.city}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Picked by</Label>
          <Input value={pickedBy} onChange={(e) => setPickedBy(e.target.value)} />
        </div>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Ordered</TableHead>
              <TableHead className="text-right">Picked Qty</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {lines.map((l, i) => (
                <TableRow key={l.id}>
                  <TableCell><div className="font-medium text-sm">{l.name}</div><div className="text-xs text-muted-foreground font-mono">{l.sku}</div></TableCell>
                  <TableCell className="text-right tabular-nums">{l.ordered}</TableCell>
                  <TableCell>
                    <Input className="h-8 w-20 ml-auto text-right" type="number" min="0" max={l.ordered} value={l.picked} onChange={(e) => setPicked(i, e.target.value)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit} disabled={saving}><PackageCheck className="h-4 w-4 mr-1" />{saving ? 'Confirming…' : 'Confirm pick'}</Button>
      </DialogFooter>
    </>
  )
}

function PackForm({ so, onDone, onCancel }: { so: any; onDone: () => void; onCancel: () => void }) {
  const [packedBy, setPackedBy] = useState('Sadia Karim')
  const [cartonCount, setCartonCount] = useState('1')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try {
      const r = await fetch('/api/sales-orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: so.id, action: 'pack', packedBy, cartonCount }),
      })
      if (r.ok) { toast.success(`${so.soNumber} packed`, { description: `${cartonCount} cartons by ${packedBy}` }); onDone() }
      else { const j = await r.json(); toast.error('Failed', { description: j.error }) }
    } finally { setSaving(false) }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Pack — <span className="font-mono text-sm">{so.soNumber}</span></DialogTitle>
        <DialogDescription>{so.customer?.name} · {so.items?.length || 0} line items</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 py-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Packed by</Label>
          <Input value={packedBy} onChange={(e) => setPackedBy(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Number of cartons</Label>
          <Input type="number" min="1" value={cartonCount} onChange={(e) => setCartonCount(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit} disabled={saving}><PackageCheck className="h-4 w-4 mr-1" />{saving ? 'Packing…' : 'Confirm pack'}</Button>
      </DialogFooter>
    </>
  )
}

function DispatchForm({ so, onDone, onCancel }: { so: any; onDone: () => void; onCancel: () => void }) {
  const [challanNo, setChallanNo] = useState('')
  const [vehicleNo, setVehicleNo] = useState('')
  const [driverName, setDriverName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!vehicleNo) { toast.error('Vehicle number required'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/sales-orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: so.id, action: 'dispatch', challanNo, vehicleNo, driverName, driverPhone }),
      })
      if (r.ok) {
        const j = await r.json()
        toast.success('Dispatched', { description: `${so.soNumber} on ${j.challanNo}` })
        onDone()
      } else { const j = await r.json(); toast.error('Failed', { description: j.error }) }
    } finally { setSaving(false) }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />Dispatch — <span className="font-mono text-sm">{so.soNumber}</span></DialogTitle>
        <DialogDescription>Stock will be deducted on dispatch. Dealer: {so.customer?.name}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-3 py-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Challan no. (auto if blank)</Label>
          <Input value={challanNo} onChange={(e) => setChallanNo(e.target.value)} placeholder="CH-2026-XXXX" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Vehicle no. *</Label>
          <Input value={vehicleNo} onChange={(e) => setVehicleNo(e.target.value)} placeholder="DHK-GAZ-0000" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Driver name</Label>
          <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Driver phone</Label>
          <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="+88017…" />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit} disabled={saving}><Truck className="h-4 w-4 mr-1" />{saving ? 'Dispatching…' : 'Dispatch & generate challan'}</Button>
      </DialogFooter>
    </>
  )
}

function PodForm({ so, onDone, onCancel }: { so: any; onDone: () => void; onCancel: () => void }) {
  const [podStatus, setPodStatus] = useState<'confirmed' | 'failed' | 'rescheduled'>('confirmed')
  const [podReceivedBy, setPodReceivedBy] = useState('')
  const [podNotes, setPodNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    try {
      const r = await fetch('/api/sales-orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: so.id, action: 'pod', podStatus, podReceivedBy, podNotes }),
      })
      if (r.ok) {
        toast.success('POD recorded', { description: `${so.soNumber} — ${podStatus}` })
        onDone()
      } else { const j = await r.json(); toast.error('Failed', { description: j.error }) }
    } finally { setSaving(false) }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />POD — <span className="font-mono text-sm">{so.soNumber}</span></DialogTitle>
        <DialogDescription>Challan {so.challanNo} · Vehicle {so.vehicleNo} · {so.customer?.name}</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Delivery outcome</Label>
          <Select value={podStatus} onValueChange={(v) => setPodStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed — delivered successfully</SelectItem>
              <SelectItem value="failed">Failed — delivery rejected/returned</SelectItem>
              <SelectItem value="rescheduled">Rescheduled — delivery postponed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Received by (at dealer)</Label>
          <Input value={podReceivedBy} onChange={(e) => setPodReceivedBy(e.target.value)} placeholder="Showroom Manager name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">POD notes</Label>
          <Textarea rows={3} value={podNotes} onChange={(e) => setPodNotes(e.target.value)} placeholder="e.g. signed in good condition, partial damage noted, etc." />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={submit} disabled={saving}><ShieldCheck className="h-4 w-4 mr-1" />{saving ? 'Saving…' : 'Record POD'}</Button>
      </DialogFooter>
    </>
  )
}

// ───────────────────────────────────────────────
//  SO view dialog
// ───────────────────────────────────────────────
function SOViewDialog({ so, onClose, onAction }: { so: any | null; onClose: () => void; onAction: (type: 'pick' | 'pack' | 'dispatch' | 'pod') => void }) {
  if (!so) return null
  return (
    <Dialog open={!!so} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">{so.soNumber}</DialogTitle>
          <DialogDescription>{so.customer?.name} · ordered {fmtDate(so.orderDate)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="flex flex-wrap gap-3 text-sm">
            <div><span className="text-muted-foreground">Status:</span> <BadgeFor status={so.status} /></div>
            {so.challanNo && <div><span className="text-muted-foreground">Challan:</span> <span className="font-mono">{so.challanNo}</span></div>}
            {so.vehicleNo && <div><span className="text-muted-foreground">Vehicle:</span> {so.vehicleNo}</div>}
            {so.driverName && <div><span className="text-muted-foreground">Driver:</span> {so.driverName}</div>}
            {so.pickedBy && <div><span className="text-muted-foreground">Picked by:</span> {so.pickedBy}</div>}
            {so.packedBy && <div><span className="text-muted-foreground">Packed by:</span> {so.packedBy}</div>}
            {so.podStatus && <div><span className="text-muted-foreground">POD:</span> <Badge variant="outline" className={so.podStatus === 'confirmed' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5' : so.podStatus === 'failed' ? 'text-rose-600 border-rose-500/30 bg-rose-500/5' : 'text-amber-600 border-amber-500/30 bg-amber-500/5'}>{so.podStatus}</Badge></div>}
          </div>
          {so.notes && <p className="text-sm bg-muted/40 rounded-lg p-3 border">{so.notes}</p>}
          {so.podNotes && <p className="text-sm bg-muted/40 rounded-lg p-3 border"><span className="text-muted-foreground">POD notes:</span> {so.podNotes}</p>}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Ordered</TableHead>
                <TableHead className="text-right">Picked</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {so.items?.map((it: any) => (
                  <TableRow key={it.id}>
                    <TableCell><div className="font-medium">{it.product?.name}</div><div className="text-xs text-muted-foreground font-mono">{it.product?.sku}</div></TableCell>
                    <TableCell className="text-right tabular-nums">{it.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{it.pickedQty || 0}</TableCell>
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
          {/* Action buttons in view */}
          {so.status === 'confirmed' && <Button className="w-full" onClick={() => onAction('pick')}><ClipboardList className="h-4 w-4 mr-1" />Start Pick</Button>}
          {so.status === 'picked' && <Button className="w-full" onClick={() => onAction('pack')}><Package className="h-4 w-4 mr-1" />Pack Order</Button>}
          {so.status === 'packed' && <Button className="w-full" onClick={() => onAction('dispatch')}><Truck className="h-4 w-4 mr-1" />Dispatch</Button>}
          {so.status === 'shipped' && so.podStatus === 'pending' && <Button className="w-full" onClick={() => onAction('pod')}><ShieldCheck className="h-4 w-4 mr-1" />Record POD</Button>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
