-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryTransactionType" ADD VALUE 'INITIAL_STOCK';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'RESTOCK';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'MANUAL_INCREASE';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'MANUAL_DECREASE';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'DAMAGED_STOCK_WRITEOFF';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'EXPIRED_STOCK_WRITEOFF';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'PICKER_SHORTAGE_WRITEOFF';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'ORDER_COMMITTED';
ALTER TYPE "InventoryTransactionType" ADD VALUE 'INVENTORY_CORRECTION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SellerProductStatus" ADD VALUE 'PAUSED';
ALTER TYPE "SellerProductStatus" ADD VALUE 'DISABLED';

-- AlterTable
ALTER TABLE "inventories" ADD COLUMN     "stock_on_hand" INTEGER NOT NULL DEFAULT 0;

-- Backfill stock_on_hand for existing records
UPDATE "inventories" SET "stock_on_hand" = "available_quantity" + "reserved_quantity";

-- AlterTable
ALTER TABLE "inventory_transactions" ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "stock_after" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stock_before" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stock_reservations" ADD COLUMN     "cart_id" UUID,
ADD COLUMN     "checkout_session_id" TEXT,
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "unit_price" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "inventory_transactions_idempotency_key_idx" ON "inventory_transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "stock_reservations_checkout_session_id_idx" ON "stock_reservations"("checkout_session_id");

-- CreateIndex
CREATE INDEX "stock_reservations_idempotency_key_idx" ON "stock_reservations"("idempotency_key");

-- Guarantee uniqueness of (seller_id, variant_id) for variants
CREATE UNIQUE INDEX IF NOT EXISTS "seller_products_seller_id_variant_id_not_null_key" 
ON "seller_products"("seller_id", "variant_id") 
WHERE "variant_id" IS NOT NULL;

-- Database Level Invariants & Integrity Constraints
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_stock_invariants_check"
CHECK (
  "stock_on_hand" >= 0 AND
  "reserved_quantity" >= 0 AND
  "reserved_quantity" <= "stock_on_hand" AND
  "available_quantity" >= 0 AND
  "available_quantity" = ("stock_on_hand" - "reserved_quantity")
);

ALTER TABLE "seller_products" ADD CONSTRAINT "seller_products_selling_price_check"
CHECK (
  "selling_price" > 0 AND
  ("mrp" IS NULL OR "selling_price" <= "mrp")
);

ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_quantity_check"
CHECK ("quantity" > 0);
