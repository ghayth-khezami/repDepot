-- Unified "Nouveau dépôt" flow: déposant numbers, product refs/status, contracts, public tracking.
-- Run `pnpm ts-node prisma/check-deposant-phones.ts` BEFORE deploying: duplicate phones block the unique index.

-- ── Enums ────────────────────────────────────────────────────────────────
CREATE TYPE "ProductStatus" AS ENUM ('EN_VENTE', 'VENDU', 'RETIRE');
CREATE TYPE "PayoutStatus" AS ENUM ('A_PERCEVOIR', 'PAYE');

-- ── Déposants (co_clients) ───────────────────────────────────────────────
-- Optional fields become nullable (nothing is dropped).
ALTER TABLE "co_clients" ALTER COLUMN "address" DROP NOT NULL;
ALTER TABLE "co_clients" ALTER COLUMN "email" DROP NOT NULL;
ALTER TABLE "co_clients" ALTER COLUMN "RIB" DROP NOT NULL;
ALTER TABLE "co_clients" ADD COLUMN "lat" DOUBLE PRECISION;
ALTER TABLE "co_clients" ADD COLUMN "lng" DOUBLE PRECISION;

-- Empty strings from the old form become NULL.
UPDATE "co_clients" SET "address" = NULL WHERE btrim("address") = '';
UPDATE "co_clients" SET "email" = NULL WHERE btrim("email") = '';
UPDATE "co_clients" SET "RIB" = NULL WHERE btrim("RIB") = '';

-- Normalize phones to 8 digits (strip spaces, "+216", "00216").
UPDATE "co_clients" SET "phoneNumber" = regexp_replace("phoneNumber", '\D', '', 'g');
UPDATE "co_clients" SET "phoneNumber" = right("phoneNumber", 8)
  WHERE length("phoneNumber") > 8 AND ("phoneNumber" LIKE '216%' OR "phoneNumber" LIKE '00216%');
CREATE UNIQUE INDEX "co_clients_phoneNumber_key" ON "co_clients"("phoneNumber");

-- Déposant number (SERIAL backfills existing rows in creation order is not guaranteed; renumber below).
ALTER TABLE "co_clients" ADD COLUMN "number" SERIAL NOT NULL;
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS n FROM "co_clients"
)
UPDATE "co_clients" c SET "number" = o.n FROM ordered o WHERE c.id = o.id;
SELECT setval(pg_get_serial_sequence('"co_clients"', 'number'), COALESCE((SELECT max("number") FROM "co_clients"), 0) + 1, false);
CREATE UNIQUE INDEX "co_clients_number_key" ON "co_clients"("number");
ALTER TABLE "co_clients" ADD COLUMN "refSeq" INTEGER NOT NULL DEFAULT 0;

-- ── Products ─────────────────────────────────────────────────────────────
ALTER TABLE "products" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'EN_VENTE';
ALTER TABLE "products" ADD COLUMN "soldAt" TIMESTAMP(3);
ALTER TABLE "products" ADD COLUMN "payoutStatus" "PayoutStatus";
ALTER TABLE "products" ADD COLUMN "shopAmountMillimes" INTEGER;
ALTER TABLE "products" ADD COLUMN "depositorAmountMillimes" INTEGER;
ALTER TABLE "products" ADD COLUMN "depositRequestId" TEXT;

-- Status from legacy isDispo; sold date from the order that took the product.
UPDATE "products" p SET
  "status" = 'VENDU',
  "soldAt" = COALESCE(
    (SELECT min(cd."createdAt") FROM "command_details" cd WHERE cd."productId" = p.id),
    p."updatedAt"
  )
WHERE p."isDispo" = false;
UPDATE "products" SET "payoutStatus" = 'A_PERCEVOIR' WHERE "status" = 'VENDU' AND "isDepot" = true;

-- Money split in millimes for existing dépôt products.
UPDATE "products" SET
  "shopAmountMillimes" = round(round("PrixVente" * 1000) * COALESCE("depotPercentage", 0) / 100)::int
WHERE "isDepot" = true;
UPDATE "products" SET
  "depositorAmountMillimes" = round("PrixVente" * 1000)::int - "shopAmountMillimes"
WHERE "isDepot" = true;

-- Refs: D-{déposantNumber}-{seq} for déposant products, P-{nnnnn} otherwise.
ALTER TABLE "products" ADD COLUMN "ref" TEXT;
WITH ranked AS (
  SELECT p.id, c."number" AS dn,
         row_number() OVER (PARTITION BY p."coclientId" ORDER BY p."createdAt", p.id) AS seq
  FROM "products" p JOIN "co_clients" c ON c.id = p."coclientId"
)
UPDATE "products" p SET "ref" = 'D-' || r.dn || '-' || lpad(r.seq::text, 2, '0')
FROM ranked r WHERE p.id = r.id;
UPDATE "co_clients" c SET "refSeq" = sub.cnt
FROM (SELECT "coclientId", count(*) AS cnt FROM "products" WHERE "coclientId" IS NOT NULL GROUP BY "coclientId") sub
WHERE c.id = sub."coclientId";

CREATE SEQUENCE "product_ref_seq";
WITH ranked AS (
  SELECT id, row_number() OVER (ORDER BY "createdAt", id) AS n FROM "products" WHERE "ref" IS NULL
)
UPDATE "products" p SET "ref" = 'P-' || lpad(r.n::text, 5, '0') FROM ranked r WHERE p.id = r.id;
SELECT setval('"product_ref_seq"', COALESCE((SELECT count(*) FROM "products" WHERE "ref" LIKE 'P-%'), 0) + 1, false);

ALTER TABLE "products" ALTER COLUMN "ref" SET DEFAULT ('P-'::text || lpad((nextval('product_ref_seq'::regclass))::text, 5, '0'::text));
ALTER TABLE "products" ALTER COLUMN "ref" SET NOT NULL;
CREATE UNIQUE INDEX "products_ref_key" ON "products"("ref");
CREATE INDEX "products_status_idx" ON "products"("status");
CREATE INDEX "products_depositRequestId_idx" ON "products"("depositRequestId");

-- ── Contracts (deposit_requests) ─────────────────────────────────────────
ALTER TABLE "deposit_requests" ADD COLUMN "contractNumber" TEXT;
ALTER TABLE "deposit_requests" ADD COLUMN "trackingToken" TEXT;
ALTER TABLE "deposit_requests" ADD COLUMN "durationMonths" INTEGER;
ALTER TABLE "deposit_requests" ADD COLUMN "internalNote" TEXT;
ALTER TABLE "deposit_requests" ADD COLUMN "signedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "deposit_requests_contractNumber_key" ON "deposit_requests"("contractNumber");
CREATE UNIQUE INDEX "deposit_requests_trackingToken_key" ON "deposit_requests"("trackingToken");
CREATE SEQUENCE "contract_number_seq";

ALTER TABLE "products" ADD CONSTRAINT "products_depositRequestId_fkey"
  FOREIGN KEY ("depositRequestId") REFERENCES "deposit_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Shop contact / contract terms (site_settings) ────────────────────────
ALTER TABLE "site_settings" ADD COLUMN "shopPhone" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "shopWhatsapp" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "shopAddress" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "shopMapsUrl" TEXT;
ALTER TABLE "site_settings" ADD COLUMN "contractTerms" TEXT;
