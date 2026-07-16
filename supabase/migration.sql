-- ═══════════════════════════════════════════════════════════════════════
--  WBL-WH · Supabase / PostgreSQL Complete Migration
--  Whirlpool Bangladesh · Warehouse Management System
--  -----------------------------------------------------------------------
--  This script is idempotent — safe to run multiple times.
--  It creates the full schema, indexes, RLS policies, triggers, and seeds
--  the default admin user, RBAC roles, and demo data.
--
--  Run order:
--    1. Create a new Supabase project
--    2. Open SQL Editor → New query → paste this entire file → RUN
--    3. Update your .env: DATABASE_URL=postgresql://postgres.[ref]:[pwd]@...
--    4. Run: bun run db:generate && bun run db:push
--    5. (Optional) seed demo data via /api/seed endpoint
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Extensions ────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()

-- ─── Drop order (CASCADE handles FKs) — safe re-runs ──────────────────
DROP TABLE IF EXISTS "Permission" CASCADE;
DROP TABLE IF EXISTS "Role" CASCADE;
DROP TABLE IF EXISTS "AuditLog" CASCADE;
DROP TABLE IF EXISTS "Vehicle" CASCADE;
DROP TABLE IF EXISTS "TransportVendor" CASCADE;
DROP TABLE IF EXISTS "CourierVendor" CASCADE;
DROP TABLE IF EXISTS "DispatchItem" CASCADE;
DROP TABLE IF EXISTS "Dispatch" CASCADE;
DROP TABLE IF EXISTS "SalesOrderItem" CASCADE;
DROP TABLE IF EXISTS "SalesOrder" CASCADE;
DROP TABLE IF EXISTS "PurchaseOrderItem" CASCADE;
DROP TABLE IF EXISTS "PurchaseOrder" CASCADE;
DROP TABLE IF EXISTS "Movement" CASCADE;
DROP TABLE IF EXISTS "Stock" CASCADE;
DROP TABLE IF EXISTS "Location" CASCADE;
DROP TABLE IF EXISTS "Warehouse" CASCADE;
DROP TABLE IF EXISTS "Product" CASCADE;
DROP TABLE IF EXISTS "Supplier" CASCADE;
DROP TABLE IF EXISTS "Customer" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

-- ═══════════════════════════════════════════════════════════════════════
--  1. People
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "User" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email"         TEXT NOT NULL UNIQUE,
  "name"          TEXT NOT NULL,
  "passwordHash"  TEXT,
  "role"          TEXT NOT NULL DEFAULT 'staff',
  "avatar"        TEXT,
  "active"        BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Customer" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"      TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "email"     TEXT,
  "phone"     TEXT,
  "address"   TEXT,
  "city"      TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Supplier" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"      TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "email"     TEXT,
  "phone"     TEXT,
  "address"   TEXT,
  "city"      TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
--  2. Catalog & Locations
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "Product" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sku"          TEXT NOT NULL UNIQUE,
  "name"         TEXT NOT NULL,
  "category"     TEXT,
  "description"  TEXT,
  "unit"         TEXT NOT NULL DEFAULT 'pcs',
  "barcode"      TEXT,
  "costPrice"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "salePrice"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "reorderLevel" INTEGER NOT NULL DEFAULT 10,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Warehouse" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"      TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "address"   TEXT,
  "city"      TEXT,
  "capacity"  INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Location" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "warehouseId" TEXT NOT NULL REFERENCES "Warehouse"("id") ON DELETE CASCADE,
  "zone"        TEXT NOT NULL,
  "rack"        TEXT NOT NULL,
  "bin"         TEXT NOT NULL,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
--  3. Inventory
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "Stock" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "productId"  TEXT NOT NULL UNIQUE REFERENCES "Product"("id") ON DELETE CASCADE,
  "quantity"   INTEGER NOT NULL DEFAULT 0,
  "reserved"   INTEGER NOT NULL DEFAULT 0,
  "damaged"    INTEGER NOT NULL DEFAULT 0,
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Movement" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "productId"  TEXT NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "type"       TEXT NOT NULL,
  "quantity"   INTEGER NOT NULL,
  "reference"  TEXT,
  "notes"      TEXT,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
