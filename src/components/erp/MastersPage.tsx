'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  Database, Boxes, Users, Building2, Truck, Plus, Search, RefreshCw, X, Pencil,
} from 'lucide-react'
import { PageHeader, EmptyState, StatCard } from '@/components/erp/primitives'
import { Card, CardContent } from '@/components/ui/card'
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
import { useApp } from '@/store/app'
import { toast } from 'sonner'
import { fmtBDT, fmtNum, fmtDate } from '@/lib/format'

type Tab = 'products' | 'customers' | 'suppliers' | 'warehouses'

export function MastersPage() {
  const { mastersTab, set } = useApp()
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Masters"
        description="Configuration data — products, customers, suppliers and warehouses."
        icon={<Database className="h-5 w-5" />}
      />
      <Tabs value={mastersTab} onValueChange={(v) => set({ mastersTab: v })}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="products"><Boxes className="h-4 w-4 mr-1.5" />Products</TabsTrigger>
          <TabsTrigger value="customers"><Users className="h-4 w-4 mr-1.5" />Customers</TabsTrigger>
          <TabsTrigger value="suppliers"><Truck className="h-4 w-4 mr-1.5" />Suppliers</TabsTrigger>
          <TabsTrigger value="warehouses"><Building2 className="h-4 w-4 mr-1.5" />Warehouses</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-4"><ProductsTab /></TabsContent>
        <TabsContent value="customers" className="mt-4"><CustomersTab /></TabsContent>
        <TabsContent value="suppliers" className="mt-4"><SuppliersTab /></TabsContent>
        <TabsContent value="warehouses" className="mt-4"><WarehousesTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ───────────────────────────────────────────────
//  Products
// ───────────────────────────────────────────────
function ProductsTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/products').then((r) => r.json()).then((d) => { setRows(d); setLoading(false) })
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => r.sku.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.category?.toLowerCase().includes(q))
  }, [rows, search])

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total SKUs" value={fmtNum(rows.length)} icon={<Boxes className="h-4 w-4" />} />
        <StatCard label="Categories" value={fmtNum(new Set(rows.map((r) => r.category)).size)} icon={<Database className="h-4 w-4" />} />
        <StatCard label="Total Stock Value (cost)" value={fmtBDT(rows.reduce((s, r) => s + (r.stock?.quantity || 0) * r.costPrice, 0))} tone="success" />
        <StatCard label="Avg Sale Price" value={fmtBDT(rows.length ? rows.reduce((s, r) => s + r.salePrice, 0) / rows.length : 0)} tone="info" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by SKU, name or category…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={load} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
              <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New product</Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState icon={<Boxes className="h-6 w-6" />} title="No products yet" description="Add your first product to start tracking inventory." action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New product</Button>} />
          ) : (
            <div className="rounded-lg border overflow-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Sale</TableHead>
                    <TableHead className="text-right">Reorder</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">{r.sku}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.category || '—'}</TableCell>
                      <TableCell className="text-xs">{r.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBDT(r.costPrice)}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtBDT(r.salePrice)}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.reorderLevel}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{fmtNum(r.stock?.quantity || 0)}</TableCell>
                      <TableCell>
                        {r.isActive
                          ? <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">Active</Badge>
                          : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductDialog open={open} onOpenChange={setOpen} onDone={() => { setOpen(false); load() }} />
    </div>
  )
}

function ProductDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [form, setForm] = useState({
    sku: '', name: '', category: '', description: '', unit: 'pcs', barcode: '',
    costPrice: '0', salePrice: '0', reorderLevel: '10', stockQuantity: '0',
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.sku || !form.name) { toast.error('SKU and name are required'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: form.sku, name: form.name, category: form.category || null, description: form.description,
          unit: form.unit, barcode: form.barcode || null,
          costPrice: Number(form.costPrice), salePrice: Number(form.salePrice),
          reorderLevel: Number(form.reorderLevel), isActive: true,
          stockQuantity: Number(form.stockQuantity),
        }),
      })
      if (r.ok) {
        toast.success('Product created', { description: `${form.sku} · ${form.name}` })
        onDone()
        setForm({ sku: '', name: '', category: '', description: '', unit: 'pcs', barcode: '', costPrice: '0', salePrice: '0', reorderLevel: '10', stockQuantity: '0' })
      } else { const j = await r.json(); toast.error('Failed', { description: j.error }) }
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Product</DialogTitle>
          <DialogDescription>Create a new product and optionally set its opening stock.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="SKU *"><Input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="WHP-REF-265L" /></Field>
          <Field label="Name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Whirlpool Refrigerator 265L" /></Field>
          <Field label="Category"><Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Refrigerator" /></Field>
          <Field label="Unit"><Input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="pcs" /></Field>
          <Field label="Barcode"><Input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="8801234567890" /></Field>
          <Field label="Reorder level"><Input type="number" value={form.reorderLevel} onChange={(e) => set('reorderLevel', e.target.value)} /></Field>
          <Field label="Cost price (৳)"><Input type="number" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} /></Field>
          <Field label="Sale price (৳)"><Input type="number" value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} /></Field>
          <Field label="Opening stock qty"><Input type="number" value={form.stockQuantity} onChange={(e) => set('stockQuantity', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create product'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────────────────────────
//  Customers
// ───────────────────────────────────────────────
function CustomersTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const load = () => { setLoading(true); fetch('/api/customers').then((r) => r.json()).then((d) => { setRows(d); setLoading(false) }) }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q))
  }, [rows, search])

  return (
    <Card>
      <CardContent className="p-4">
        <Header
          title="Customers"
          search={search} setSearch={setSearch}
          onAdd={() => setOpen(true)} onRefresh={load}
        />
        {loading ? (
          <Skeletons />
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" />} title="No customers yet" action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New customer</Button>} />
        ) : (
          <TableWrap>
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>City</TableHead><TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">{r.email || '—'}</TableCell>
                    <TableCell className="text-sm">{r.phone || '—'}</TableCell>
                    <TableCell className="text-sm">{r.city || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        )}
        <PartyDialog
          open={open} onOpenChange={setOpen} onDone={() => { setOpen(false); load() }}
          kind="customer"
        />
      </CardContent>
    </Card>
  )
}

