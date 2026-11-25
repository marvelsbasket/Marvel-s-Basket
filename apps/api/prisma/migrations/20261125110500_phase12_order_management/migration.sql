-- CreateEnum
CREATE TYPE "OrderComplaintCategory" AS ENUM ('MISSING_ITEM', 'WRONG_ITEM', 'DAMAGED_ITEM', 'SPOILED_PERISHABLE', 'INCORRECT_QUANTITY', 'OTHER');

-- CreateEnum
CREATE TYPE "OrderComplaintStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESOLVED');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "brand_snapshot" TEXT,
ADD COLUMN     "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "image_url_snapshot" TEXT,
ADD COLUMN     "product_id_snapshot" UUID,
ADD COLUMN     "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "variant_id_snapshot" UUID;

-- AlterTable
ALTER TABLE "order_status_histories" ADD COLUMN     "actor_role" TEXT;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancelled_by" UUID,
ADD COLUMN     "checkout_session_id" UUID,
ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "coupon_code" TEXT,
ADD COLUMN     "coupon_id" UUID,
ADD COLUMN     "dispatched_at" TIMESTAMP(3),
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'COD',
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "store_name_snapshot" TEXT;

-- CreateTable
CREATE TABLE "order_complaints" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID,
    "customer_id" UUID NOT NULL,
    "category" "OrderComplaintCategory" NOT NULL,
    "status" "OrderComplaintStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "evidence_public_ids" JSONB,
    "admin_note" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_complaints_order_id_idx" ON "order_complaints"("order_id");

-- CreateIndex
CREATE INDEX "order_complaints_customer_id_idx" ON "order_complaints"("customer_id");

-- CreateIndex
CREATE INDEX "order_complaints_status_idx" ON "order_complaints"("status");

-- CreateIndex
CREATE UNIQUE INDEX "orders_checkout_session_id_key" ON "orders"("checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_idempotency_key_key" ON "orders"("idempotency_key");

-- AddForeignKey
ALTER TABLE "order_complaints" ADD CONSTRAINT "order_complaints_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_complaints" ADD CONSTRAINT "order_complaints_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_complaints" ADD CONSTRAINT "order_complaints_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

