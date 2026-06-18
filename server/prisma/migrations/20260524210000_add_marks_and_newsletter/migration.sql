CREATE TABLE "marks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoDoc" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "marks_name_key" ON "marks"("name");

CREATE TABLE "newsletter_subscribers" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletter_subscribers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "newsletter_subscribers_email_key" ON "newsletter_subscribers"("email");

ALTER TABLE "products" ADD COLUMN "markId" TEXT;

ALTER TABLE "products" ADD CONSTRAINT "products_markId_fkey" FOREIGN KEY ("markId") REFERENCES "marks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "products_markId_idx" ON "products"("markId");
