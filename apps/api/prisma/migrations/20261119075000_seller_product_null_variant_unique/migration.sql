-- CreateIndex
CREATE UNIQUE INDEX "seller_products_seller_id_product_id_null_variant_key" ON "seller_products"("seller_id", "product_id") WHERE "variant_id" IS NULL;
