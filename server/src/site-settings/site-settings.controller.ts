import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SiteSettingsService } from "./site-settings.service";

class UpdateSiteSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtubeUrl?: string | null;
}

function normalizeYoutubeUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

@ApiTags("site-settings")
@Controller("site-settings")
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get("public")
  @ApiOperation({ summary: "Public site settings (YouTube link, etc.)" })
  getPublic() {
    return this.siteSettingsService.getPublic();
  }

  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Site settings (admin)" })
  getAdmin() {
    return this.siteSettingsService.getAdmin();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update site settings (admin)" })
  update(@Body() dto: UpdateSiteSettingsDto) {
    return this.siteSettingsService.updateYoutubeUrl(normalizeYoutubeUrl(dto.youtubeUrl));
  }
}
