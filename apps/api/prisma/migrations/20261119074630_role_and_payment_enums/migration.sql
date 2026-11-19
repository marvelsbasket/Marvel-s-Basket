-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "payment_method" "PaymentMethod" NOT NULL DEFAULT 'RAZORPAY';

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "role_type" "UserRoleType";
