import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsOptional, IsString, MaxLength } from "class-validator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AiService } from "./ai.service";

export class RefineDescriptionDto {
  @IsString()
  @MaxLength(3000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  productName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  category?: string;
}

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post("refine-description")
  @ApiOperation({ summary: "Corrects and improves a product description (Claude)" })
  refine(@Body() dto: RefineDescriptionDto) {
    return this.ai.refineDescription(dto);
  }
}
