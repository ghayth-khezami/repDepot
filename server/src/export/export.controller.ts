import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ExportQuery, ExportService } from "./export.service";

@ApiTags("export")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("export")
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get(":entity/xlsx")
  @ApiOperation({ summary: "Excel export (dashboard, products, clients, co-clients, commands, deposit-requests, users, newsletter, feedbacks)" })
  async xlsx(@Param("entity") entity: string, @Query() query: ExportQuery, @Res() res: Response) {
    const { buffer, filename } = await this.exportService.build(entity, query);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
