-- AlterTable
ALTER TABLE "payment_webhook_events" ADD COLUMN     "error_message" TEXT,
ADD COLUMN     "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "signature_verified" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "status" SET DEFAULT 'RECEIVED',
ALTER COLUMN "processed_at" DROP NOT NULL,
ALTER COLUMN "processed_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "attempt_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "authorized_at" TIMESTAMP(3),
ADD COLUMN     "captured_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "captured_at" TIMESTAMP(3),
ADD COLUMN     "checkout_session_id" UUID,
ADD COLUMN     "failed_at" TIMESTAMP(3),
ADD COLUMN     "failure_code" TEXT,
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "gateway_status" TEXT,
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "receipt" TEXT,
ADD COLUMN     "refunded_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "status" SET DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE "refunds" ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "gateway_status" TEXT,
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "speed_processed" TEXT,
ADD COLUMN     "speed_requested" TEXT DEFAULT 'normal';

-- CreateTable
CREATE TABLE "payment_status_histories" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "previous_status" "PaymentStatus" NOT NULL,
    "new_status" "PaymentStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "provider_event_id" TEXT,
    "provider_payment_id" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_status_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_reconciliation_logs" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "actor_id" UUID,
    "source" TEXT NOT NULL,
    "previous_status" "PaymentStatus" NOT NULL,
    "new_status" "PaymentStatus" NOT NULL,
    "gateway_status" TEXT,
    "expected_amount" DECIMAL(12,2) NOT NULL,
    "gateway_amount" DECIMAL(12,2),
    "discrepancy_detected" BOOLEAN NOT NULL DEFAULT false,
    "discrepancy_reason" TEXT,
    "resolution_action" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reconciliation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_status_histories_payment_id_created_at_idx" ON "payment_status_histories"("payment_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_reconciliation_logs_payment_id_created_at_idx" ON "payment_reconciliation_logs"("payment_id", "created_at");

-- CreateIndex
CREATE INDEX "payment_reconciliation_logs_order_id_idx" ON "payment_reconciliation_logs"("order_id");

-- CreateIndex
CREATE INDEX "payment_reconciliation_logs_discrepancy_detected_idx" ON "payment_reconciliation_logs"("discrepancy_detected");

-- CreateIndex
CREATE INDEX "payment_webhook_events_status_received_at_idx" ON "payment_webhook_events"("status", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_checkout_session_id_idx" ON "payments"("checkout_session_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_order_id_key" ON "payments"("provider", "provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_payment_id_key" ON "payments"("provider", "provider_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "refunds"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_refund_id_key" ON "refunds"("provider_refund_id");

-- AddForeignKey
ALTER TABLE "payment_status_histories" ADD CONSTRAINT "payment_status_histories_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_reconciliation_logs" ADD CONSTRAINT "payment_reconciliation_logs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
