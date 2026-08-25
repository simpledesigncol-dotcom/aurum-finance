-- AlterTable: Add new columns to FinancialMovement
ALTER TABLE "FinancialMovement" ADD COLUMN "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "FinancialMovement" ADD COLUMN "work_order_id" TEXT;
ALTER TABLE "FinancialMovement" ADD COLUMN "metadata" TEXT;

-- AlterTable: Add new columns to CashRegister
ALTER TABLE "CashRegister" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'general';

-- AlterTable: Add work_order_id to Sale
ALTER TABLE "Sale" ADD COLUMN "work_order_id" TEXT;

-- AlterTable: Add work_order_id to Expense
ALTER TABLE "Expense" ADD COLUMN "work_order_id" TEXT;

-- AlterTable: Add work_order_id to Purchase
ALTER TABLE "Purchase" ADD COLUMN "work_order_id" TEXT;

-- AlterTable: Add work_order_id to AccountsReceivable
ALTER TABLE "AccountsReceivable" ADD COLUMN "work_order_id" TEXT;

-- AlterTable: Add work_order_id to AccountsPayable
ALTER TABLE "AccountsPayable" ADD COLUMN "work_order_id" TEXT;

-- AlterTable: Add metadata to AuditLog
ALTER TABLE "AuditLog" ADD COLUMN "metadata" TEXT;

-- CreateTable: WorkOrder
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CashReconciliation
CREATE TABLE "CashReconciliation" (
    "id" TEXT NOT NULL,
    "register_id" TEXT NOT NULL,
    "system_balance" DOUBLE PRECISION NOT NULL,
    "physical_count" DOUBLE PRECISION NOT NULL,
    "difference" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "reconciled_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkOrder_company_id_order_number_key" ON "WorkOrder"("company_id", "order_number");
CREATE INDEX "FinancialMovement_occurred_at_idx" ON "FinancialMovement"("companyId", "occurred_at");
CREATE INDEX "FinancialMovement_work_order_id_idx" ON "FinancialMovement"("work_order_id");

-- AddForeignKey: WorkOrder
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: CashReconciliation
ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashReconciliation" ADD CONSTRAINT "CashReconciliation_reconciled_by_id_fkey" FOREIGN KEY ("reconciled_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: FinancialMovement -> WorkOrder
ALTER TABLE "FinancialMovement" ADD CONSTRAINT "FinancialMovement_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Sale -> WorkOrder
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "WorkOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
