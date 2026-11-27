import { Module } from "@nestjs/common";
import { CommandService } from "./command.service";
import { CommandController } from "./command.controller";
import { NotificationModule } from "../notification/notification.module";
import { SiteSettingsModule } from "../site-settings/site-settings.module";

@Module({
  imports: [NotificationModule, SiteSettingsModule],
  controllers: [CommandController],
  providers: [CommandService],
  exports: [CommandService],
})
export class CommandModule {}
