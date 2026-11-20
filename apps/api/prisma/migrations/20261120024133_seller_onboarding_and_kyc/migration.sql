-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SellerStatus" ADD VALUE 'PENDING_VERIFICATION';
ALTER TYPE "SellerStatus" ADD VALUE 'APPROVED_ACTIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VerificationStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "VerificationStatus" ADD VALUE 'NEEDS_RESUBMISSION';

-- AlterTable
ALTER TABLE "seller_documents" ADD COLUMN     "cloudinary_public_id" TEXT,
ADD COLUMN     "expiry_date" TIMESTAMP(3),
ADD COLUMN     "file_size" INTEGER,
ADD COLUMN     "mime_type" TEXT,
ADD COLUMN     "original_filename" TEXT;

-- AlterTable
ALTER TABLE "seller_profiles" ADD COLUMN     "service_radius_km" DECIMAL(5,2),
ADD COLUMN     "store_interior_photo_public_id" TEXT,
ADD COLUMN     "store_interior_photo_url" TEXT,
ADD COLUMN     "storefront_photo_public_id" TEXT,
ADD COLUMN     "storefront_photo_url" TEXT,
ADD COLUMN     "weekly_off_days" TEXT;

-- AlterTable
ALTER TABLE "sellers" ADD COLUMN     "bank_account_holder_name" TEXT,
ADD COLUMN     "bank_account_number_encrypted" TEXT,
ADD COLUMN     "bank_account_number_masked" TEXT,
ADD COLUMN     "bank_account_type" TEXT,
ADD COLUMN     "bank_ifsc_code" TEXT,
ADD COLUMN     "bank_name" TEXT,
ADD COLUMN     "business_entity_type" TEXT,
ADD COLUMN     "current_step" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "fssai_expiry_date" TIMESTAMP(3),
ADD COLUMN     "fssai_number" TEXT,
ADD COLUMN     "is_submitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "legal_business_name" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" UUID,
ADD COLUMN     "shop_establishment_number" TEXT,
ADD COLUMN     "store_category" TEXT,
ADD COLUMN     "store_display_name" TEXT,
ADD COLUMN     "submitted_at" TIMESTAMP(3),
ADD COLUMN     "upi_id" TEXT;

-- CreateTable
CREATE TABLE "seller_document_reviews" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "reviewer_id" UUID NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_document_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_status_history" (
    "id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "from_status" "SellerStatus" NOT NULL,
    "to_status" "SellerStatus" NOT NULL,
    "reason" TEXT,
    "changed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_document_reviews_document_id_idx" ON "seller_document_reviews"("document_id");

-- CreateIndex
CREATE INDEX "seller_document_reviews_reviewer_id_idx" ON "seller_document_reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "seller_status_history_seller_id_idx" ON "seller_status_history"("seller_id");

-- AddForeignKey
ALTER TABLE "seller_document_reviews" ADD CONSTRAINT "seller_document_reviews_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "seller_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_document_reviews" ADD CONSTRAINT "seller_document_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_status_history" ADD CONSTRAINT "seller_status_history_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
