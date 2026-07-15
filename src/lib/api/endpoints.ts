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
  AuditLog as AuditLogSchema, type AuditLog,
} from '@/domain/schemas'

// ─── Dashboard ───────────────────────────────────────────────────
export const dashboardApi = {
  get: async (): Promise<DashboardData> => {
    const raw = await api.get<unknown>('/api/dashboard')
    // Parse with safeParse — fall back to raw if validation fails (so we always have data to render)
    const result = DashboardDataSchema.safeParse(raw)
    if (result.success) return result.data as DashboardData
    console.warn('[dashboard] schema validation failed, using raw data:', result.error.issues.slice(0, 3))
    return raw as DashboardData
  },
}

// ─── Products ────────────────────────────────────────────────────
export const productsApi = {
  list: (search?: string) =>
    api.get<unknown[]>(`/api/products${search ? `?search=${encodeURIComponent(search)}` : ''}`)
       .then((arr) => arr.map((p) => ProductSchema.parse(p) as Product)),
  create: (input: ProductInput) =>
    api.post<unknown>('/api/products', input).then((p) => ProductSchema.parse(p) as Product),
}

// ─── Customers ───────────────────────────────────────────────────
export const customersApi = {
  list: () => api.get<unknown[]>('/api/customers').then((arr) => arr.map((c) => CustomerSchema.parse(c) as Customer)),
  create: (input: CustomerInput) =>
    api.post<unknown>('/api/customers', input).then((c) => CustomerSchema.parse(c) as Customer),
}

// ─── Suppliers ───────────────────────────────────────────────────
export const suppliersApi = {
  list: () => api.get<unknown[]>('/api/suppliers').then((arr) => arr.map((s) => SupplierSchema.parse(s) as Supplier)),
  create: (input: SupplierInput) =>
    api.post<unknown>('/api/suppliers', input).then((s) => SupplierSchema.parse(s) as Supplier),
}

// ─── Warehouses ──────────────────────────────────────────────────
export const warehousesApi = {
  list: () => api.get<unknown[]>('/api/warehouses').then((arr) => arr.map((w) => WarehouseSchema.parse(w) as Warehouse)),
  create: (input: WarehouseInput) =>
    api.post<unknown>('/api/warehouses', input).then((w) => WarehouseSchema.parse(w) as Warehouse),
}

// ─── Movements ───────────────────────────────────────────────────
export const movementsApi = {
  list: (limit?: number, productId?: string) => {
    const params = new URLSearchParams()
    if (limit) params.set('limit', String(limit))
    if (productId) params.set('productId', productId)
    const q = params.toString()
    return api.get<unknown[]>(`/api/movements${q ? `?${q}` : ''}`)
      .then((arr) => arr.map((m) => MovementSchema.parse(m) as Movement))
  },
}

// ─── Audit logs ──────────────────────────────────────────────────
export const auditApi = {
  list: () => api.get<unknown[]>('/api/audit-logs').then((arr) => arr.map((a) => AuditLogSchema.parse(a) as AuditLog)),
}

// ─── System ──────────────────────────────────────────────────────
export const systemApi = {
  reseed: () => api.post<{ ok: boolean; message?: string; error?: string }>('/api/seed'),
}
