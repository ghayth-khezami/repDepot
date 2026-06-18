import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UpdateStoreHoursDto } from "./dto/update-store-hours.dto";
import { StoreHoursService } from "./store-hours.service";

@ApiTags("store-hours")
@Controller("store-hours")
export class StoreHoursController {
  constructor(private readonly storeHoursService: StoreHoursService) {}

  @Get()
  @ApiOperation({ summary: "Get store opening hours (public)" })
  findAll() {
    return this.storeHoursService.findAll();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update all store hours (admin)" })
  updateAll(@Body() dto: UpdateStoreHoursDto) {
    return this.storeHoursService.upsertAll(dto.hours);
  }
}
