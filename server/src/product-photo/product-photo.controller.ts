import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { ProductPhotoService } from "./product-photo.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@prisma/client";
import { memoryImageUpload } from "../common/utils/image-upload";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

const productUpload = memoryImageUpload({ fileSize: 5 * 1024 * 1024 });

@ApiTags("product-photos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("product-photos")
export class ProductPhotoController {
  constructor(
    private readonly productPhotoService: ProductPhotoService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", productUpload))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        productId: { type: "string" },
      },
    },
  })
  @ApiOperation({ summary: "Upload a photo for a product (Cloudinary)" })
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body("productId") productId: string,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    const url = await this.cloudinary.uploadFile(file, "products");
    return this.productPhotoService.create(productId, url);
  }

  @Post("upload-multiple")
  @UseInterceptors(FilesInterceptor("files", 20, productUpload))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: { type: "array", items: { type: "string", format: "binary" } },
        productId: { type: "string" },
      },
    },
  })
  @ApiOperation({ summary: "Upload multiple photos for a product (Cloudinary)" })
  async uploadMultiplePhotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("productId") productId: string,
  ) {
    if (!files?.length) throw new BadRequestException("No files uploaded");
    const urls = await this.cloudinary.uploadFiles(files, "products");
    await this.productPhotoService.createMany(productId, urls);
    return this.productPhotoService.findByProduct(productId);
  }

  @Post()
  @ApiOperation({ summary: "Add photos to a product (legacy URL list)" })
  async create(@Body() body: { productId: string; photoDocs: string[] }) {
    const urls = (body.photoDocs ?? []).filter((u) => u.startsWith("http"));
    if (!urls.length) {
      throw new BadRequestException("photoDocs must be Cloudinary HTTPS URLs");
    }
    return this.productPhotoService.createMany(body.productId, urls);
  }

  @Get("product/:productId")
  @ApiOperation({ summary: "Get all photos for a product" })
  async findByProduct(@Param("productId") productId: string) {
    return this.productPhotoService.findByProduct(productId);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a photo" })
  async remove(@Param("id") id: string) {
    return this.productPhotoService.remove(id);
  }
}
