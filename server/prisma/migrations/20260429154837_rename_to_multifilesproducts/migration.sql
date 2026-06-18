-- Rename constraints while the table is still product_photos (table rename is in the next migration)
ALTER TABLE "product_photos" RENAME CONSTRAINT "product_photos_pkey" TO "multifilesproducts_pkey";

ALTER TABLE "product_photos" RENAME CONSTRAINT "product_photos_idProduct_fkey" TO "multifilesproducts_idProduct_fkey";
