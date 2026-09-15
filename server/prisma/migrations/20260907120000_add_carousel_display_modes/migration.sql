ALTER TABLE "hero_carousel_slides"
ADD COLUMN "webDisplayMode" TEXT NOT NULL DEFAULT 'cover',
ADD COLUMN "mobileDisplayMode" TEXT NOT NULL DEFAULT 'cover';