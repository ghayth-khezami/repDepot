ALTER TABLE "notifications" ADD COLUMN "clientName" TEXT;
ALTER TABLE "notifications" ADD COLUMN "clientPhone" TEXT;
ALTER TABLE "notifications" ADD COLUMN "orderAddress" TEXT;
ALTER TABLE "notifications" ADD COLUMN "productName" TEXT;
ALTER TABLE "notifications" ADD COLUMN "productImage" TEXT;
ALTER TABLE "notifications" ADD COLUMN "orderPrice" DOUBLE PRECISION;
ALTER TABLE "notifications" ADD COLUMN "reminderSentAt" TIMESTAMP(3);