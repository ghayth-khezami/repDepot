import { Module } from "@nestjs/common";
import { HeroCarouselSlideController } from "./hero-carousel-slide.controller";
import { HeroCarouselSlideService } from "./hero-carousel-slide.service";

@Module({
  controllers: [HeroCarouselSlideController],
  providers: [HeroCarouselSlideService],
  exports: [HeroCarouselSlideService],
})
export class HeroCarouselSlideModule {}
