import { Body, Controller, Get, Header, Param, Post, UseGuards } from "@nestjs/common";
import { DeposantPushService } from "./deposant-push.service";
import { DeposantPushDto, DeposantUnsubscribeDto } from "./dto/deposant-push.dto";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PublicSuiviService } from "./public-suivi.service";
import { SuiviRateLimitGuard } from "./suivi-rate-limit.guard";

@ApiTags("public")
@Controller("public/suivi")
@UseGuards(SuiviRateLimitGuard)
export class PublicSuiviController {
  constructor(
    private readonly suivi: PublicSuiviService,
    private readonly push: DeposantPushService,
  ) {}

  @Get("push/key")
  @ApiOperation({ summary: "VAPID public key for the déposant tracking app" })
  pushKey() {
    return this.push.publicKey();
  }

  @Post(":token/push")
  @ApiOperation({ summary: "Subscribe this device to 'article vendu' notifications" })
  subscribe(@Param("token") token: string, @Body() dto: DeposantPushDto) {
    return this.push.subscribe(token, dto);
  }

  @Post(":token/push/unsubscribe")
  @ApiOperation({ summary: "Stop notifications on this device" })
  unsubscribe(@Param("token") token: string, @Body() dto: DeposantUnsubscribeDto) {
    return this.push.unsubscribeDevice(token, dto.endpoint);
  }

  @Get(":token")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Robots-Tag", "noindex, nofollow")
  @ApiOperation({ summary: "Public, read-only déposant tracking (no personal contact data)" })
  get(@Param("token") token: string) {
    return this.suivi.getByToken(token);
  }
}
