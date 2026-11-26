import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SiteSettingsModule } from "../site-settings/site-settings.module";
import { DepotController } from "./depot.controller";
import { DepotService } from "./depot.service";

@Module({
  imports: [PrismaModule, SiteSettingsModule],
  controllers: [DepotController],
  providers: [DepotService],
  exports: [DepotService],
})
export class DepotModule {}
