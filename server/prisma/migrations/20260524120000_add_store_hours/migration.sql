-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "store_hours" (
    "id" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openTime" TEXT,
    "closeTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_hours_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_hours_weekday_key" ON "store_hours"("weekday");

-- Seed default hours (Mon–Sat 9–19, Sun closed)
INSERT INTO "store_hours" ("id", "weekday", "isClosed", "openTime", "closeTime", "updatedAt") VALUES
  ('00000001-0001-4001-8001-000000000001', 'MONDAY', false, '09:00', '19:00', CURRENT_TIMESTAMP),
  ('00000001-0001-4001-8001-000000000002', 'TUESDAY', false, '09:00', '19:00', CURRENT_TIMESTAMP),
  ('00000001-0001-4001-8001-000000000003', 'WEDNESDAY', false, '09:00', '19:00', CURRENT_TIMESTAMP),
  ('00000001-0001-4001-8001-000000000004', 'THURSDAY', false, '09:00', '19:00', CURRENT_TIMESTAMP),
  ('00000001-0001-4001-8001-000000000005', 'FRIDAY', false, '09:00', '19:00', CURRENT_TIMESTAMP),
  ('00000001-0001-4001-8001-000000000006', 'SATURDAY', false, '09:00', '19:00', CURRENT_TIMESTAMP),
  ('00000001-0001-4001-8001-000000000007', 'SUNDAY', true, NULL, NULL, CURRENT_TIMESTAMP);
