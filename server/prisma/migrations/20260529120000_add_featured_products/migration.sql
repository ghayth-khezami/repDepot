-- CreateTable
CREATE TABLE IF NOT EXISTS "featured_products" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "featured_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "featured_products_productId_key" ON "featured_products"("productId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "featured_products_sortOrder_idx" ON "featured_products"("sortOrder");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'featured_products_productId_fkey'
  ) THEN
    ALTER TABLE "featured_products"
      ADD CONSTRAINT "featured_products_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
