'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Boxes, Plus } from 'lucide-react'
import { StatCard } from '@/components/system'
import { DataTable, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { CreateDialog } from '@/components/system/create-dialog'
import { Field } from '@/components/system/forms'
import { Badge } from '@/components/ui/badge'
import { productsApi } from '@/lib/api/endpoints'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { inputClass } from '@/lib/styles'
import { toast } from 'sonner'
import { bdt, num } from '@/lib/format'
import type { Product, ProductInput } from '@/domain/schemas'

// ═══════════════════════════════════════════════════════════════
//  ProductsTab — Whirlpool appliance catalog CRUD
// ═══════════════════════════════════════════════════════════════

const EMPTY_FORM: ProductInput = {
  sku: '', name: '', category: '', description: '',
  unit: 'pcs', barcode: '',
  costPrice: 0, salePrice: 0, reorderLevel: 10, isActive: true,
  stockQuantity: 0,
}

export function ProductsTab() {
  const [open, setOpen] = useState(false)
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

  async function submit() {
    if (!form.sku || !form.name) {
      toast.error('SKU and name are required')
      return
    }
    try {
      const p = await createMutation.mutateAsync(form)
      toast.success('Product created', { description: `${p.sku} · ${p.name}` })
      setOpen(false)
      setForm(EMPTY_FORM)
    } catch (e: any) {
      toast.error('Failed to create product', { description: e.message })
    }
  }

  const columns: Column<Product>[] = [
    { key: 'sku', header: 'SKU', cell: (p) => <span className="font-mono text-xs">{p.sku}</span>, sort: (a, b) => a.sku.localeCompare(b.sku) },
    { key: 'name', header: 'Name', cell: (p) => <span className="font-medium">{p.name}</span>, sort: (a, b) => a.name.localeCompare(b.name) },
    { key: 'category', header: 'Category', cell: (p) => <span className="text-xs text-muted-foreground">{p.category || '—'}</span>, sort: (a, b) => (a.category || '').localeCompare(b.category || '') },
    { key: 'unit', header: 'Unit', cell: (p) => <span className="text-xs">{p.unit}</span> },
    { key: 'costPrice', header: 'Cost', align: 'right', cell: (p) => <span className="tabular-nums">{bdt(p.costPrice)}</span>, sort: (a, b) => a.costPrice - b.costPrice },
    { key: 'salePrice', header: 'Sale', align: 'right', cell: (p) => <span className="tabular-nums">{bdt(p.salePrice)}</span>, sort: (a, b) => a.salePrice - b.salePrice },
    { key: 'reorderLevel', header: 'Reorder', align: 'right', cell: (p) => <span className="tabular-nums">{p.reorderLevel}</span> },
    { key: 'stock', header: 'Stock', align: 'right', cell: (p) => <span className="tabular-nums font-medium">{num(p.stock?.quantity || 0)}</span> },
    { key: 'status', header: 'Status', align: 'center', cell: (p) => p.isActive
      ? <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">Active</Badge>
      : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge> },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total SKUs" value={num(stats.count)} icon={Boxes} />
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
        primaryAction={{ label: 'New product', icon: Plus, onClick: () => setOpen(true) }}
      >
        <DataTable
          data={data || []}
          columns={columns}
          rowKey={(p) => p.id}
          initialSortKey="sku"
        />
      </MasterTabShell>

      <CreateDialog
        open={open}
        onOpenChange={setOpen}
        title="New Product"
        description="Create a new Whirlpool appliance SKU. Optionally set opening stock."
        onSubmit={submit}
        submitLabel={createMutation.isPending ? 'Creating…' : 'Create product'}
        disabled={createMutation.isPending}
        maxWidth="max-w-2xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" required>
            <input
              className={inputClass}
              value={form.sku}
              onChange={(e) => setField('sku', e.target.value)}
              placeholder="WHP-REF-265L-IM"
            />
          </Field>
          <Field label="Name" required>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Whirlpool Protton 265L Refrigerator"
            />
          </Field>
          <Field label="Category">
            <input
              className={inputClass}
              value={form.category}
              onChange={(e) => setField('category', e.target.value)}
              placeholder="Refrigerator"
            />
          </Field>
          <Field label="Unit">
            <input
              className={inputClass}
              value={form.unit}
              onChange={(e) => setField('unit', e.target.value)}
              placeholder="pcs"
            />
          </Field>
          <Field label="Cost price (৳)">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.costPrice}
              onChange={(e) => setField('costPrice', Number(e.target.value))}
            />
          </Field>
          <Field label="Sale price (৳)">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.salePrice}
              onChange={(e) => setField('salePrice', Number(e.target.value))}
            />
          </Field>
          <Field label="Reorder level">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.reorderLevel}
              onChange={(e) => setField('reorderLevel', Number(e.target.value))}
            />
          </Field>
          <Field label="Opening stock qty" hint="Creates a stock record + opening-balance movement">
            <input
              type="number"
              min="0"
              className={inputClass}
              value={form.stockQuantity}
              onChange={(e) => setField('stockQuantity', Number(e.target.value))}
            />
          </Field>
        </div>
      </CreateDialog>
    </div>
  )
}
