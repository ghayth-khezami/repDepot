import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { getJwtSecret } from "../config/security.config";
import { UserModule } from "../user/user.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationController } from "./notification.controller";
import { NotificationService } from "./notification.service";
import { NotificationsGateway } from "./notifications.gateway";
import { PushService } from "./push.service";

@Module({
  imports: [
    PrismaModule,
    UserModule,
    JwtModule.register({
      secret: getJwtSecret(),
      signOptions: { expiresIn: "1d" },
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationsGateway, PushService],
  exports: [NotificationService],
})
export class NotificationModule {}
