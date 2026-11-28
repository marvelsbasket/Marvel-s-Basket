-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "accepted_at" TIMESTAMP(3),
ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "attempt_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cancellation_reason" TEXT,
ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "cod_collected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cod_collected_amount" DECIMAL(12,2),
ADD COLUMN     "delivery_notes" TEXT,
ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "max_attempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "otp_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "otp_expires_at" TIMESTAMP(3),
ADD COLUMN     "otp_hash" TEXT,
ADD COLUMN     "ready_for_pickup_at" TIMESTAMP(3),
ADD COLUMN     "recipient_name" TEXT;

-- AlterTable
ALTER TABLE "delivery_assignments" ADD COLUMN     "assigned_by" UUID,
ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "rejection_reason" TEXT;

-- AlterTable
ALTER TABLE "delivery_status_histories" ADD COLUMN     "actor_role" TEXT;

-- CreateIndex
CREATE INDEX "delivery_assignments_status_idx" ON "delivery_assignments"("status");
