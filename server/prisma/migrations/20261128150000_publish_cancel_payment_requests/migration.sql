-- Storefront: a product appears on the site only once published from the backoffice.
ALTER TABLE "products" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
-- Keep what is online today online (only new products start unpublished).
UPDATE "products" SET "isPublished" = true;

-- Orders can be cancelled ("Annulée"); only cancelled orders can be deleted.
ALTER TYPE "CommandStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TABLE "commands" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Admin notification for a déposant's payment request.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PAYMENT_REQUEST';

-- Déposant asks to collect the money of sold articles on a chosen date.
CREATE TABLE "payment_requests" (
    "id" TEXT NOT NULL,
    "coClientId" TEXT NOT NULL,
    "depositRequestId" TEXT,
    "productIds" TEXT[],
    "amountMillimes" INTEGER NOT NULL,
    "pickupDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "handledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "payment_requests_status_pickupDate_idx" ON "payment_requests"("status", "pickupDate");
CREATE INDEX "payment_requests_coClientId_idx" ON "payment_requests"("coClientId");
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_coClientId_fkey" FOREIGN KEY ("coClientId") REFERENCES "co_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
