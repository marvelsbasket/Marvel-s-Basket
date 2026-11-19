-- AlterTable
ALTER TABLE "sessions" ADD COLUMN     "token_family_id" UUID;

-- CreateIndex
CREATE INDEX "sessions_token_family_id_idx" ON "sessions"("token_family_id");
