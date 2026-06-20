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
import { CreateSubSubCategory1Dto } from "./dto/create-sub-sub-category.dto";
import { UpdateSubSubCategory1Dto } from "./dto/update-sub-sub-category.dto";
import { SubSubCategory1QueryDto } from "./dto/sub-sub-category-query.dto";
import { SubSubCategoryService } from "./sub-sub-category.service";

@ApiTags("sub-sub-categories-1")
@Controller("sub-sub-categories-1")
export class SubSubCategory1Controller {
  constructor(private readonly service: SubSubCategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create sub-sub-category level 1 (admin)" })
  create(@Body() dto: CreateSubSubCategory1Dto) {
    return this.service.create1(dto);
  }

  @Get()
  @ApiOperation({ summary: "List sub-sub-categories level 1" })
  findAll(@Query() query: SubSubCategory1QueryDto) {
    return this.service.findAll1(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne1(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateSubSubCategory1Dto) {
    return this.service.update1(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string) {
    return this.service.remove1(id);
  }
}
