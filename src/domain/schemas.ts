// ═══════════════════════════════════════════════════════════════
//  Domain Layer — single source of truth for all entity shapes
//  Validated with Zod, typed with TypeScript
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod'

// ─── Primitive schemas ───────────────────────────────────────────
export const Id = z.string().min(1)
export const Code = z.string().min(1).max(32)
export const Email = z.string().email().nullable().optional()
export const Phone = z.string().max(32).nullable().optional()

// ─── User ────────────────────────────────────────────────────────
export const UserRole = z.enum(['admin', 'manager', 'staff'])
export type UserRole = z.infer<typeof UserRole>

export const User = z.object({
  id: Id,
  email: z.string().email(),
  name: z.string(),
  role: UserRole,
  avatar: z.string().nullable().optional(),
  active: z.boolean().default(true),
  createdAt: z.coerce.date(),
})
export type User = z.infer<typeof User>

// ─── Customer (Dealer) ───────────────────────────────────────────
export const Customer = z.object({
  id: Id,
  code: Code,
  name: z.string().min(1),
  email: Email,
  phone: Phone,
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
})
export type Customer = z.infer<typeof Customer>

export const CustomerInput = Customer.omit({ id: true, createdAt: true })
export type CustomerInput = z.infer<typeof CustomerInput>

// ─── Supplier (Sourcing Partner) ─────────────────────────────────
export const Supplier = z.object({
  id: Id,
  code: Code,
  name: z.string().min(1),
  email: Email,
  phone: Phone,
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
})
export type Supplier = z.infer<typeof Supplier>

export const SupplierInput = Supplier.omit({ id: true, createdAt: true })
export type SupplierInput = z.infer<typeof SupplierInput>

// ─── Product ─────────────────────────────────────────────────────
export const Product = z.object({
  id: Id,
  sku: Code,
  name: z.string().min(1),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  unit: z.string().default('pcs'),
  barcode: z.string().nullable().optional(),
  costPrice: z.number().min(0),
  salePrice: z.number().min(0),
  reorderLevel: z.number().int().min(0).default(10),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  // joined
  stock: z.object({
    quantity: z.number(),
    reserved: z.number(),
    damaged: z.number(),
  }).nullable().optional(),
})
export type Product = z.infer<typeof Product>

export const ProductInput = Product.omit({
  id: true, createdAt: true, updatedAt: true, stock: true,
}).extend({
  stockQuantity: z.number().int().min(0).optional(),
})
export type ProductInput = z.infer<typeof ProductInput>

// ─── Warehouse & Location ────────────────────────────────────────
export const Warehouse = z.object({
  id: Id,
  code: Code,
  name: z.string().min(1),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  capacity: z.number().int().min(0),
  createdAt: z.coerce.date(),
  locations: z.array(z.object({
    id: Id, zone: z.string(), rack: z.string(), bin: z.string(),
  })).optional(),
})
export type Warehouse = z.infer<typeof Warehouse>

export const WarehouseInput = Warehouse.omit({ id: true, createdAt: true, locations: true })
export type WarehouseInput = z.infer<typeof WarehouseInput>

// ─── Stock & Movements ───────────────────────────────────────────
export const MovementType = z.enum(['IN', 'OUT', 'ADJUST', 'TRANSFER'])
export type MovementType = z.infer<typeof MovementType>

export const Movement = z.object({
  id: Id,
  productId: Id.optional(),
  type: MovementType,
  quantity: z.number().int(),
  reference: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  product: z.object({
    sku: z.string(), name: z.string(),
  }).optional(),
})
export type Movement = z.infer<typeof Movement>

// ─── Purchase Order (Inbound) ────────────────────────────────────
export const POStatus = z.enum(['draft', 'ordered', 'partial', 'received', 'cancelled'])
export type POStatus = z.infer<typeof POStatus>

export const PurchaseOrderItem = z.object({
  id: Id,
  productId: Id,
  quantity: z.number().int().min(1),
  receivedQty: z.number().int().min(0).default(0),
  passedQty: z.number().int().min(0).default(0),
  failedQty: z.number().int().min(0).default(0),
  unitPrice: z.number().min(0),
  putawayLocation: z.string().nullable().optional(),
  product: z.object({
    sku: z.string(), name: z.string(),
  }).optional(),
})
export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItem>

