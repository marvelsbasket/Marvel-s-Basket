-- CreateEnum
CREATE TYPE "FoodPreference" AS ENUM ('VEG', 'NON_VEG', 'VEGAN', 'NA');

-- AlterEnum
ALTER TYPE "ProductStatus" ADD VALUE 'DISCONTINUED';

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "default_gst_rate" DECIMAL(5,2),
ADD COLUMN     "icon_public_id" TEXT,
ADD COLUMN     "icon_url" TEXT,
ADD COLUMN     "image_public_id" TEXT,
ADD COLUMN     "tax_code" TEXT;

-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "is_primary" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "public_id" TEXT,
ADD COLUMN     "variant_id" UUID;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "display_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mrp" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "pack_size" TEXT,
ADD COLUMN     "primary_image_public_id" TEXT,
ADD COLUMN     "primary_image_url" TEXT,
ADD COLUMN     "unit_type" TEXT,
ADD COLUMN     "unit_value" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "attributes" JSONB,
ADD COLUMN     "brand_id" UUID,
ADD COLUMN     "country_of_origin" TEXT DEFAULT 'India',
ADD COLUMN     "food_preference" "FoodPreference" NOT NULL DEFAULT 'NA',
ADD COLUMN     "ingredients" TEXT,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manufacturer_details" TEXT,
ADD COLUMN     "nutritional_info" JSONB,
ADD COLUMN     "packer_details" TEXT,
ADD COLUMN     "search_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "shelf_life" TEXT,
ADD COLUMN     "short_description" TEXT,
ADD COLUMN     "specifications" JSONB,
ADD COLUMN     "storage_instructions" TEXT;

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "logo_public_id" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_attribute_definitions" (
    "id" UUID NOT NULL,
    "category_id" UUID,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "attribute_type" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attribute_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_key" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_key" ON "brands"("slug");

-- CreateIndex
CREATE INDEX "brands_slug_idx" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_attribute_definitions_category_id_key_key" ON "product_attribute_definitions"("category_id", "key");

-- CreateIndex
CREATE INDEX "categories_display_order_idx" ON "categories"("display_order");

-- CreateIndex
CREATE INDEX "product_images_variant_id_idx" ON "product_images"("variant_id");

-- CreateIndex
CREATE INDEX "product_variants_barcode_idx" ON "product_variants"("barcode");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE INDEX "products_food_preference_idx" ON "products"("food_preference");

-- CreateIndex
CREATE INDEX "products_is_featured_idx" ON "products"("is_featured");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
