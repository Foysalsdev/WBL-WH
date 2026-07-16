-- ═══════════════════════════════════════════════════════════════════════
--  WBL-WH · Finance Module Addon (Supabase)
--  Run this AFTER the main migration.sql to add Finance tables.
--  Safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════════════════════════

-- Drop existing (for re-runs)
DROP TABLE IF EXISTS "Expense" CASCADE;
DROP TABLE IF EXISTS "CashIn" CASCADE;
DROP TABLE IF EXISTS "Requisition" CASCADE;

-- ─── Requisition (warehouse → HO for money) ───────────────────────────
CREATE TABLE "Requisition" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "reqNo"        TEXT NOT NULL UNIQUE,
  "date"         TIMESTAMPTZ NOT NULL DEFAULT now(),
  "amount"       DOUBLE PRECISION NOT NULL,
  "purpose"      TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "approvedBy"   TEXT,
  "approvedAt"   TIMESTAMPTZ,
  "receivedBy"   TEXT,
  "receivedAt"   TIMESTAMPTZ,
  "notes"        TEXT,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Cash In (money received from 3i Logistics / HO) ─────────────────
CREATE TABLE "CashIn" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "cashInNo"      TEXT NOT NULL UNIQUE,
  "date"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "amount"        DOUBLE PRECISION NOT NULL,
  "source"        TEXT NOT NULL DEFAULT '3i Logistics',
  "requisitionId" TEXT REFERENCES "Requisition"("id") ON DELETE SET NULL,
  "receivedBy"    TEXT NOT NULL,
  "notes"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Expense (procurement + other) ────────────────────────────────────
CREATE TABLE "Expense" (
  "id"            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "expenseNo"     TEXT NOT NULL UNIQUE,
  "date"          TIMESTAMPTZ NOT NULL DEFAULT now(),
  "type"          TEXT NOT NULL DEFAULT 'procurement',
  "category"      TEXT NOT NULL,
  "beneficiary"   TEXT NOT NULL,
  "amount"        DOUBLE PRECISION NOT NULL,
  "paymentMode"   TEXT NOT NULL DEFAULT 'cash',
  "memoNo"        TEXT,
  "memoDate"      TIMESTAMPTZ,
  "billNo"        TEXT,
  "billDate"      TIMESTAMPTZ,
  "receiverName"  TEXT,
  "paidBy"        TEXT,
  "notes"         TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────
CREATE INDEX idx_req_status       ON "Requisition"("status");
CREATE INDEX idx_req_date         ON "Requisition"("date" DESC);
CREATE INDEX idx_cashin_date      ON "CashIn"("date" DESC);
CREATE INDEX idx_cashin_source    ON "CashIn"("source");
CREATE INDEX idx_cashin_req       ON "CashIn"("requisitionId");
CREATE INDEX idx_expense_type     ON "Expense"("type");
CREATE INDEX idx_expense_category ON "Expense"("category");
CREATE INDEX idx_expense_date     ON "Expense"("date" DESC);
CREATE INDEX idx_expense_benef    ON "Expense"("beneficiary");

-- ─── RLS ──────────────────────────────────────────────────────────────
ALTER TABLE "Requisition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CashIn"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Expense"    ENABLE ROW LEVEL SECURITY;

-- ─── updatedAt triggers ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_req_updated     BEFORE UPDATE ON "Requisition" FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expense_updated BEFORE UPDATE ON "Expense"     FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Verify ───────────────────────────────────────────────────────────
-- SELECT COUNT(*) FROM "Requisition";  -- should be 0
-- SELECT COUNT(*) FROM "CashIn";       -- should be 0
-- SELECT COUNT(*) FROM "Expense";      -- should be 0
-- ═══════════════════════════════════════════════════════════════════════
