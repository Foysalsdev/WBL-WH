// ═══════════════════════════════════════════════════════════════
//  API endpoints — typed functions returning validated domain data
// ═══════════════════════════════════════════════════════════════

import { api } from './client'
import {
  DashboardData as DashboardDataSchema, type DashboardData,
  Product as ProductSchema, type Product, type ProductInput,
  Customer as CustomerSchema, type Customer, type CustomerInput,
  Supplier as SupplierSchema, type Supplier, type SupplierInput,
  Warehouse as WarehouseSchema, type Warehouse, type WarehouseInput,
  Movement as MovementSchema, type Movement,
  InventoryItem as InventoryItemSchema, type InventoryItem, type StockAdjustmentInput,
  PurchaseOrder as PurchaseOrderSchema, type PurchaseOrder,
  AuditLog as AuditLogSchema, type AuditLog,
} from '@/domain/schemas'
import type { ZodTypeAny } from 'zod'

/**
 * Safe-parse helper: if Zod validation fails, log a warning and fall back to
 * the raw value. This prevents one bad row from breaking the whole UI.
 */
function safeParse<T>(schema: ZodTypeAny, raw: unknown, label: string): T {
  const r = schema.safeParse(raw)
  if (r.success) return r.data as T
  if (typeof window !== 'undefined') {
    console.warn(`[${label}] schema validation failed, using raw data:`, r.error.issues.slice(0, 2))
  }
  return raw as T
}

// ─── Dashboard ───────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get<unknown>('/api/dashboard').then((d) => safeParse<DashboardData>(DashboardDataSchema, d, 'dashboard')),
}

// ─── Products ────────────────────────────────────────────────────
export const productsApi = {
  list: (search?: string) =>
    api.get<unknown[]>(`/api/products${search ? `?search=${encodeURIComponent(search)}` : ''}`)
       .then((arr) => arr.map((p) => safeParse<Product>(ProductSchema, p, 'product'))),
  create: (input: ProductInput) =>
    api.post<unknown>('/api/products', input).then((p) => safeParse<Product>(ProductSchema, p, 'product')),
  update: (id: string, input: Partial<ProductInput>) =>
    api.patch<unknown>(`/api/products/${id}`, input).then((p) => safeParse<Product>(ProductSchema, p, 'product')),
  delete: (id: string) =>
    api.delete<{ ok: boolean; error?: string }>(`/api/products/${id}`),
}

// ─── Customers ───────────────────────────────────────────────────
export const customersApi = {
  list: () => api.get<unknown[]>('/api/customers').then((arr) => arr.map((c) => safeParse<Customer>(CustomerSchema, c, 'customer'))),
  create: (input: CustomerInput) =>
    api.post<unknown>('/api/customers', input).then((c) => safeParse<Customer>(CustomerSchema, c, 'customer')),
  update: (id: string, input: Partial<CustomerInput>) =>
    api.patch<unknown>(`/api/customers/${id}`, input).then((c) => safeParse<Customer>(CustomerSchema, c, 'customer')),
  delete: (id: string) =>
    api.delete<{ ok: boolean; error?: string }>(`/api/customers/${id}`),
}

// ─── Suppliers ───────────────────────────────────────────────────
export const suppliersApi = {
  list: () => api.get<unknown[]>('/api/suppliers').then((arr) => arr.map((s) => safeParse<Supplier>(SupplierSchema, s, 'supplier'))),
  create: (input: SupplierInput) =>
    api.post<unknown>('/api/suppliers', input).then((s) => safeParse<Supplier>(SupplierSchema, s, 'supplier')),
  update: (id: string, input: Partial<SupplierInput>) =>
    api.patch<unknown>(`/api/suppliers/${id}`, input).then((s) => safeParse<Supplier>(SupplierSchema, s, 'supplier')),
  delete: (id: string) =>
    api.delete<{ ok: boolean; error?: string }>(`/api/suppliers/${id}`),
}

// ─── Warehouses ──────────────────────────────────────────────────
export const warehousesApi = {
  list: () => api.get<unknown[]>('/api/warehouses').then((arr) => arr.map((w) => safeParse<Warehouse>(WarehouseSchema, w, 'warehouse'))),
  create: (input: WarehouseInput) =>
    api.post<unknown>('/api/warehouses', input).then((w) => safeParse<Warehouse>(WarehouseSchema, w, 'warehouse')),
  update: (id: string, input: Partial<WarehouseInput>) =>
    api.patch<unknown>(`/api/warehouses/${id}`, input).then((w) => safeParse<Warehouse>(WarehouseSchema, w, 'warehouse')),
  delete: (id: string) =>
    api.delete<{ ok: boolean; error?: string }>(`/api/warehouses/${id}`),
}

// ─── Movements ───────────────────────────────────────────────────
export const movementsApi = {
  list: (opts?: { limit?: number; productId?: string; type?: string }) => {
    const params = new URLSearchParams()
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.productId) params.set('productId', opts.productId)
    if (opts?.type) params.set('type', opts.type)
    const q = params.toString()
    return api.get<unknown[]>(`/api/movements${q ? `?${q}` : ''}`)
      .then((arr) => arr.map((m) => safeParse(MovementSchema, m, 'movement')))
  },
}

// ─── Inventory ───────────────────────────────────────────────────
export const inventoryApi = {
  list: (opts?: { search?: string; low?: boolean }) => {
    const params = new URLSearchParams()
    if (opts?.search) params.set('search', opts.search)
    if (opts?.low) params.set('low', '1')
    const q = params.toString()
    return api.get<unknown[]>(`/api/inventory${q ? `?${q}` : ''}`)
      .then((arr) => arr.map((i) => safeParse(InventoryItemSchema, i, 'inventory-item') as InventoryItem))
  },
  adjust: (input: StockAdjustmentInput) =>
    api.post<{ ok: boolean; movement: unknown; newQuantity: number }>('/api/inventory', input),
}

// ─── Audit logs ──────────────────────────────────────────────────
export const auditApi = {
  list: () => api.get<unknown[]>('/api/audit-logs').then((arr) => arr.map((a) => AuditLogSchema.parse(a) as AuditLog)),
}

// ─── Purchase Orders (Inbound) ───────────────────────────────────
export const purchaseOrdersApi = {
  list: () => api.get<unknown[]>('/api/purchase-orders')
    .then((arr) => arr.map((p) => safeParse<PurchaseOrder>(PurchaseOrderSchema, p, 'purchase-order'))),
  create: (input: {
    supplierId: string
    orderDate?: string
    expectedDate?: string
    notes?: string
    items: { productId: string; quantity: number; unitPrice: number }[]
  }) => api.post<unknown>('/api/purchase-orders', input)
    .then((p) => safeParse<PurchaseOrder>(PurchaseOrderSchema, p, 'purchase-order')),
  patch: (id: string, body: { action: 'status' | 'receive'; [k: string]: unknown }) =>
    api.patch<{ ok?: boolean; status?: string; grnNumber?: string; error?: string }>(`/api/purchase-orders`, { id, ...body }),
}

// ─── System ──────────────────────────────────────────────────────
export const systemApi = {
  reseed: () => api.post<{ ok: boolean; message?: string; error?: string }>('/api/seed'),
}
