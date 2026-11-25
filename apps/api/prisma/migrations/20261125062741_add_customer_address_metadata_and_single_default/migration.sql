-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('HOME', 'OFFICE', 'OTHER');

-- AlterTable
ALTER TABLE "customer_addresses" ADD COLUMN     "address_type" "AddressType" NOT NULL DEFAULT 'HOME',
ADD COLUMN     "for_someone_else" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locality" TEXT;

-- Enforce strictly one default delivery address per customer
CREATE UNIQUE INDEX IF NOT EXISTS "customer_addresses_single_default_per_user_idx"
ON "customer_addresses"("user_id")
WHERE "is_default" = true;
