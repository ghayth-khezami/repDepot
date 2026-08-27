import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { ClientModule } from "./client/client.module";
import { CoClientModule } from "./co-client/co-client.module";
import { CategoryModule } from "./category/category.module";
import { ProductModule } from "./product/product.module";
import { ProductPhotoModule } from "./product-photo/product-photo.module";
import { CommandModule } from "./command/command.module";
import { StatsModule } from "./stats/stats.module";
import { LikesModule } from "./likes/likes.module";
import { DepositRequestModule } from "./deposit-request/deposit-request.module";
import { StoreHoursModule } from "./store-hours/store-hours.module";
import { SubCategoryModule } from "./sub-category/sub-category.module";
import { SubSubCategoryModule } from "./sub-sub-category/sub-sub-category.module";
import { ClientFeedbackModule } from "./client-feedback/client-feedback.module";
import { NewsletterModule } from "./newsletter/newsletter.module";
import { NotificationModule } from "./notification/notification.module";
import { HealthModule } from "./health/health.module";
import { CloudinaryModule } from "./cloudinary/cloudinary.module";
import { MediaModule } from "./media/media.module";
import { HeroCarouselSlideModule } from "./hero-carousel-slide/hero-carousel-slide.module";
import { SiteSettingsModule } from "./site-settings/site-settings.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      // In production (e.g. Elastic Beanstalk), rely on environment variables.
      // This also prevents failures if `.env` is not shipped.
      ignoreEnvFile: process.env.NODE_ENV === "production",
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: 60_000,
        limit: 120,
      },
      {
        name: "auth",
        ttl: 60_000,
        limit: 20,
      },
      {
        name: "checkout",
        ttl: 60_000,
        limit: 15,
      },
      {
        name: "deposit",
        ttl: 60_000,
        limit: 10,
      },
      {
        name: "newsletter",
        ttl: 60_000,
        limit: 5,
      },
    ]),
    CloudinaryModule,
    MediaModule,
    PrismaModule,
    UserModule,
    AuthModule,
    ClientModule,
    CoClientModule,
    CategoryModule,
    ProductModule,
    ProductPhotoModule,
    CommandModule,
    StatsModule,
    LikesModule,
    DepositRequestModule,
    StoreHoursModule,
    SubCategoryModule,
    SubSubCategoryModule,
    ClientFeedbackModule,
    NewsletterModule,
    NotificationModule,
    HealthModule,
    HeroCarouselSlideModule,
    SiteSettingsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
