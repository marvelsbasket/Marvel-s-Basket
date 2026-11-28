-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "current_usage_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "first_order_only" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_stackable_with_seller_discount" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "seller_product_discounts" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "seller_product_id" UUID NOT NULL,
    "title" TEXT,
    "discount_type" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discount_value" DECIMAL(12,2) NOT NULL,
    "status" "SellerDiscountStatus" NOT NULL DEFAULT 'DRAFT',
    "starts_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "paused_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_product_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_product_discounts_seller_id_status_idx" ON "seller_product_discounts"("seller_id", "status");

-- CreateIndex
CREATE INDEX "seller_product_discounts_seller_product_id_status_starts_at_idx" ON "seller_product_discounts"("seller_product_id", "status", "starts_at", "expires_at");

-- AddForeignKey
ALTER TABLE "seller_product_discounts" ADD CONSTRAINT "seller_product_discounts_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_product_discounts" ADD CONSTRAINT "seller_product_discounts_seller_product_id_fkey" FOREIGN KEY ("seller_product_id") REFERENCES "seller_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
