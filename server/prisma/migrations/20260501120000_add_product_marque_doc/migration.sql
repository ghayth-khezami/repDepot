-- Optional brand (marque) logo path, e.g. /uploads/brands/marque-xxx.png
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "marqueDoc" TEXT;
