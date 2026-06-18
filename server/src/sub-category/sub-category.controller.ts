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
import { CreateSubCategoryDto } from "./dto/create-sub-category.dto";
import { UpdateSubCategoryDto } from "./dto/update-sub-category.dto";
import { SubCategoryQueryDto } from "./dto/sub-category-query.dto";
import { SubCategoryService } from "./sub-category.service";

@ApiTags("sub-categories")
@Controller("sub-categories")
export class SubCategoryController {
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create sub-category (admin)" })
  create(@Body() dto: CreateSubCategoryDto) {
    return this.subCategoryService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List sub-categories with pagination" })
  findAll(@Query() query: SubCategoryQueryDto) {
    return this.subCategoryService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get sub-category by ID" })
  findOne(@Param("id") id: string) {
    return this.subCategoryService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update sub-category (admin)" })
  update(@Param("id") id: string, @Body() dto: UpdateSubCategoryDto) {
    return this.subCategoryService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete sub-category (admin)" })
  remove(@Param("id") id: string) {
    return this.subCategoryService.remove(id);
  }
}
