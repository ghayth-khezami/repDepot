-- Add many-to-many category assignments while preserving legacy scalar fields.
CREATE TABLE "product_categories" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("productId", "categoryId")
);

CREATE TABLE "product_sub_categories" (
    "productId" TEXT NOT NULL,
    "subCategoryId" TEXT NOT NULL,
    CONSTRAINT "product_sub_categories_pkey" PRIMARY KEY ("productId", "subCategoryId")
);

CREATE TABLE "product_sub_sub_categories_1" (
    "productId" TEXT NOT NULL,
    "subSubCategoryId" TEXT NOT NULL,
    CONSTRAINT "product_sub_sub_categories_1_pkey" PRIMARY KEY ("productId", "subSubCategoryId")
);

CREATE TABLE "product_sub_sub_categories_2" (
    "productId" TEXT NOT NULL,
    "subSubCategoryId" TEXT NOT NULL,
    CONSTRAINT "product_sub_sub_categories_2_pkey" PRIMARY KEY ("productId", "subSubCategoryId")
);

CREATE TABLE "product_sub_sub_categories_3" (
    "productId" TEXT NOT NULL,
    "subSubCategoryId" TEXT NOT NULL,
    CONSTRAINT "product_sub_sub_categories_3_pkey" PRIMARY KEY ("productId", "subSubCategoryId")
);

CREATE INDEX "product_categories_categoryId_idx" ON "product_categories"("categoryId");
CREATE INDEX "product_sub_categories_subCategoryId_idx" ON "product_sub_categories"("subCategoryId");
CREATE INDEX "product_sub_sub_categories_1_subSubCategoryId_idx" ON "product_sub_sub_categories_1"("subSubCategoryId");
CREATE INDEX "product_sub_sub_categories_2_subSubCategoryId_idx" ON "product_sub_sub_categories_2"("subSubCategoryId");
CREATE INDEX "product_sub_sub_categories_3_subSubCategoryId_idx" ON "product_sub_sub_categories_3"("subSubCategoryId");

ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_sub_categories" ADD CONSTRAINT "product_sub_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_sub_categories" ADD CONSTRAINT "product_sub_categories_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "sub_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_sub_sub_categories_1" ADD CONSTRAINT "product_sub_sub_categories_1_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_sub_sub_categories_1" ADD CONSTRAINT "product_sub_sub_categories_1_subSubCategoryId_fkey" FOREIGN KEY ("subSubCategoryId") REFERENCES "sub_sub_categories_1"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_sub_sub_categories_2" ADD CONSTRAINT "product_sub_sub_categories_2_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_sub_sub_categories_2" ADD CONSTRAINT "product_sub_sub_categories_2_subSubCategoryId_fkey" FOREIGN KEY ("subSubCategoryId") REFERENCES "sub_sub_categories_2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_sub_sub_categories_3" ADD CONSTRAINT "product_sub_sub_categories_3_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_sub_sub_categories_3" ADD CONSTRAINT "product_sub_sub_categories_3_subSubCategoryId_fkey" FOREIGN KEY ("subSubCategoryId") REFERENCES "sub_sub_categories_3"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve existing single assignments in the new multi-select relations.
INSERT INTO "product_categories" ("productId", "categoryId")
SELECT "id", "categoryId" FROM "products" WHERE "categoryId" IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO "product_sub_categories" ("productId", "subCategoryId")
SELECT "id", "subCategoryId" FROM "products" WHERE "subCategoryId" IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO "product_sub_sub_categories_1" ("productId", "subSubCategoryId")
SELECT "id", "subSubCategory1Id" FROM "products" WHERE "subSubCategory1Id" IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO "product_sub_sub_categories_2" ("productId", "subSubCategoryId")
SELECT "id", "subSubCategory2Id" FROM "products" WHERE "subSubCategory2Id" IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO "product_sub_sub_categories_3" ("productId", "subSubCategoryId")
SELECT "id", "subSubCategory3Id" FROM "products" WHERE "subSubCategory3Id" IS NOT NULL
ON CONFLICT DO NOTHING;
