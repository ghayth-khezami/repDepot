-- Reset full category hierarchy (5 levels) and detach/remove dependent product rows.
-- Run `pnpm seed:categories` after migrate to insert the new BÉBÉ-DÉPÔT tree.

UPDATE "products"
SET
  "subCategoryId" = NULL,
  "subSubCategory1Id" = NULL,
  "subSubCategory2Id" = NULL,
  "subSubCategory3Id" = NULL;

DELETE FROM "command_details" WHERE "productId" IN (SELECT "id" FROM "products");
DELETE FROM "multifilesproducts" WHERE "idProduct" IN (SELECT "id" FROM "products");
DELETE FROM "user_likes" WHERE "productId" IN (SELECT "id" FROM "products");
DELETE FROM "featured_products" WHERE "productId" IN (SELECT "id" FROM "products");
DELETE FROM "products";

DELETE FROM "sub_sub_categories_3";
DELETE FROM "sub_sub_categories_2";
DELETE FROM "sub_sub_categories_1";
DELETE FROM "sub_categories";
DELETE FROM "categories";
