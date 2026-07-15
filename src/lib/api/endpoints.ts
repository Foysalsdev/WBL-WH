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
}

// ─── Customers ───────────────────────────────────────────────────
export const customersApi = {
  list: () => api.get<unknown[]>('/api/customers').then((arr) => arr.map((c) => safeParse<Customer>(CustomerSchema, c, 'customer'))),
  create: (input: CustomerInput) =>
    api.post<unknown>('/api/customers', input).then((c) => safeParse<Customer>(CustomerSchema, c, 'customer')),
}

// ─── Suppliers ───────────────────────────────────────────────────
export const suppliersApi = {
  list: () => api.get<unknown[]>('/api/suppliers').then((arr) => arr.map((s) => safeParse<Supplier>(SupplierSchema, s, 'supplier'))),
  create: (input: SupplierInput) =>
    api.post<unknown>('/api/suppliers', input).then((s) => safeParse<Supplier>(SupplierSchema, s, 'supplier')),
}

// ─── Warehouses ──────────────────────────────────────────────────
export const warehousesApi = {
  list: () => api.get<unknown[]>('/api/warehouses').then((arr) => arr.map((w) => safeParse<Warehouse>(WarehouseSchema, w, 'warehouse'))),
  create: (input: WarehouseInput) =>
    api.post<unknown>('/api/warehouses', input).then((w) => safeParse<Warehouse>(WarehouseSchema, w, 'warehouse')),
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

// ─── System ──────────────────────────────────────────────────────
export const systemApi = {
  reseed: () => api.post<{ ok: boolean; message?: string; error?: string }>('/api/seed'),
}