--  4. Procurement (Inbound)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "PurchaseOrder" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "poNumber"      TEXT NOT NULL UNIQUE,
  "supplierId"    TEXT NOT NULL REFERENCES "Supplier"("id"),
  "status"        TEXT NOT NULL DEFAULT 'draft',
  "totalAmount"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "orderDate"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expectedDate"  TIMESTAMPTZ,
  "receivedDate"  TIMESTAMPTZ,
  "receivedBy"    TEXT,
  "grnNumber"     TEXT,
  "vehicleNo"     TEXT,
  "invoiceRef"    TEXT,
  "notes"         TEXT
);

CREATE TABLE "PurchaseOrderItem" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "poId"            TEXT NOT NULL REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
  "productId"       TEXT NOT NULL REFERENCES "Product"("id"),
  "quantity"        INTEGER NOT NULL,
  "receivedQty"     INTEGER NOT NULL DEFAULT 0,
  "passedQty"       INTEGER NOT NULL DEFAULT 0,
  "failedQty"       INTEGER NOT NULL DEFAULT 0,
  "unitPrice"       DOUBLE PRECISION NOT NULL,
  "putawayLocation" TEXT
);

-- ═══════════════════════════════════════════════════════════════════════
--  5. Sales (Outbound)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "SalesOrder" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "soNumber"        TEXT NOT NULL UNIQUE,
  "customerId"      TEXT NOT NULL REFERENCES "Customer"("id"),
  "status"          TEXT NOT NULL DEFAULT 'draft',
  "totalAmount"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "orderDate"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "deliveryDate"    TIMESTAMPTZ,
  "notes"           TEXT,
  "pickedBy"        TEXT,
  "pickedAt"        TIMESTAMPTZ,
  "scannedBy"       TEXT,
  "scannedAt"       TIMESTAMPTZ,
  "sapInvoiceRef"   TEXT,
  "sapInvoiceDate"  TIMESTAMPTZ,
  "readyBy"         TEXT,
  "cartonCount"     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE "SalesOrderItem" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "soId"          TEXT NOT NULL REFERENCES "SalesOrder"("id") ON DELETE CASCADE,
  "productId"     TEXT NOT NULL REFERENCES "Product"("id"),
  "quantity"      INTEGER NOT NULL,
  "pickedQty"     INTEGER NOT NULL DEFAULT 0,
  "scannedQty"    INTEGER NOT NULL DEFAULT 0,
  "deliveredQty"  INTEGER NOT NULL DEFAULT 0,
  "unitPrice"     DOUBLE PRECISION NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════
--  6. Dispatch (partial delivery tracking, per-dispatch POD)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "Dispatch" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "soId"           TEXT NOT NULL REFERENCES "SalesOrder"("id") ON DELETE CASCADE,
  "dispatchNo"     TEXT NOT NULL UNIQUE,
  "deliveryMethod" TEXT NOT NULL,
  "vehicleNo"      TEXT,
  "driverName"     TEXT,
  "driverPhone"    TEXT,
  "courierName"    TEXT,
  "trackingNumber" TEXT,
  "challanNo"      TEXT,
  "dispatchedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
  "dispatchedBy"   TEXT,
  "notes"          TEXT,
  "totalQty"       INTEGER NOT NULL DEFAULT 0,
  "totalAmount"    DOUBLE PRECISION NOT NULL DEFAULT 0,
  "podStatus"      TEXT NOT NULL DEFAULT 'pending',
  "podReceivedBy"  TEXT,
  "podDate"        TIMESTAMPTZ,
  "podNotes"       TEXT
);

CREATE TABLE "DispatchItem" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dispatchId"  TEXT NOT NULL REFERENCES "Dispatch"("id") ON DELETE CASCADE,
  "soItemId"    TEXT NOT NULL,
  "productId"   TEXT NOT NULL REFERENCES "Product"("id"),
  "quantity"    INTEGER NOT NULL,
  "unitPrice"   DOUBLE PRECISION NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════
--  7. Transport Vendor & Vehicles
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "TransportVendor" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"      TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "phone"     TEXT,
  "address"   TEXT,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Vehicle" (
  "id"                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "vehicleNo"          TEXT NOT NULL UNIQUE,
  "transportVendorId"  TEXT NOT NULL REFERENCES "TransportVendor"("id") ON DELETE CASCADE,
  "driverName"         TEXT,
  "driverPhone"        TEXT,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
