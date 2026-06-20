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
import { CreateSubSubCategory2Dto } from "./dto/create-sub-sub-category.dto";
import { UpdateSubSubCategory2Dto } from "./dto/update-sub-sub-category.dto";
import { SubSubCategory2QueryDto } from "./dto/sub-sub-category-query.dto";
import { SubSubCategoryService } from "./sub-sub-category.service";

@ApiTags("sub-sub-categories-2")
@Controller("sub-sub-categories-2")
export class SubSubCategory2Controller {
  constructor(private readonly service: SubSubCategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateSubSubCategory2Dto) {
    return this.service.create2(dto);
  }

  @Get()
  findAll(@Query() query: SubSubCategory2QueryDto) {
    return this.service.findAll2(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne2(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param("id") id: string, @Body() dto: UpdateSubSubCategory2Dto) {
    return this.service.update2(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  remove(@Param("id") id: string) {
    return this.service.remove2(id);
  }
}
