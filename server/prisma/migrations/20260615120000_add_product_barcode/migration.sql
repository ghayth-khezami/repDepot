-- AlterTable
ALTER TABLE "products" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");
