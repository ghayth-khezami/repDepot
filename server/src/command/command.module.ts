import { Module } from "@nestjs/common";
import { CommandService } from "./command.service";
import { CommandController } from "./command.controller";
import { NotificationModule } from "../notification/notification.module";

@Module({
  imports: [NotificationModule],
  controllers: [CommandController],
  providers: [CommandService],
  exports: [CommandService],
})
export class CommandModule {}
