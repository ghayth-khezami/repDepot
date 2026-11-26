import { Controller, Get, Header, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PublicSuiviService } from "./public-suivi.service";
import { SuiviRateLimitGuard } from "./suivi-rate-limit.guard";

@ApiTags("public")
@Controller("public/suivi")
@UseGuards(SuiviRateLimitGuard)
export class PublicSuiviController {
  constructor(private readonly suivi: PublicSuiviService) {}

  @Get(":token")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Robots-Tag", "noindex, nofollow")
  @ApiOperation({ summary: "Public, read-only déposant tracking (no personal contact data)" })
  get(@Param("token") token: string) {
    return this.suivi.getByToken(token);
  }
}
