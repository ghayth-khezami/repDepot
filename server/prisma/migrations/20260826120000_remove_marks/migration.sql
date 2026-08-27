ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_markId_fkey";
DROP INDEX IF EXISTS "products_markId_idx";
ALTER TABLE "products" DROP COLUMN IF EXISTS "markId";
ALTER TABLE "products" DROP COLUMN IF EXISTS "marqueDoc";
DROP TABLE IF EXISTS "marks";
