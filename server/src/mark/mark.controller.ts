import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { diskStorage } from "multer";
import { extname, join } from "path";
import * as fs from "fs";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { MarkQueryDto } from "./dto/mark-query.dto";
import { MarkService } from "./mark.service";
import { compressUploadedFile } from "../common/image-compress.util";
import { imageFileFilter, safeImageExtension } from "../common/utils/image-upload";

const marksDir = join(process.cwd(), "uploads", "marks");
if (!fs.existsSync(marksDir)) {
  fs.mkdirSync(marksDir, { recursive: true });
}

const logoStorage = diskStorage({
  destination: (_req, _file, cb) => cb(null, marksDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `mark-${unique}${safeImageExtension(file.originalname)}`);
  },
});

@ApiTags("marks")
@Controller("marks")
export class MarkController {
  constructor(private readonly markService: MarkService) {}

  @Get()
  @ApiOperation({ summary: "List marks (paginated)" })
  findAll(@Query() query: MarkQueryDto) {
    return this.markService.findAll(query);
  }

  @Get("published")
  @ApiOperation({ summary: "All marks for storefront carousel" })
  findPublished() {
    return this.markService.findAllPublished();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get mark by ID" })
  findOne(@Param("id") id: string) {
    return this.markService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor("logo", { storage: logoStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create mark with logo (admin)" })
  async create(
    @Body() body: Record<string, string>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException("name is required");
    if (!file) throw new BadRequestException("logo file is required");
    return this.markService.create({
      name,
      logoDoc: `/uploads/marks/${file.filename}`,
      sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
    });
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor("logo", { storage: logoStorage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Update mark (admin)" })
  async update(
    @Param("id") id: string,
    @Body() body: Record<string, string>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data: { name?: string; logoDoc?: string; sortOrder?: number } = {};
    if (body.name?.trim()) data.name = body.name.trim();
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder);
    if (file) {
      await compressUploadedFile(file);
      data.logoDoc = `/uploads/marks/${file.filename}`;
    }
    return this.markService.update(id, data);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Delete mark (admin)" })
  remove(@Param("id") id: string) {
    return this.markService.remove(id);
  }
}
