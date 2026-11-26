-- Déposant push notifications (public suivi app) + "sold" notification marker
ALTER TABLE "products" ADD COLUMN "soldNotifiedAt" TIMESTAMP(3);

CREATE TABLE "deposant_push_subscriptions" (
    "id" TEXT NOT NULL,
    "coClientId" TEXT NOT NULL,
    "depositRequestId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "deposant_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deposant_push_subscriptions_endpoint_key" ON "deposant_push_subscriptions"("endpoint");
CREATE INDEX "deposant_push_subscriptions_coClientId_idx" ON "deposant_push_subscriptions"("coClientId");

ALTER TABLE "deposant_push_subscriptions" ADD CONSTRAINT "deposant_push_subscriptions_depositRequestId_fkey"
    FOREIGN KEY ("depositRequestId") REFERENCES "deposit_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
