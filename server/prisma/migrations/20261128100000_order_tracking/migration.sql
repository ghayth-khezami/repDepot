-- Order tracking for web customers: Reçue (NOT_DELIVERED) → Acceptée (ACCEPTED) → Livrée (DELIVERED).
ALTER TYPE "CommandStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TABLE "commands" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "commands" ADD COLUMN "deliveredAt" TIMESTAMP(3);
-- Past delivered orders: use their delivery date (or last update) so the stepper shows a date.
UPDATE "commands" SET "deliveredAt" = COALESCE("dateLivraison", "updatedAt") WHERE "status" IN ('DELIVERED', 'GOT_PROFIT');

-- Accounts carry a phone number (8 digits): it links orders placed before signing up.
ALTER TABLE "users" ADD COLUMN "phoneNumber" TEXT;
CREATE UNIQUE INDEX "users_phoneNumber_key" ON "users"("phoneNumber");
ALTER TABLE "pending_users" ADD COLUMN "phoneNumber" TEXT;
