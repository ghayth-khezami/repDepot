import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsOptional, IsString, IsUrl, Matches, MaxLength, ValidateIf } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SiteSettingsService } from "./site-settings.service";

class UpdateSiteSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtubeUrl?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== "")
  @Matches(/^(\+?216)?\s?\d{2}\s?\d{3}\s?\d{3}$/, { message: "Téléphone boutique invalide." })
  shopPhone?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== "")
  @Matches(/^(\+?216)?\s?\d{2}\s?\d{3}\s?\d{3}$/, { message: "Numéro WhatsApp invalide." })
  shopWhatsapp?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  shopAddress?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== "")
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(500)
  shopMapsUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  contractTerms?: string | null;
}

const blankToNull = (v: string | null | undefined) => (v === undefined ? undefined : v?.trim() ? v.trim() : null);

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
    return this.siteSettingsService.update({
      ...(dto.youtubeUrl !== undefined ? { youtubeUrl: normalizeYoutubeUrl(dto.youtubeUrl) } : {}),
      shopPhone: blankToNull(dto.shopPhone),
      shopWhatsapp: blankToNull(dto.shopWhatsapp),
      shopAddress: blankToNull(dto.shopAddress),
      shopMapsUrl: blankToNull(dto.shopMapsUrl),
      contractTerms: blankToNull(dto.contractTerms),
    });
  }
}
