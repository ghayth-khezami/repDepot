-- Product lifecycle EN_VENTE → VENDU → PAYE: payment timestamp, "payment ready" notification marker,
-- and a log of every message sent to déposants.
ALTER TABLE "products" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "products" ADD COLUMN "paidNotifiedAt" TIMESTAMP(3);

-- Existing paid articles: best-known payment date = last update.
UPDATE "products" SET "paidAt" = "updatedAt" WHERE "payoutStatus" = 'PAYE' AND "paidAt" IS NULL;
-- Existing sold / paid articles must not trigger a notification burst on deploy.
UPDATE "products" SET "soldNotifiedAt" = COALESCE("soldNotifiedAt", "soldAt", "updatedAt") WHERE "status" = 'VENDU';
UPDATE "products" SET "paidNotifiedAt" = "paidAt" WHERE "payoutStatus" = 'PAYE';

CREATE TABLE "deposant_notifications" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "coClientId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deposant_notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "deposant_notifications_productId_idx" ON "deposant_notifications"("productId");
CREATE INDEX "deposant_notifications_coClientId_createdAt_idx" ON "deposant_notifications"("coClientId", "createdAt");
