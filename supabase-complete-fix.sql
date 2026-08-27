-- ============================================================
-- COMPLETE FIX — Run ALL of this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/rvcfaaibvqxaqdxzrkxj/sql/new
-- ============================================================

-- 1. Obligation: add 4 missing columns
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "is_recurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "next_due_date" TIMESTAMP(3);
ALTER TABLE "Obligation" ADD COLUMN IF NOT EXISTS "payment_method_id" TEXT;
DO $$ BEGIN
  ALTER TABLE "Obligation" ADD CONSTRAINT "Obligation_payment_method_id_fkey" 
    FOREIGN KEY ("payment_method_id") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. FinancialMovement: add new columns
ALTER TABLE "FinancialMovement" ADD COLUMN IF NOT EXISTS "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FinancialMovement" ADD COLUMN IF NOT EXISTS "work_order_id" TEXT;
ALTER TABLE "FinancialMovement" ADD COLUMN IF NOT EXISTS "metadata" TEXT;

-- 3. CashRegister: add type column
ALTER TABLE "CashRegister" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'general';

-- 4. Add work_order_id to other tables
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "work_order_id" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "work_order_id" TEXT;
ALTER TABLE "Purchase" ADD COLUMN IF NOT EXISTS "work_order_id" TEXT;
ALTER TABLE "AccountsReceivable" ADD COLUMN IF NOT EXISTS "work_order_id" TEXT;
ALTER TABLE "AccountsPayable" ADD COLUMN IF NOT EXISTS "work_order_id" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "metadata" TEXT;

-- 5. Create WorkOrder table
CREATE TABLE IF NOT EXISTS "WorkOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "contact_id" TEXT,
    "vehicle_plate" TEXT,
    "vehicle_info" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "sale_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- 6. Create CashReconciliation table
CREATE TABLE IF NOT EXISTS "CashReconciliation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "register_id" TEXT NOT NULL,
    "system_balance" DOUBLE PRECISION NOT NULL,
    "physical_count" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "reconciled_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Indexes
DO $$ BEGIN
  CREATE UNIQUE INDEX "WorkOrder_company_id_order_number_key" ON "WorkOrder"("company_id", "order_number");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX "FinancialMovement_occurred_at_idx" ON "FinancialMovement"("company_id", "occurred_at");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE INDEX "FinancialMovement_work_order_id_idx" ON "FinancialMovement"("work_order_id");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 8. Foreign Keys for WorkOrder
DO $$ BEGIN
  ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_company_id_fkey" 
    FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_contact_id_fkey" 
    FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 9. Foreign Keys for CashReconciliation
DO $$ BEGIN
  ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_register_id_fkey" 
    FOREIGN KEY ("register_id") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_reconciled_by_id_fkey" 
    FOREIGN KEY ("reconciled_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 10. Foreign Keys for work_order_id columns
DO $$ BEGIN
  ALTER TABLE "FinancialMovement" ADD CONSTRAINT "FinancialMovement_work_order_id_fkey" 
    FOREIGN KEY ("work_order_id") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "Sale" ADD CONSTRAINT "Sale_work_order_id_fkey" 
    FOREIGN KEY ("work_order_id") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 11. Verify everything was created
SELECT 'WorkOrder' as tbl, count(*) as cnt FROM "WorkOrder"
UNION ALL
SELECT 'CashReconciliation', count(*) FROM "CashReconciliation"
UNION ALL
SELECT 'FM_occurred_at', count(*) FROM "FinancialMovement" WHERE "occurred_at" IS NOT NULL
UNION ALL
SELECT 'CR_type', count(*) FROM "CashRegister" WHERE "type" IS NOT NULL
UNION ALL
SELECT 'OB_priority', count(*) FROM "Obligation" WHERE "priority" IS NOT NULL;
