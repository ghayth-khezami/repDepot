-- CreateTable
CREATE TABLE "hero_carousel_slides" (
    "id" TEXT NOT NULL,
    "imageDoc" TEXT NOT NULL,
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "imageOnly" BOOLEAN NOT NULL DEFAULT true,
    "arabicWelcome" TEXT,
    "title" TEXT,
    "subtitle" TEXT,
    "description" TEXT,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "ctaType" TEXT,
    "align" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_carousel_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "youtubeUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "hero_carousel_slides_sortOrder_idx" ON "hero_carousel_slides"("sortOrder");

-- Seed default site settings row
INSERT INTO "site_settings" ("id", "youtubeUrl", "updatedAt")
VALUES ('default', NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
