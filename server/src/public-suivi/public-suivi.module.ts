import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { StoreHoursModule } from "../store-hours/store-hours.module";
import { PublicSuiviController } from "./public-suivi.controller";
import { PublicSuiviService } from "./public-suivi.service";
import { SuiviRateLimitGuard } from "./suivi-rate-limit.guard";

@Module({
  imports: [PrismaModule, SiteSettingsModule, StoreHoursModule],
  controllers: [PublicSuiviController],
  providers: [PublicSuiviService, SuiviRateLimitGuard],
})
export class PublicSuiviModule {}
