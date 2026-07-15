'use client'

import { useState } from 'react'
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
//  ProductsTab — Whirlpool appliance catalog CRUD
//  Now with: clickable SKU → View dialog, row action menu
//  (View/Edit/Print/Delete), proper visual hierarchy.
// ═══════════════════════════════════════════════════════════════

const EMPTY_FORM: ProductInput = {
  sku: '', name: '', category: '', description: '',
  unit: 'pcs', barcode: '',
  costPrice: 0, salePrice: 0, reorderLevel: 10, isActive: true,
  stockQuantity: 0,
}

export function ProductsTab() {
  const [createOpen, setCreateOpen] = useState(false)
  const [viewItem, setViewItem] = useState<Product | null>(null)
  const [editItem, setEditItem] = useState<Product | null>(null)
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

  function handlePrint(p: Product) {
    toast.info('Print preview', { description: `Generating PDF for ${p.sku}…` })
    // In production: window.open(`/api/products/${p.id}/print`, '_blank')
  }

  async function handleDelete() {
    if (!deleteItem) return
    // For now, soft-fail with a toast — real delete API comes in a later phase
    toast.info('Delete coming soon', {
      description: `Delete for ${deleteItem.sku} will be wired in Phase 7 (Audit & hardening).`,
    })
    setDeleteItem(null)
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
          onEdit={() => { toast.info('Edit coming soon', { description: `Edit for ${p.sku} will be wired in a later phase.` }) }}
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
          <Field label="Cost price (TK)">
            <input type="number" min="0" className={inputClass} value={form.costPrice} onChange={(e) => setField('costPrice', Number(e.target.value))} />
          </Field>
          <Field label="Sale price (TK)">
            <input type="number" min="0" className={inputClass} value={form.salePrice} onChange={(e) => setField('salePrice', Number(e.target.value))} />
          </Field>
          <Field label="Reorder level">
            <input type="number" min="0" className={inputClass} value={form.reorderLevel} onChange={(e) => setField('reorderLevel', Number(e.target.value))} />
          </Field>
          <Field label="Opening stock qty" hint="Creates a stock record + opening-balance movement">
            <input type="number" min="0" className={inputClass} value={form.stockQuantity} onChange={(e) => setField('stockQuantity', Number(e.target.value))} />
          </Field>
        </div>
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
        onEdit={() => { toast.info('Edit coming soon'); setViewItem(null) }}
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
