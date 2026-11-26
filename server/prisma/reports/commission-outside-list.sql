-- Migration note (2026-11-27) — commission values are now restricted to 5, 10, 15, 25, 30, 35, 40, 45, 50 %.
-- Existing rows are NOT modified: they keep their value until the commission is edited, at which point
-- the API requires an allowed value. Run this to list them (read-only):
--
--   psql "$DATABASE_URL" -f prisma/reports/commission-outside-list.sql
--
-- Local DB on 2026-11-27: D-1-01 "TEST" (20 %), D-2-01 "Poussette jumeaux" (20 %).

SELECT p.ref,
       p."productName",
       p."depotPercentage",
       p.status,
       c."firstName" || ' ' || c."lastName" AS deposant
FROM products p
LEFT JOIN co_clients c ON c.id = p."coclientId"
WHERE p."isDepot"
  AND p."depotPercentage" IS NOT NULL
  AND p."depotPercentage" NOT IN (5, 10, 15, 25, 30, 35, 40, 45, 50)
ORDER BY p.ref;