// ───────────────────────────────────────────────
//  Suppliers
// ───────────────────────────────────────────────
function SuppliersTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const load = () => { setLoading(true); fetch('/api/suppliers').then((r) => r.json()).then((d) => { setRows(d); setLoading(false) }) }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q))
  }, [rows, search])

  return (
    <Card>
      <CardContent className="p-4">
        <Header title="Suppliers" search={search} setSearch={setSearch} onAdd={() => setOpen(true)} onRefresh={load} />
        {loading ? <Skeletons /> : filtered.length === 0 ? (
          <EmptyState icon={<Truck className="h-6 w-6" />} title="No suppliers yet" action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New supplier</Button>} />
        ) : (
          <TableWrap>
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>City</TableHead><TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40">
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">{r.email || '—'}</TableCell>
                    <TableCell className="text-sm">{r.phone || '—'}</TableCell>
                    <TableCell className="text-sm">{r.city || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableWrap>
        )}
        <PartyDialog open={open} onOpenChange={setOpen} onDone={() => { setOpen(false); load() }} kind="supplier" />
      </CardContent>
    </Card>
  )
}

// ───────────────────────────────────────────────
//  Warehouses
// ───────────────────────────────────────────────
function WarehousesTab() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const load = () => { setLoading(true); fetch('/api/warehouses').then((r) => r.json()).then((d) => { setRows(d); setLoading(false) }) }
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
        ) : rows.length === 0 ? (
          <Card><CardContent className="p-6"><EmptyState icon={<Building2 className="h-6 w-6" />} title="No warehouses yet" action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New warehouse</Button>} /></CardContent></Card>
        ) : rows.map((w) => (
          <Card key={w.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="grid place-items-center h-11 w-11 rounded-lg bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="font-mono">{w.code}</Badge>
              </div>
              <p className="font-semibold text-base">{w.name}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{w.address}, {w.city}</p>
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Locations</p>
                  <p className="font-medium tabular-nums">{w.locations?.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="font-medium tabular-nums">{fmtNum(w.capacity)} units</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New warehouse</Button>
      </div>
      <WarehouseDialog open={open} onOpenChange={setOpen} onDone={() => { setOpen(false); load() }} />
    </div>
  )
}

function WarehouseDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [form, setForm] = useState({ code: '', name: '', address: '', city: '', capacity: '10000' })
  const [saving, setSaving] = useState(false)
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })) }
  async function submit() {
    if (!form.code || !form.name) { toast.error('Code and name required'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/warehouses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, capacity: Number(form.capacity) }),
      })
      if (r.ok) { toast.success('Warehouse created'); onDone(); setForm({ code: '', name: '', address: '', city: '', capacity: '10000' }) }
      else { const j = await r.json(); toast.error('Failed', { description: j.error }) }
    } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Warehouse</DialogTitle><DialogDescription>Add a new storage facility.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Code *"><Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="WHS-03" /></Field>
          <Field label="Name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Sylhet Distribution Center" /></Field>
          <div className="sm:col-span-2"><Field label="Address"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field></div>
          <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Capacity"><Input type="number" value={form.capacity} onChange={(e) => set('capacity', e.target.value)} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PartyDialog({ open, onOpenChange, onDone, kind }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void; kind: 'customer' | 'supplier' }) {
  const [form, setForm] = useState({ code: '', name: '', email: '', phone: '', address: '', city: '' })
  const [saving, setSaving] = useState(false)
  function set<K extends keyof typeof form>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })) }
  async function submit() {
    if (!form.code || !form.name) { toast.error('Code and name required'); return }
    setSaving(true)
    try {
      const r = await fetch(`/api/${kind}s`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (r.ok) { toast.success(`${kind[0].toUpperCase() + kind.slice(1)} created`); onDone(); setForm({ code: '', name: '', email: '', phone: '', address: '', city: '' }) }
      else { const j = await r.json(); toast.error('Failed', { description: j.error }) }
    } finally { setSaving(false) }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {kind === 'customer' ? 'Customer' : 'Supplier'}</DialogTitle>
          <DialogDescription>Add a new {kind} record.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Field label="Code *"><Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder={kind === 'customer' ? 'CUST-005' : 'SUP-004'} /></Field>
          <Field label="Name *"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field></div>
          <Field label="City"><Input value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ───────────────────────────────────────────────
//  shared helpers
// ───────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}
function Header({ title, search, setSearch, onAdd, onRefresh }: { title: string; search: string; setSearch: (s: string) => void; onAdd: () => void; onRefresh: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-4">
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder={`Search ${title.toLowerCase()}…`} className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        <Button onClick={onAdd}><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
    </div>
  )
}
function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border overflow-auto max-h-[600px]">{children}</div>
}
function Skeletons() {
  return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
}