export const PurchaseOrder = z.object({
  id: Id,
  poNumber: z.string(),
  supplierId: Id,
  status: POStatus,
  totalAmount: z.number(),
  orderDate: z.coerce.date(),
  expectedDate: z.coerce.date().nullable().optional(),
  receivedDate: z.coerce.date().nullable().optional(),
  receivedBy: z.string().nullable().optional(),
  grnNumber: z.string().nullable().optional(),
  vehicleNo: z.string().nullable().optional(),
  invoiceRef: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  supplier: z.object({
    id: Id, code: z.string(), name: z.string(),
  }).optional(),
  items: z.array(PurchaseOrderItem).optional(),
})
export type PurchaseOrder = z.infer<typeof PurchaseOrder>

// ─── Sales Order (Outbound) ──────────────────────────────────────
export const SOStatus = z.enum(['draft', 'confirmed', 'picked', 'packed', 'shipped', 'delivered', 'cancelled'])
export type SOStatus = z.infer<typeof SOStatus>

export const PODStatus = z.enum(['pending', 'confirmed', 'failed', 'rescheduled'])
export type PODStatus = z.infer<typeof PODStatus>

export const SalesOrderItem = z.object({
  id: Id,
  productId: Id,
  quantity: z.number().int().min(1),
  pickedQty: z.number().int().min(0).default(0),
  unitPrice: z.number().min(0),
  product: z.object({
    sku: z.string(), name: z.string(),
  }).optional(),
})
export type SalesOrderItem = z.infer<typeof SalesOrderItem>

export const SalesOrder = z.object({
  id: Id,
  soNumber: z.string(),
  customerId: Id,
  status: SOStatus,
  totalAmount: z.number(),
  orderDate: z.coerce.date(),
  deliveryDate: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
  pickedBy: z.string().nullable().optional(),
  pickedAt: z.coerce.date().nullable().optional(),
  packedBy: z.string().nullable().optional(),
  packedAt: z.coerce.date().nullable().optional(),
  cartonCount: z.number().int().default(0),
  challanNo: z.string().nullable().optional(),
  vehicleNo: z.string().nullable().optional(),
  driverName: z.string().nullable().optional(),
  driverPhone: z.string().nullable().optional(),
  shippedAt: z.coerce.date().nullable().optional(),
  podStatus: PODStatus.nullable().optional(),
  podReceivedBy: z.string().nullable().optional(),
  podDate: z.coerce.date().nullable().optional(),
  podNotes: z.string().nullable().optional(),
  customer: z.object({
    id: Id, code: z.string(), name: z.string(), city: z.string().nullable().optional(),
  }).optional(),
  items: z.array(SalesOrderItem).optional(),
})
export type SalesOrder = z.infer<typeof SalesOrder>

// ─── Audit Log ───────────────────────────────────────────────────
export const AuditAction = z.enum(['CREATE', 'UPDATE', 'DELETE', 'POST', 'CONFIRM', 'ADJUST'])
export type AuditAction = z.infer<typeof AuditAction>

export const AuditLog = z.object({
  id: Id,
  action: AuditAction,
  entity: z.string(),
  entityId: z.string().nullable().optional(),
  userName: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
})
export type AuditLog = z.infer<typeof AuditLog>

// ─── Dashboard payload ───────────────────────────────────────────
export const DashboardKPI = z.object({
  products: z.number(),
  customers: z.number(),
  suppliers: z.number(),
  warehouses: z.number(),
  totalUnits: z.number(),
  totalValue: z.number(),
  damagedUnits: z.number(),
  reservedUnits: z.number(),
  lowStockCount: z.number(),
  totalSales: z.number(),
  totalPurchase: z.number(),
  openPOs: z.number(),
  openSOs: z.number(),
})
export type DashboardKPI = z.infer<typeof DashboardKPI>

export const DashboardData = z.object({
  kpi: DashboardKPI,
  charts: z.object({
    byCategory: z.array(z.object({ name: z.string(), units: z.number(), value: z.number() })),
    trend: z.array(z.object({ date: z.string(), in: z.number(), out: z.number() })),
    poByStatus: z.array(z.object({ status: z.string(), count: z.number() })),
    soByStatus: z.array(z.object({ status: z.string(), count: z.number() })),
  }),
  recent: z.object({
    movements: z.array(Movement),
    audit: z.array(AuditLog),
  }),
  lowStock: z.array(z.object({
    id: Id, sku: z.string(), name: z.string(), onHand: z.number(), reorderLevel: z.number(),
  })),
})
export type DashboardData = z.infer<typeof DashboardData>
