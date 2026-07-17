-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nit" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo_url" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "timezone" TEXT NOT NULL DEFAULT 'America/Bogota',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "parent_id" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Category_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "bank_account_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "PaymentMethod_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentMethod_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "BankAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document_type" TEXT,
    "document_number" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "contact_person" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contact_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Caja Principal',
    "opening_balance" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'closed',
    "opened_at" DATETIME,
    "closed_at" DATETIME,
    "closed_by_id" TEXT,
    "physical_count" REAL,
    "difference" REAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CashRegister_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CashRegister_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BankAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_type" TEXT,
    "account_number" TEXT,
    "holder_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BankAccount_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FinancialMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transaction_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "movement_type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "direction" TEXT NOT NULL,
    "movement_date" DATETIME NOT NULL,
    "category_id" TEXT,
    "subcategory" TEXT,
    "description" TEXT,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "receipt_number" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "FinancialMovement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FinancialMovement_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialMovement_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FinancialMovement_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "sale_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "payment_type" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "amount_paid" REAL NOT NULL DEFAULT 0,
    "balance_due" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "operations_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Sale_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Sale_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Sale_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sale_id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" REAL NOT NULL,
    "cost" REAL NOT NULL DEFAULT 0,
    "subtotal" REAL NOT NULL,
    "detailer_id" TEXT,
    "vehicle_plate" TEXT,
    "vehicle_info" TEXT,
    CONSTRAINT "SaleItem_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SalePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sale_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "payment_method_id" TEXT,
    "payment_date" DATETIME NOT NULL,
    "financial_movement_id" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SalePayment_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SalePayment_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "PaymentMethod" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalePayment_financial_movement_id_fkey" FOREIGN KEY ("financial_movement_id") REFERENCES "FinancialMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "SalePayment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "category_id" TEXT,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "expense_date" DATETIME NOT NULL,
    "payment_method_id" TEXT,
    "contact_id" TEXT,
    "receipt_number" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurring_frequency" TEXT,
    "financial_movement_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Expense_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "PaymentMethod" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_financial_movement_id_fkey" FOREIGN KEY ("financial_movement_id") REFERENCES "FinancialMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Expense_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "purchase_date" DATETIME NOT NULL,
    "invoice_number" TEXT,
    "purchase_type" TEXT NOT NULL,
    "subtotal" REAL NOT NULL,
    "tax" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL,
    "payment_type" TEXT NOT NULL,
    "amount_paid" REAL NOT NULL DEFAULT 0,
    "balance_due" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Purchase_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Purchase_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchase_id" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "category_id" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unit_price" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "PurchaseItem_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PurchaseItem_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchasePayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "purchase_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "payment_method_id" TEXT,
    "payment_date" DATETIME NOT NULL,
    "financial_movement_id" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchasePayment_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchase" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchasePayment_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "PaymentMethod" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchasePayment_financial_movement_id_fkey" FOREIGN KEY ("financial_movement_id") REFERENCES "FinancialMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PurchasePayment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountsReceivable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL,
    "sale_id" TEXT,
    "description" TEXT NOT NULL,
    "original_amount" REAL NOT NULL,
    "paid_amount" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL,
    "issue_date" DATETIME NOT NULL,
    "due_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "aging_bucket" TEXT,
    "last_reminder_date" DATETIME,
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "AccountsReceivable_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountsReceivable_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountsReceivable_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "Sale" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accounts_receivable_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "payment_method_id" TEXT,
    "payment_date" DATETIME NOT NULL,
    "financial_movement_id" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArPayment_accounts_receivable_id_fkey" FOREIGN KEY ("accounts_receivable_id") REFERENCES "AccountsReceivable" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ArPayment_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "PaymentMethod" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ArPayment_financial_movement_id_fkey" FOREIGN KEY ("financial_movement_id") REFERENCES "FinancialMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ArPayment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountsPayable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "purchase_id" TEXT,
    "description" TEXT NOT NULL,
    "original_amount" REAL NOT NULL,
    "paid_amount" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL,
    "issue_date" DATETIME NOT NULL,
    "due_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "aging_bucket" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "AccountsPayable_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AccountsPayable_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AccountsPayable_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accounts_payable_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "payment_method_id" TEXT,
    "payment_date" DATETIME NOT NULL,
    "financial_movement_id" TEXT,
    "reference" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApPayment_accounts_payable_id_fkey" FOREIGN KEY ("accounts_payable_id") REFERENCES "AccountsPayable" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ApPayment_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "PaymentMethod" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApPayment_financial_movement_id_fkey" FOREIGN KEY ("financial_movement_id") REFERENCES "FinancialMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApPayment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Obligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "contact_id" TEXT,
    "name" TEXT NOT NULL,
    "original_amount" REAL NOT NULL,
    "paid_amount" REAL NOT NULL DEFAULT 0,
    "balance" REAL NOT NULL,
    "interest_rate" REAL NOT NULL DEFAULT 0,
    "interest_type" TEXT NOT NULL DEFAULT 'none',
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "payment_frequency" TEXT,
    "payment_amount" REAL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Obligation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Obligation_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Obligation_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObligationPayment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "obligation_id" TEXT NOT NULL,
    "installment_number" INTEGER,
    "due_date" DATETIME NOT NULL,
    "amount_due" REAL NOT NULL,
    "interest_portion" REAL NOT NULL DEFAULT 0,
    "principal_portion" REAL NOT NULL DEFAULT 0,
    "amount_paid" REAL NOT NULL DEFAULT 0,
    "payment_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "financial_movement_id" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObligationPayment_obligation_id_fkey" FOREIGN KEY ("obligation_id") REFERENCES "Obligation" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ObligationPayment_financial_movement_id_fkey" FOREIGN KEY ("financial_movement_id") REFERENCES "FinancialMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT,
    "asset_type" TEXT NOT NULL,
    "purchase_date" DATETIME NOT NULL,
    "purchase_price" REAL NOT NULL,
    "salvage_value" REAL NOT NULL DEFAULT 0,
    "useful_life_months" INTEGER NOT NULL,
    "depreciation_method" TEXT NOT NULL DEFAULT 'straight_line',
    "accumulated_depreciation" REAL NOT NULL DEFAULT 0,
    "net_book_value" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "serial_number" TEXT,
    "location" TEXT,
    "purchase_id" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Asset_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Asset_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Asset_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "Purchase" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DepreciationEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "asset_id" TEXT NOT NULL,
    "period" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "accumulated" REAL NOT NULL,
    "net_value" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DepreciationEntry_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "file_type" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "financial_movement_id" TEXT,
    "uploaded_by" TEXT NOT NULL,
    "tags" TEXT DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_financial_movement_id_fkey" FOREIGN KEY ("financial_movement_id") REFERENCES "FinancialMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "from_type" TEXT NOT NULL,
    "from_id" TEXT NOT NULL,
    "to_type" TEXT NOT NULL,
    "to_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "description" TEXT,
    "transfer_date" DATETIME NOT NULL,
    "financial_movement_origin_id" TEXT,
    "financial_movement_dest_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Transfer_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Transfer_financial_movement_origin_id_fkey" FOREIGN KEY ("financial_movement_origin_id") REFERENCES "FinancialMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transfer_financial_movement_dest_id_fkey" FOREIGN KEY ("financial_movement_dest_id") REFERENCES "FinancialMovement" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Transfer_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "file_name" TEXT,
    "records_imported" INTEGER NOT NULL DEFAULT 0,
    "records_failed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "error_log" TEXT,
    "imported_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ImportLog_imported_by_fkey" FOREIGN KEY ("imported_by") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_values" TEXT,
    "new_values" TEXT,
    "ip_address" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Notification_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialMovement_transaction_id_key" ON "FinancialMovement"("transaction_id");

-- CreateIndex
CREATE INDEX "FinancialMovement_company_id_movement_date_idx" ON "FinancialMovement"("company_id", "movement_date");

-- CreateIndex
CREATE INDEX "FinancialMovement_status_idx" ON "FinancialMovement"("status");

-- CreateIndex
CREATE INDEX "FinancialMovement_movement_type_idx" ON "FinancialMovement"("movement_type");

-- CreateIndex
CREATE INDEX "Document_reference_type_reference_id_idx" ON "Document"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "Document_financial_movement_id_idx" ON "Document"("financial_movement_id");
