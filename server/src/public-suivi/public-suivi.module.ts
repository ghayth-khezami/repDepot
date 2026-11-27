import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { StoreHoursModule } from "../store-hours/store-hours.module";
import { PublicSuiviController } from "./public-suivi.controller";
import { PublicSuiviService } from "./public-suivi.service";
import { DeposantPushService } from "./deposant-push.service";
import { NotificationModule } from "../notification/notification.module";
import { SuiviRateLimitGuard } from "./suivi-rate-limit.guard";
import { SuiviGateway } from "./suivi.gateway";
import { PaymentRequestService } from "./payment-request.service";
import { PaymentRequestController } from "./payment-request.controller";

@Module({
  imports: [PrismaModule, SiteSettingsModule, StoreHoursModule, NotificationModule],
  controllers: [PublicSuiviController, PaymentRequestController],
  providers: [PublicSuiviService, SuiviRateLimitGuard, DeposantPushService, SuiviGateway, PaymentRequestService],
})
export class PublicSuiviModule {}
