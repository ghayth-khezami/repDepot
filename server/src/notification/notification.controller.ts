import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { NotificationService } from "./notification.service";
import { PushService } from "./push.service";
import { PushSubscribeDto } from "./dto/push-subscribe.dto";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("notifications")
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushService: PushService,
  ) {}

  @Get()
  list(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.notificationService.list(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get("unread-count")
  unreadCount() {
    return this.notificationService.unreadCount().then((count) => ({ count }));
  }

  @Patch("read-all")
  markAllRead() {
    return this.notificationService.markAllRead();
  }

  @Patch(":id/read")
  markRead(@Param("id") id: string) {
    return this.notificationService.markRead(id);
  }

  @Get("push/vapid-public-key")
  vapidPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post("push/subscribe")
  subscribe(@Req() req: { user: { id: string } }, @Body() dto: PushSubscribeDto) {
    return this.pushService.subscribe(req.user.id, dto);
  }

  @Delete("push/unsubscribe")
  unsubscribe(@Req() req: { user: { id: string } }, @Body("endpoint") endpoint: string) {
    return this.pushService.unsubscribe(req.user.id, endpoint);
  }
}
