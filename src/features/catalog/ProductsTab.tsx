'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Boxes, Plus, Printer, Trash2 } from 'lucide-react'
import { StatCard } from '@/components/system'
import { DataTable, CodeCell, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { CreateDialog } from '@/components/system/create-dialog'
import { ViewDialog, type ViewField } from '@/components/system/view-dialog'
import { RowActions } from '@/components/system/row-actions'
import { Field } from '@/components/system/forms'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { productsApi } from '@/lib/api/endpoints'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { inputClass } from '@/lib/styles'
import { toast } from 'sonner'
import { bdt, num, date } from '@/lib/format'
import type { Product, ProductInput } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  ProductsTab — Whirlpool appliance catalog full CRUD
// ═══════════════════════════════════════════════════════════════

const EMPTY_FORM: ProductInput = {
  sku: '', name: '', category: '', description: '',
  unit: 'pcs', barcode: '',
  costPrice: 0, salePrice: 0, reorderLevel: 10, isActive: true,
  stockQuantity: 0,
}

export function ProductsTab() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<Product | null>(null)
  const [viewItem, setViewItem] = useState<Product | null>(null)
  const [deleteItem, setDeleteItem] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductInput>(EMPTY_FORM)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', debouncedSearch],
    queryFn: () => productsApi.list(debouncedSearch || undefined),
  })

  const createMutation = useMutation({
    mutationFn: (input: ProductInput) => productsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductInput> }) =>
      productsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  // Pre-populate form when opening edit
  useEffect(() => {
    if (editItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        sku: editItem.sku,
        name: editItem.name,
        category: editItem.category || '',
        description: editItem.description || '',
        unit: editItem.unit,
        barcode: editItem.barcode || '',
        costPrice: editItem.costPrice,
        salePrice: editItem.salePrice,
        reorderLevel: editItem.reorderLevel,
        isActive: editItem.isActive,
        stockQuantity: editItem.stock?.quantity ?? 0,
      })
    }
  }, [editItem])

  const stats = (data || []).reduce(
    (acc, p) => {
      acc.count += 1
      acc.value += (p.stock?.quantity || 0) * p.costPrice
      acc.categories.add(p.category || 'Uncategorized')
      acc.avgPrice += p.salePrice
      return acc
    },
    { count: 0, value: 0, categories: new Set<string>(), avgPrice: 0 },
  )

  function setField<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  function openEdit(p: Product) {
    setViewItem(null)
    setEditItem(p)
  }

  async function submitCreate() {
    if (!form.sku || !form.name) {
      toast.error('SKU and name are required')
      return
    }
    try {
      const p = await createMutation.mutateAsync(form)
      toast.success('Product created', { description: `${p.sku} · ${p.name}` })
      setCreateOpen(false)
    } catch (e: any) {
      toast.error('Failed to create product', { description: e.message })
    }
  }

  async function submitEdit() {
    if (!editItem) return
    if (!form.sku || !form.name) {
      toast.error('SKU and name are required')
      return
    }
    try {
      const { stockQuantity, ...rest } = form
      const p = await updateMutation.mutateAsync({ id: editItem.id, input: { ...rest, stockQuantity } })
      toast.success('Product updated', { description: `${p.sku} · ${p.name}` })
      setEditItem(null)
    } catch (e: any) {
      toast.error('Failed to update product', { description: e.message })
    }
  }

  function handlePrint(p: Product) {
    printProductDetail(p)
  }

  async function handleDelete() {
    if (!deleteItem) return
    try {
      await deleteMutation.mutateAsync(deleteItem.id)
      toast.success('Product deleted', { description: `${deleteItem.sku} · ${deleteItem.name}` })
      setDeleteItem(null)
    } catch (e: any) {
      toast.error('Failed to delete product', { description: e.message })
    }
  }

  function viewFields(p: Product): ViewField[] {
    return [
      { label: 'SKU', value: p.sku, mono: true },
      { label: 'Barcode', value: p.barcode || '—', mono: true },
      { label: 'Category', value: p.category || 'Uncategorized' },
      { label: 'Unit', value: p.unit },
      { label: 'Cost Price', value: bdt(p.costPrice), mono: true },
      { label: 'Sale Price', value: bdt(p.salePrice), mono: true },
      { label: 'Reorder Level', value: `${p.reorderLevel} ${p.unit}`, mono: true },
      { label: 'Current Stock', value: `${num(p.stock?.quantity || 0)} ${p.unit}`, mono: true },
      { label: 'Stock Value (cost)', value: bdt((p.stock?.quantity || 0) * p.costPrice), mono: true },
      { label: 'Stock Value (sale)', value: bdt((p.stock?.quantity || 0) * p.salePrice), mono: true },
      { label: 'Description', value: p.description || '—', full: true },
      { label: 'Created', value: date(p.createdAt) },
      { label: 'Last Updated', value: date(p.updatedAt) },
    ]
  }

  const columns: Column<Product>[] = [
    {
      key: 'sku', header: 'SKU',
      cell: (p) => <CodeCell code={p.sku} onClick={() => setViewItem(p)} />,
      sort: (a, b) => a.sku.localeCompare(b.sku),
    },
    { key: 'name', header: 'Product Name', cell: (p) => <span className="font-medium">{p.name}</span>, sort: (a, b) => a.name.localeCompare(b.name) },
    { key: 'category', header: 'Category', cell: (p) => <span className="text-xs text-muted-foreground">{p.category || '—'}</span>, sort: (a, b) => (a.category || '').localeCompare(b.category || '') },
    { key: 'costPrice', header: 'Cost', align: 'right', cell: (p) => <span className="tabular-nums">{bdt(p.costPrice)}</span>, sort: (a, b) => a.costPrice - b.costPrice },
    { key: 'salePrice', header: 'Sale', align: 'right', cell: (p) => <span className="tabular-nums">{bdt(p.salePrice)}</span>, sort: (a, b) => a.salePrice - b.salePrice },
    { key: 'reorderLevel', header: 'Reorder', align: 'right', cell: (p) => <span className="tabular-nums">{p.reorderLevel}</span> },
    { key: 'stock', header: 'Stock', align: 'right', cell: (p) => <span className="tabular-nums font-medium">{num(p.stock?.quantity || 0)}</span> },
    {
      key: 'status', header: 'Status', align: 'center',
      cell: (p) => p.isActive
        ? <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">Active</Badge>
        : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>,
    },
    {
      key: 'actions', header: '', align: 'right', noPadding: true,
      cell: (p) => (
        <RowActions
          onView={() => setViewItem(p)}
          onEdit={() => openEdit(p)}
          onPrint={() => handlePrint(p)}
          onDelete={() => setDeleteItem(p)}
        />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 stagger">
        <StatCard label="Total SKUs" value={num(stats.count)} icon={Boxes} tone="primary" />
        <StatCard label="Categories" value={num(stats.categories.size)} tone="info" />
        <StatCard label="Stock Value (cost)" value={bdt(stats.value)} tone="success" />
        <StatCard label="Avg Sale Price" value={bdt(stats.count ? stats.avgPrice / stats.count : 0)} tone="info" />
      </div>

      <MasterTabShell<Product>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by SKU, name or category…"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && (data?.length || 0) === 0}
        emptyTitle="No products yet"
        emptyDescription="Add your first Whirlpool appliance SKU to start tracking inventory."
        emptyIcon={Boxes}
        onRetry={() => refetch()}
        primaryAction={{ label: 'New product', icon: Plus, onClick: openCreate }}
      >
        <DataTable
          data={data || []}
          columns={columns}
          rowKey={(p) => p.id}
          initialSortKey="sku"
        />
      </MasterTabShell>

      {/* Create dialog */}
      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Product"
        description="Create a new Whirlpool appliance SKU. Optionally set opening stock."
        onSubmit={submitCreate}
        submitLabel={createMutation.isPending ? 'Creating…' : 'Create product'}
        disabled={createMutation.isPending}
        maxWidth="max-w-2xl"
      >
        <ProductForm form={form} setField={setField} />
      </CreateDialog>

      {/* Edit dialog */}
      <CreateDialog
        open={editItem !== null}
        onOpenChange={(o) => !o && setEditItem(null)}
        title="Edit Product"
        description={`Editing ${editItem?.sku} — ${editItem?.name}`}
        onSubmit={submitEdit}
        submitLabel={updateMutation.isPending ? 'Saving…' : 'Save changes'}
        disabled={updateMutation.isPending}
        maxWidth="max-w-2xl"
      >
        <ProductForm form={form} setField={setField} />
      </CreateDialog>

      {/* View dialog */}
      <ViewDialog
        open={viewItem !== null}
        onOpenChange={(o) => !o && setViewItem(null)}
        code={viewItem?.sku}
        title={viewItem?.name || ''}
        subtitle={`${viewItem?.category || 'Uncategorized'} · ${viewItem?.unit || 'pcs'}`}
        badge={viewItem ? {
          label: viewItem.isActive ? 'Active' : 'Inactive',
          tone: viewItem.isActive ? 'success' : 'default',
        } : undefined}
        fields={viewItem ? viewFields(viewItem) : []}
        onEdit={() => viewItem && openEdit(viewItem)}
        onPrint={() => viewItem && handlePrint(viewItem)}
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteItem !== null} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-mono font-semibold">{deleteItem?.sku}</span> — {deleteItem?.name}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Reusable product form fields (used in both Create & Edit) ────
function ProductForm({
  form, setField,
}: {
  form: ProductInput
  setField: <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => void
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="SKU" required>
        <input className={inputClass} value={form.sku} onChange={(e) => setField('sku', e.target.value)} placeholder="WHP-REF-265L-IM" />
      </Field>
      <Field label="Name" required>
        <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Whirlpool Protton 265L Refrigerator" />
      </Field>
      <Field label="Category">
        <input className={inputClass} value={form.category} onChange={(e) => setField('category', e.target.value)} placeholder="Refrigerator" />
      </Field>
      <Field label="Unit">
        <input className={inputClass} value={form.unit} onChange={(e) => setField('unit', e.target.value)} placeholder="pcs" />
      </Field>
      <Field label="Barcode">
        <input className={inputClass} value={form.barcode} onChange={(e) => setField('barcode', e.target.value)} placeholder="8801234567890" />
      </Field>
      <Field label="Reorder level">
        <input type="number" min="0" className={inputClass} value={form.reorderLevel} onChange={(e) => setField('reorderLevel', Number(e.target.value))} />
      </Field>
      <Field label="Cost price (TK)">
        <input type="number" min="0" className={inputClass} value={form.costPrice} onChange={(e) => setField('costPrice', Number(e.target.value))} />
      </Field>
      <Field label="Sale price (TK)">
        <input type="number" min="0" className={inputClass} value={form.salePrice} onChange={(e) => setField('salePrice', Number(e.target.value))} />
      </Field>
      <Field label="Stock quantity" hint="Adjusts on-hand stock (writes a movement)">
        <input type="number" min="0" className={inputClass} value={form.stockQuantity} onChange={(e) => setField('stockQuantity', Number(e.target.value))} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Description">
          <textarea className={inputClass + ' min-h-[60px]'} value={form.description} onChange={(e) => setField('description', e.target.value)} />
        </Field>
      </div>
    </div>
  )
}

// ─── Print helper — opens a print-ready window with product details ─
function printProductDetail(p: Product) {
  const stockQty = p.stock?.quantity ?? 0
  const w = window.open('', '_blank', 'width=720,height=900')
  if (!w) {
    toast.error('Could not open print window', { description: 'Please allow pop-ups for this site.' })
    return
  }
  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${p.sku} — Product Detail</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 0; padding: 32px; color: #142032; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 16px; border-bottom: 2px solid #0c389f; margin-bottom: 24px; }
        .brand { font-size: 18px; font-weight: 700; color: #0c389f; }
        .brand-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
        .doc-meta { text-align: right; font-size: 11px; color: #6b7280; }
        .doc-meta strong { color: #142032; font-size: 13px; }
        h1 { font-size: 22px; margin: 0 0 4px 0; }
        .sku { font-family: 'Menlo', monospace; font-size: 13px; color: #6b7280; margin-bottom: 24px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; margin-bottom: 24px; }
        .field { border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        .field-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px; }
        .field-value { font-size: 14px; font-weight: 500; }
        .field-value.mono { font-family: 'Menlo', monospace; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280; text-align: center; }
        @media print { body { padding: 16px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">Whirlpool Bangladesh</div>
          <div class="brand-sub">Warehouse Management System · Product Detail</div>
        </div>
        <div class="doc-meta">
          <strong>Product Detail</strong><br/>
          Printed: ${new Date().toLocaleString('en-GB')}
        </div>
      </div>
      <h1>${p.name}</h1>
      <div class="sku">SKU: ${p.sku}</div>
      <div class="grid">
        <div class="field"><div class="field-label">Category</div><div class="field-value">${p.category || '—'}</div></div>
        <div class="field"><div class="field-label">Unit</div><div class="field-value">${p.unit}</div></div>
        <div class="field"><div class="field-label">Barcode</div><div class="field-value mono">${p.barcode || '—'}</div></div>
        <div class="field"><div class="field-label">Status</div><div class="field-value">${p.isActive ? 'Active' : 'Inactive'}</div></div>
        <div class="field"><div class="field-label">Cost Price</div><div class="field-value mono">TK ${p.costPrice.toLocaleString('en-IN')}</div></div>
        <div class="field"><div class="field-label">Sale Price</div><div class="field-value mono">TK ${p.salePrice.toLocaleString('en-IN')}</div></div>
        <div class="field"><div class="field-label">Reorder Level</div><div class="field-value mono">${p.reorderLevel} ${p.unit}</div></div>
        <div class="field"><div class="field-label">Current Stock</div><div class="field-value mono">${stockQty} ${p.unit}</div></div>
        <div class="field"><div class="field-label">Stock Value (cost)</div><div class="field-value mono">TK ${(stockQty * p.costPrice).toLocaleString('en-IN')}</div></div>
        <div class="field"><div class="field-label">Stock Value (sale)</div><div class="field-value mono">TK ${(stockQty * p.salePrice).toLocaleString('en-IN')}</div></div>
      </div>
      ${p.description ? `<div class="field"><div class="field-label">Description</div><div class="field-value">${p.description}</div></div>` : ''}
      <div class="footer">
        Whirlpool Bangladesh · WMS · Generated ${new Date().toLocaleString('en-GB')}
      </div>
    </body>
    </html>
  `)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 250)
}
