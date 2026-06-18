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
import { diskStorage } from "multer";
import { extname, join } from "path";
import * as fs from "fs";
import { compressUploadedFile, compressUploadedFiles } from "../common/image-compress.util";

@ApiTags("product-photos")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("product-photos")
export class ProductPhotoController {
  constructor(private readonly productPhotoService: ProductPhotoService) {}

  // Ensure uploads directory exists
  private ensureUploadsDir() {
    const uploadsDir = join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadsDir = join(process.cwd(), "uploads");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `product-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(null, true);
        } else {
          cb(new Error("Only image files are allowed"), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
        productId: {
          type: "string",
        },
      },
    },
  })
  @ApiOperation({ summary: "Upload a photo for a product" })
  async uploadPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Body("productId") productId: string,
  ) {
    if (!file) {
      throw new Error("No file uploaded");
    }
    await compressUploadedFile(file);
    const filePath = `/uploads/${file.filename}`;
    return this.productPhotoService.create(productId, filePath);
  }

  @Post("upload-multiple")
  @UseInterceptors(
    FilesInterceptor("files", 20, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadsDir = join(process.cwd(), "uploads");
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `product-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(null, true);
        } else {
          cb(new Error("Only image files are allowed"), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
        },
        productId: {
          type: "string",
        },
      },
    },
  })
  @ApiOperation({ summary: "Upload multiple photos for a product" })
  async uploadMultiplePhotos(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("productId") productId: string,
  ) {
    if (!files?.length) {
      throw new Error("No files uploaded");
    }
    await compressUploadedFiles(files);
    const filePaths = files.map((file) => `/uploads/${file.filename}`);
    await this.productPhotoService.createMany(productId, filePaths);
    return this.productPhotoService.findByProduct(productId);
  }

  @Post()
  @ApiOperation({ summary: "Add photos to a product (legacy base64 method)" })
  async create(@Body() body: { productId: string; photoDocs: string[] }) {
    return this.productPhotoService.createMany(body.productId, body.photoDocs);
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
