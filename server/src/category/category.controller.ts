import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiConsumes } from "@nestjs/swagger";
import { diskStorage } from "multer";
import { extname, join } from "path";
import * as fs from "fs";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { CategoryQueryDto } from "./dto/category-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@prisma/client";
import { compressUploadedFile } from "../common/image-compress.util";
import { imageFileFilter, safeImageExtension } from "../common/utils/image-upload";
import { buildCategoryHierarchyPdf } from "../common/category-hierarchy-pdf.util";

const coversDir = join(process.cwd(), "uploads", "categories");
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

const coverStorage = diskStorage({
  destination: (_req, _file, cb) => cb(null, coversDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `category-${unique}${safeImageExtension(file.originalname)}`);
  },
});

@ApiTags("categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor("cover", { storage: coverStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data", "application/json")
  @ApiOperation({ summary: "Create a new category" })
  @ApiResponse({ status: 201, description: "Category created" })
  async create(
    @Body() body: CreateCategoryDto | Record<string, string>,
    @UploadedFile() cover?: Express.Multer.File,
  ) {
    const dto = body as CreateCategoryDto;
    if (!dto.categoryName?.trim()) {
      throw new BadRequestException("categoryName is required");
    }
    let coverDoc: string | undefined;
    if (cover) {
      await compressUploadedFile(cover);
      coverDoc = `/uploads/categories/${cover.filename}`;
    }
    return this.categoryService.create({
      categoryName: dto.categoryName.trim(),
      description: dto.description,
      icon: dto.icon,
      coverDoc,
    });
  }

  @Get()
  @ApiOperation({ summary: "Get all categories with pagination and search" })
  @ApiResponse({ status: 200, description: "List of categories" })
  findAll(@Query() query: CategoryQueryDto) {
    return this.categoryService.findAll(query);
  }

  @Get("export/hierarchy/pdf")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Export full category hierarchy as colored PDF (admin)" })
  async exportHierarchyPdf(@Res() res: Response) {
    const tree = await this.categoryService.getFullHierarchy();
    const pdf = buildCategoryHierarchyPdf(tree);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=categories-hierarchie.pdf");
    res.send(pdf);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a category by ID" })
  @ApiParam({ name: "id", description: "Category ID" })
  @ApiResponse({ status: 200, description: "Category found" })
  @ApiResponse({ status: 404, description: "Category not found" })
  findOne(@Param("id") id: string) {
    return this.categoryService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor("cover", { storage: coverStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data", "application/json")
  @ApiOperation({ summary: "Update a category" })
  @ApiParam({ name: "id", description: "Category ID" })
  @ApiResponse({ status: 200, description: "Category updated" })
  @ApiResponse({ status: 404, description: "Category not found" })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateCategoryDto | Record<string, string>,
    @UploadedFile() cover?: Express.Multer.File,
  ) {
    const dto = body as UpdateCategoryDto;
    const data: UpdateCategoryDto = {};
    if (dto.categoryName !== undefined) data.categoryName = dto.categoryName;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.icon !== undefined) data.icon = dto.icon;
    if (cover) {
      await compressUploadedFile(cover);
      data.coverDoc = `/uploads/categories/${cover.filename}`;
    }
    return this.categoryService.update(id, data);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a category" })
  @ApiParam({ name: "id", description: "Category ID" })
  @ApiResponse({ status: 200, description: "Category deleted" })
  @ApiResponse({ status: 404, description: "Category not found" })
  remove(@Param("id") id: string) {
    return this.categoryService.remove(id);
  }
}
