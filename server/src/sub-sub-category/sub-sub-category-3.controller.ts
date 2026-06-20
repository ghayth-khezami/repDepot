import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CreateSubSubCategory3Dto } from "./dto/create-sub-sub-category.dto";
import { UpdateSubSubCategory3Dto } from "./dto/update-sub-sub-category.dto";
import { SubSubCategory3QueryDto } from "./dto/sub-sub-category-query.dto";
import { SubSubCategoryService } from "./sub-sub-category.service";

@ApiTags("sub-sub-categories-3")
@Controller("sub-sub-categories-3")
export class SubSubCategory3Controller {
  constructor(private readonly service: SubSubCategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateSubSubCategory3Dto) {
    return this.service.create3(dto);
  }

  @Get()
  findAll(@Query() query: SubSubCategory3QueryDto) {
    return this.service.findAll3(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne3(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateSubSubCategory3Dto) {
    return this.service.update3(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string) {
    return this.service.remove3(id);
  }
}
