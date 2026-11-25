-- CreateEnum
CREATE TYPE "CheckoutSessionStatus" AS ENUM ('PREPARED', 'RESERVATION_ACTIVE', 'EXPIRED', 'RELEASED', 'COMMITTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "applied_coupon_code" TEXT;

-- CreateTable
CREATE TABLE "checkout_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "address_id" UUID NOT NULL,
    "address_snapshot" JSONB NOT NULL,
    "coupon_id" UUID,
    "coupon_code" TEXT,
    "status" "CheckoutSessionStatus" NOT NULL DEFAULT 'RESERVATION_ACTIVE',
    "item_subtotal" DECIMAL(12,2) NOT NULL,
    "product_discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "coupon_discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,2) NOT NULL,
    "distance_km" DECIMAL(6,2),
    "items_snapshot" JSONB NOT NULL,
    "idempotency_key" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "committed_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "checkout_sessions_user_id_status_idx" ON "checkout_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "checkout_sessions_expires_at_idx" ON "checkout_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "checkout_sessions_seller_id_idx" ON "checkout_sessions"("seller_id");

-- CreateIndex
CREATE INDEX "checkout_sessions_idempotency_key_idx" ON "checkout_sessions"("idempotency_key");

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "customer_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Phase 11 Integrity Check Constraints
ALTER TABLE "seller_products"
  ADD CONSTRAINT "chk_seller_products_selling_price_lte_mrp"
  CHECK ("mrp" IS NULL OR "selling_price" <= "mrp") NOT VALID;

ALTER TABLE "cart_items"
  ADD CONSTRAINT "chk_cart_items_quantity_positive"
  CHECK ("quantity" > 0);

ALTER TABLE "inventories"
  ADD CONSTRAINT "chk_inventories_non_negative"
  CHECK ("stock_on_hand" >= 0 AND "reserved_quantity" >= 0 AND "stock_on_hand" >= "reserved_quantity");
