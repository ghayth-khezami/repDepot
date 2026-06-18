-- AlterEnum
ALTER TYPE "DepositRequestStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';

-- AlterTable co_clients
ALTER TABLE "co_clients" ADD COLUMN IF NOT EXISTS "userId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "co_clients_userId_key" ON "co_clients"("userId");
ALTER TABLE "co_clients" ADD CONSTRAINT "co_clients_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable deposit_requests
ALTER TABLE "deposit_requests" ADD COLUMN IF NOT EXISTS "coClientId" TEXT;
ALTER TABLE "deposit_requests" ADD COLUMN IF NOT EXISTS "contractDoc" TEXT;
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_coClientId_fkey" FOREIGN KEY ("coClientId") REFERENCES "co_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable deposit_request_items
CREATE TABLE IF NOT EXISTS "deposit_request_items" (
    "id" TEXT NOT NULL,
    "depositRequestId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "proposedPrice" DOUBLE PRECISION NOT NULL,
    "commissionPercent" DOUBLE PRECISION,
    "priceAfterCommission" DOUBLE PRECISION,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_request_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "deposit_request_items" ADD CONSTRAINT "deposit_request_items_depositRequestId_fkey" FOREIGN KEY ("depositRequestId") REFERENCES "deposit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "deposit_request_items_depositRequestId_idx" ON "deposit_request_items"("depositRequestId");
