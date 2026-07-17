-- ═══════════════════════════════════════════════════════════════════════
--  WBL-WH · Supabase RLS Policies
--  Run AFTER migration.sql to add proper row-level security policies.
--
--  Strategy:
--  - Service role (used by Next.js API via DATABASE_URL): bypasses RLS
--  - Anon/authenticated: deny all by default (app handles auth)
--  - If you later want client-side Supabase access, add policies here
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Make sure RLS is enabled on ALL tables ──────────────────────
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
ALTER TABLE "Requisition"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashIn"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense"         ENABLE ROW LEVEL SECURITY;

-- ─── Drop existing policies (for re-runs) ──────────────────────
DROP POLICY IF EXISTS "anon deny all User" ON "User";
DROP POLICY IF EXISTS "anon deny all Customer" ON "Customer";
DROP POLICY IF EXISTS "anon deny all Supplier" ON "Supplier";
DROP POLICY IF EXISTS "anon deny all Product" ON "Product";
DROP POLICY IF EXISTS "anon deny all Warehouse" ON "Warehouse";
DROP POLICY IF EXISTS "anon deny all Location" ON "Location";
DROP POLICY IF EXISTS "anon deny all Stock" ON "Stock";
DROP POLICY IF EXISTS "anon deny all Movement" ON "Movement";
DROP POLICY IF EXISTS "anon deny all PurchaseOrder" ON "PurchaseOrder";
DROP POLICY IF EXISTS "anon deny all PurchaseOrderItem" ON "PurchaseOrderItem";
DROP POLICY IF EXISTS "anon deny all SalesOrder" ON "SalesOrder";
DROP POLICY IF EXISTS "anon deny all SalesOrderItem" ON "SalesOrderItem";
DROP POLICY IF EXISTS "anon deny all Dispatch" ON "Dispatch";
DROP POLICY IF EXISTS "anon deny all DispatchItem" ON "DispatchItem";
DROP POLICY IF EXISTS "anon deny all TransportVendor" ON "TransportVendor";
DROP POLICY IF EXISTS "anon deny all Vehicle" ON "Vehicle";
DROP POLICY IF EXISTS "anon deny all CourierVendor" ON "CourierVendor";
DROP POLICY IF EXISTS "anon deny all AuditLog" ON "AuditLog";
DROP POLICY IF EXISTS "anon deny all Role" ON "Role";
DROP POLICY IF EXISTS "anon deny all Permission" ON "Permission";
DROP POLICY IF EXISTS "anon deny all Requisition" ON "Requisition";
DROP POLICY IF EXISTS "anon deny all CashIn" ON "CashIn";
DROP POLICY IF EXISTS "anon deny all Expense" ON "Expense";

-- ─── Deny all access to anon role ──────────────────────────────
-- The Next.js API uses service_role which bypasses RLS, so this only
-- affects direct client-side Supabase queries (which we don't use).

CREATE POLICY "anon deny all User"            ON "User"            FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Customer"        ON "Customer"        FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Supplier"        ON "Supplier"        FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Product"         ON "Product"         FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Warehouse"       ON "Warehouse"       FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Location"        ON "Location"        FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Stock"           ON "Stock"           FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Movement"        ON "Movement"        FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all PurchaseOrder"   ON "PurchaseOrder"   FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all PurchaseOrderItem" ON "PurchaseOrderItem" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all SalesOrder"      ON "SalesOrder"      FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all SalesOrderItem"  ON "SalesOrderItem"  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Dispatch"        ON "Dispatch"        FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all DispatchItem"    ON "DispatchItem"    FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all TransportVendor" ON "TransportVendor" FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Vehicle"         ON "Vehicle"         FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all CourierVendor"   ON "CourierVendor"   FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all AuditLog"        ON "AuditLog"        FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Role"            ON "Role"            FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Permission"      ON "Permission"      FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Requisition"     ON "Requisition"     FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all CashIn"          ON "CashIn"          FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "anon deny all Expense"         ON "Expense"         FOR ALL TO anon USING (false) WITH CHECK (false);

-- ─── Optional: Read-only access for authenticated users ────────
-- If you later want to allow Supabase client queries (read-only),
-- uncomment these and restrict as needed:

-- CREATE POLICY "authenticated read Product"
--   ON "Product" FOR SELECT TO authenticated
--   USING (deletedAt IS NULL AND isActive = true);
--
-- CREATE POLICY "authenticated read Warehouse"
--   ON "Warehouse" FOR SELECT TO authenticated
--   USING (deletedAt IS NULL);

-- ═══════════════════════════════════════════════════════════════════════
--  VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════
--  List all policies:
--  SELECT tablename, policyname, roles, cmd, qual FROM pg_policies
--  WHERE schemaname = 'public' ORDER BY tablename;
--
--  Confirm RLS enabled:
--  SELECT tablename, rowsecurity FROM pg_tables
--  WHERE schemaname = 'public' ORDER BY tablename;
--  -- Every table should show rowsecurity = true
-- ═══════════════════════════════════════════════════════════════════════