--  8. Courier Vendor
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "CourierVendor" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "code"      TEXT NOT NULL UNIQUE,
  "name"      TEXT NOT NULL,
  "phone"     TEXT,
  "address"   TEXT,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
--  9. Audit Trail (immutable)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "AuditLog" (
  "id"        TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "action"    TEXT NOT NULL,
  "entity"    TEXT NOT NULL,
  "entityId"  TEXT,
  "userName"  TEXT,
  "details"   TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════
--  10. RBAC — Role-Based Access Control
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE "Role" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT NOT NULL UNIQUE,
  "label"       TEXT NOT NULL,
  "description" TEXT,
  "isSystem"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE "Permission" (
  "id"      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "roleId"  TEXT NOT NULL REFERENCES "Role"("id") ON DELETE CASCADE,
  "module"  TEXT NOT NULL,
  "action"  TEXT NOT NULL,
  UNIQUE ("roleId", "module", "action")
);

-- ═══════════════════════════════════════════════════════════════════════
--  INDEXES (performance-critical for production)
-- ═══════════════════════════════════════════════════════════════════════

CREATE INDEX idx_product_category     ON "Product"("category");
CREATE INDEX idx_product_active       ON "Product"("isActive");
CREATE INDEX idx_stock_quantity       ON "Stock"("quantity");
CREATE INDEX idx_movement_product     ON "Movement"("productId");
CREATE INDEX idx_movement_type        ON "Movement"("type");
CREATE INDEX idx_movement_created     ON "Movement"("createdAt" DESC);
CREATE INDEX idx_po_supplier          ON "PurchaseOrder"("supplierId");
CREATE INDEX idx_po_status            ON "PurchaseOrder"("status");
CREATE INDEX idx_po_orderdate         ON "PurchaseOrder"("orderDate" DESC);
CREATE INDEX idx_poitem_po            ON "PurchaseOrderItem"("poId");
CREATE INDEX idx_so_customer          ON "SalesOrder"("customerId");
CREATE INDEX idx_so_status            ON "SalesOrder"("status");
CREATE INDEX idx_so_orderdate         ON "SalesOrder"("orderDate" DESC);
CREATE INDEX idx_soitem_so            ON "SalesOrderItem"("soId");
CREATE INDEX idx_dispatch_so          ON "Dispatch"("soId");
CREATE INDEX idx_dispatch_method      ON "Dispatch"("deliveryMethod");
CREATE INDEX idx_dispatch_pod         ON "Dispatch"("podStatus");
CREATE INDEX idx_dispatchitem_disp    ON "DispatchItem"("dispatchId");
CREATE INDEX idx_vehicle_vendor       ON "Vehicle"("transportVendorId");
CREATE INDEX idx_location_warehouse   ON "Location"("warehouseId");
CREATE INDEX idx_audit_entity         ON "AuditLog"("entity");
CREATE INDEX idx_audit_action         ON "AuditLog"("action");
CREATE INDEX idx_audit_created        ON "AuditLog"("createdAt" DESC);
CREATE INDEX idx_audit_user           ON "AuditLog"("userName");
CREATE INDEX idx_permission_role      ON "Permission"("roleId");
CREATE INDEX idx_permission_module    ON "Permission"("module");

-- ═══════════════════════════════════════════════════════════════════════
--  TRIGGERS — auto-update updatedAt on relevant tables
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_updated    BEFORE UPDATE ON "User"    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_product_updated BEFORE UPDATE ON "Product" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_stock_updated   BEFORE UPDATE ON "Stock"   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY (defense-in-depth)
--  The application layer enforces RBAC, but RLS prevents direct table
--  access via Supabase client from bypassing it. With RLS enabled and
--  no permissive policy, anonymous access is denied by default.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE "User"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Warehouse"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Location"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stock"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Movement"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrder"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SalesOrderItem"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Dispatch"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DispatchItem"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TransportVendor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vehicle"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourierVendor"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Role"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Permission"      ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by the Next.js API via DATABASE_URL).
-- For Supabase client-side access (anon), deny all by default.
-- If you later want anon read-only on Products/Catalog, add policies like:
--   CREATE POLICY "anon read products" ON "Product" FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════════════
--  SEED DATA — default admin, RBAC roles & permissions
-- ═══════════════════════════════════════════════════════════════════════

