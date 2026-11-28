-- DropIndex
DROP INDEX IF EXISTS "reviews_product_id_rating_idx";

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "moderated_at" TIMESTAMP(3),
ADD COLUMN     "moderated_by" UUID,
ADD COLUMN     "moderation_reason" TEXT,
ADD COLUMN     "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "is_published" SET DEFAULT false;

-- CreateTable
CREATE TABLE "review_reports" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "reporter_user_id" UUID NOT NULL,
    "reason" "ReviewReportReason" NOT NULL,
    "explanation" TEXT,
    "status" "ReviewReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution_note" TEXT,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_moderation_logs" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "previous_status" "ReviewStatus",
    "new_status" "ReviewStatus" NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_moderation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_rating_aggregates" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "count_1" INTEGER NOT NULL DEFAULT 0,
    "count_2" INTEGER NOT NULL DEFAULT 0,
    "count_3" INTEGER NOT NULL DEFAULT 0,
    "count_4" INTEGER NOT NULL DEFAULT 0,
    "count_5" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_rating_aggregates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_reports_review_id_idx" ON "review_reports"("review_id");

-- CreateIndex
CREATE INDEX "review_reports_status_created_at_idx" ON "review_reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "review_reports_review_id_reporter_user_id_key" ON "review_reports"("review_id", "reporter_user_id");

-- CreateIndex
CREATE INDEX "review_moderation_logs_review_id_created_at_idx" ON "review_moderation_logs"("review_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_rating_aggregates_product_id_key" ON "product_rating_aggregates"("product_id");

-- CreateIndex
CREATE INDEX "reviews_product_id_status_rating_idx" ON "reviews"("product_id", "status", "rating");

-- CreateIndex
CREATE INDEX "reviews_status_created_at_idx" ON "reviews"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_user_id_product_id_key" ON "reviews"("user_id", "product_id");

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_moderation_logs" ADD CONSTRAINT "review_moderation_logs_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
