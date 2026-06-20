-- AlterTable
ALTER TABLE "products" ADD COLUMN "subSubCategory1Id" TEXT,
ADD COLUMN "subSubCategory2Id" TEXT,
ADD COLUMN "subSubCategory3Id" TEXT;

-- CreateTable
CREATE TABLE "sub_sub_categories_1" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_sub_categories_1_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_sub_categories_2" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subSubCategory1Id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_sub_categories_2_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sub_sub_categories_3" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subSubCategory2Id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_sub_categories_3_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sub_sub_categories_1_subCategoryId_idx" ON "sub_sub_categories_1"("subCategoryId");

-- CreateIndex
CREATE INDEX "sub_sub_categories_2_subSubCategory1Id_idx" ON "sub_sub_categories_2"("subSubCategory1Id");

-- CreateIndex
CREATE INDEX "sub_sub_categories_3_subSubCategory2Id_idx" ON "sub_sub_categories_3"("subSubCategory2Id");

-- AddForeignKey
ALTER TABLE "sub_sub_categories_1" ADD CONSTRAINT "sub_sub_categories_1_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_sub_categories_2" ADD CONSTRAINT "sub_sub_categories_2_subSubCategory1Id_fkey" FOREIGN KEY ("subSubCategory1Id") REFERENCES "sub_sub_categories_1"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_sub_categories_3" ADD CONSTRAINT "sub_sub_categories_3_subSubCategory2Id_fkey" FOREIGN KEY ("subSubCategory2Id") REFERENCES "sub_sub_categories_2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subSubCategory1Id_fkey" FOREIGN KEY ("subSubCategory1Id") REFERENCES "sub_sub_categories_1"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subSubCategory2Id_fkey" FOREIGN KEY ("subSubCategory2Id") REFERENCES "sub_sub_categories_2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_subSubCategory3Id_fkey" FOREIGN KEY ("subSubCategory3Id") REFERENCES "sub_sub_categories_3"("id") ON DELETE SET NULL ON UPDATE CASCADE;