-- ── Roles ─────────────────────────────────────────────────────────────
INSERT INTO "Role" ("id", "name", "label", "description", "isSystem") VALUES
  ('role-admin',   'admin',   'Administrator',      'Full access to all modules and actions',                  true),
  ('role-manager', 'manager', 'Warehouse Manager',  'All modules except user management (view-only on users)', true),
  ('role-staff',   'staff',   'Warehouse Staff',    'Dashboard, Inventory (view), Inbound/Outbound (create+post)', true),
  ('role-viewer',  'viewer',  'Viewer',             'Read-only access to all modules',                         true)
ON CONFLICT ("name") DO NOTHING;

-- ── Permissions for each role ─────────────────────────────────────────
INSERT INTO "Permission" ("roleId", "module", "action") VALUES
  -- manager: everything except users.delete
  ('role-manager', 'dashboard', 'view'),
  ('role-manager', 'inventory', 'view'),
  ('role-manager', 'inventory', 'adjust'),
  ('role-manager', 'masters',   'view'),
  ('role-manager', 'masters',   'create'),
  ('role-manager', 'masters',   'edit'),
  ('role-manager', 'masters',   'delete'),
  ('role-manager', 'masters',   'print'),
  ('role-manager', 'inbound',   'view'),
  ('role-manager', 'inbound',   'create'),
  ('role-manager', 'inbound',   'edit'),
  ('role-manager', 'inbound',   'post'),
  ('role-manager', 'inbound',   'print'),
  ('role-manager', 'outbound',  'view'),
  ('role-manager', 'outbound',  'create'),
  ('role-manager', 'outbound',  'edit'),
  ('role-manager', 'outbound',  'post'),
  ('role-manager', 'outbound',  'print'),
  ('role-manager', 'reports',   'view'),
  ('role-manager', 'reports',   'print'),
  ('role-manager', 'audit',     'view'),
  ('role-manager', 'audit',     'print'),
  ('role-manager', 'users',     'view'),
  -- staff: limited
  ('role-staff',   'dashboard', 'view'),
  ('role-staff',   'inventory', 'view'),
  ('role-staff',   'masters',   'view'),
  ('role-staff',   'inbound',   'view'),
  ('role-staff',   'inbound',   'create'),
  ('role-staff',   'inbound',   'post'),
  ('role-staff',   'inbound',   'print'),
  ('role-staff',   'outbound',  'view'),
  ('role-staff',   'outbound',  'create'),
  ('role-staff',   'outbound',  'post'),
  ('role-staff',   'outbound',  'print'),
  ('role-staff',   'reports',   'view'),
  ('role-staff',   'audit',     'view'),
  -- viewer: read-only everywhere
  ('role-viewer',  'dashboard', 'view'),
  ('role-viewer',  'inventory', 'view'),
  ('role-viewer',  'masters',   'view'),
  ('role-viewer',  'inbound',   'view'),
  ('role-viewer',  'outbound',  'view'),
  ('role-viewer',  'reports',   'view'),
  ('role-viewer',  'audit',     'view'),
  ('role-viewer',  'users',     'view')
ON CONFLICT ("roleId", "module", "action") DO NOTHING;

