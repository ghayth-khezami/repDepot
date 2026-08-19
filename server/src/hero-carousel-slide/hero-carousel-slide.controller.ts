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
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { memoryImageUpload } from "../common/utils/image-upload";
import { HeroCarouselSlideQueryDto } from "./dto/hero-carousel-slide-query.dto";
import { HeroCarouselSlideService } from "./hero-carousel-slide.service";

const imageUpload = memoryImageUpload({ fileSize: 8 * 1024 * 1024 });

function parseBool(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1" || value === "on";
}

function parseOptionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function slidePayloadFromBody(body: Record<string, string>) {
  return {
    imageAlt: body.imageAlt?.trim() || "",
    sortOrder: body.sortOrder ? Number(body.sortOrder) : 0,
    isPublished: parseBool(body.isPublished, true),
    imageOnly: parseBool(body.imageOnly, true),
    arabicWelcome: parseOptionalText(body.arabicWelcome),
    title: parseOptionalText(body.title),
    subtitle: parseOptionalText(body.subtitle),
    description: parseOptionalText(body.description),
    ctaLabel: parseOptionalText(body.ctaLabel),
    ctaHref: parseOptionalText(body.ctaHref),
    ctaType: parseOptionalText(body.ctaType),
    align: parseOptionalText(body.align),
  };
}

@ApiTags("hero-carousel-slides")
@Controller("hero-carousel-slides")
export class HeroCarouselSlideController {
  constructor(
    private readonly heroCarouselSlideService: HeroCarouselSlideService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Get("published")
  @ApiOperation({ summary: "Published hero carousel slides (public)" })
  findPublished() {
    return this.heroCarouselSlideService.findPublished();
  }

  @Get("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "All hero carousel slides (admin)" })
  findAllAdmin(@Query() query: HeroCarouselSlideQueryDto) {
    return this.heroCarouselSlideService.findAll(query);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get hero carousel slide by ID (admin)" })
  findOne(@Param("id") id: string) {
    return this.heroCarouselSlideService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("image", imageUpload))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create hero carousel slide (admin, Cloudinary)" })
  async create(
    @Body() body: Record<string, string>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("image file is required");
    const imageDoc = await this.cloudinary.uploadFile(file, "hero-carousel");
    return this.heroCarouselSlideService.create({
      imageDoc,
      ...slidePayloadFromBody(body),
    });
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("image", imageUpload))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Update hero carousel slide (admin, Cloudinary)" })
  async update(
    @Param("id") id: string,
    @Body() body: Record<string, string>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const data: Record<string, unknown> = slidePayloadFromBody(body);
    if (file) {
      const existing = await this.heroCarouselSlideService.findOne(id);
      await this.cloudinary.deleteByUrl(existing.imageDoc);
      data.imageDoc = await this.cloudinary.uploadFile(file, "hero-carousel");
    }
    return this.heroCarouselSlideService.update(id, data);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Delete hero carousel slide (admin)" })
  async remove(@Param("id") id: string) {
    const existing = await this.heroCarouselSlideService.findOne(id);
    await this.cloudinary.deleteByUrl(existing.imageDoc);
    return this.heroCarouselSlideService.remove(id);
  }
}