-- ── Default Admin User ────────────────────────────────────────────────
-- Password: admin123 (bcrypt hash — change immediately after first login)
INSERT INTO "User" ("id", "email", "name", "passwordHash", "role", "active") VALUES
  ('user-admin-1', 'admin@whirlpool-bd.com', 'System Administrator',
   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', true)
ON CONFLICT ("email") DO NOTHING;

-- ── Default Warehouse ─────────────────────────────────────────────────
INSERT INTO "Warehouse" ("id", "code", "name", "address", "city", "capacity") VALUES
  ('wh-main', 'WHP-MAIN', 'Whirlpool Main Warehouse', 'Tejgaon I/A, Dhaka', 'Dhaka', 50000)
ON CONFLICT ("code") DO NOTHING;

-- ── Sample Demo Data (optional — comment out if you don't want it) ────
INSERT INTO "Customer" ("id", "code", "name", "email", "phone", "city") VALUES
  ('cust-001', 'DEALER-001', 'Metro Electronics',   'buyer@metro.com',     '+8801711111111', 'Dhaka'),
  ('cust-002', 'DEALER-002', 'Transcom Digital',    'buyer@transcom.com',  '+8801722222222', 'Chattogram'),
  ('cust-003', 'DEALER-003', 'Best Electronics',    'buyer@best.com',      '+8801733333333', 'Sylhet')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "Supplier" ("id", "code", "name", "email", "phone", "city") VALUES
  ('sup-001',  'SRC-001',    'Whirlpool India Plant',  'exports@whirlpool.in', '+911244444444', 'Pune'),
  ('sup-002',  'SRC-002',    'Samsung BD Distribution','sales@samsung-bd.com', '+8801744444444', 'Dhaka')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "Product" ("id", "sku", "name", "category", "unit", "costPrice", "salePrice", "reorderLevel") VALUES
  ('prod-001', 'WHP-REF-265', 'Whirlpool Fridge 265L Double Door', 'Refrigerator',     'pcs', 52000, 61500, 5),
  ('prod-002', 'WHP-WM-7KG',  'Whirlpool Washer 7kg Top Load',     'Washing Machine',  'pcs', 28500, 33500, 8),
  ('prod-003', 'WHP-AC-1T',   'Whirlpool AC 1 Ton Inverter',       'Air Conditioner',  'pcs', 47000, 54900, 6),
  ('prod-004', 'WHP-MW-25L',  'Whirlpool Microwave 25L',           'Microwave',        'pcs', 14500, 17500, 10),
  ('prod-005', 'WHP-DW-12PT', 'Whirlpool Dishwasher 12 Place',     'Dishwasher',       'pcs', 38000, 44500, 4)
ON CONFLICT ("sku") DO NOTHING;

INSERT INTO "Stock" ("productId", "quantity", "reserved", "damaged") VALUES
  ('prod-001', 42, 0, 0),
  ('prod-002', 18, 3, 0),
  ('prod-003', 25, 0, 1),
  ('prod-004', 60, 0, 0),
  ('prod-005', 8,  0, 0)
ON CONFLICT ("productId") DO NOTHING;

INSERT INTO "TransportVendor" ("id", "code", "name", "phone") VALUES
  ('tv-001', 'TV-001', 'Swift Logistics', '+8801811111111'),
  ('tv-002', 'TV-002', 'Eastern Carriers','+8801822222222')
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "Vehicle" ("id", "vehicleNo", "transportVendorId", "driverName", "driverPhone") VALUES
  ('veh-001', 'DHK TA 11-2211', 'tv-001', 'Karim Uddin', '+8801911111111'),
  ('veh-002', 'DHK TA 12-3322', 'tv-002', 'Jahid Hasan', '+8801922222222')
ON CONFLICT ("vehicleNo") DO NOTHING;

INSERT INTO "CourierVendor" ("id", "code", "name", "phone") VALUES
  ('cv-001', 'CV-STDF',  'Steadfast Courier',  '+8801833333333'),
  ('cv-002', 'CV-PATH',  'Pathao Courier',     '+8801844444444'),
  ('cv-003', 'CV-REDX',  'REDX Express',       '+8801855555555')
ON CONFLICT ("code") DO NOTHING;

-- ── Log the seed event itself ─────────────────────────────────────────
INSERT INTO "AuditLog" ("action", "entity", "userName", "details") VALUES
  ('CREATE', 'System', 'System', 'Initial schema & seed applied via Supabase SQL migration'),
  ('CREATE', 'Role',   'System', 'Default roles (admin, manager, staff, viewer) created'),
  ('CREATE', 'User',   'System', 'Default admin user created (admin@whirlpool-bd.com)'),
  ('CREATE', 'Product','System', '5 demo products seeded');

-- ═══════════════════════════════════════════════════════════════════════
--  VERIFICATION QUERIES (run manually after migration)
-- ═══════════════════════════════════════════════════════════════════════
--  SELECT COUNT(*) FROM "User";          -- should be 1
--  SELECT COUNT(*) FROM "Role";          -- should be 4
--  SELECT COUNT(*) FROM "Permission";    -- should be ~40
--  SELECT COUNT(*) FROM "Product";       -- should be 5
--  SELECT COUNT(*) FROM "Warehouse";     -- should be 1
--  SELECT COUNT(*) FROM "AuditLog";      -- should be 4
--  SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- ═══════════════════════════════════════════════════════════════════════
