import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { memoryImageUpload } from "../common/utils/image-upload";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

const uploadOpts = memoryImageUpload({ fileSize: 5 * 1024 * 1024, files: 10 });

@ApiTags("media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("media")
export class MediaController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", uploadOpts))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload image to Cloudinary staging (returns URL immediately)" })
  async uploadOne(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException("No file uploaded");
    const url = await this.cloudinary.uploadFile(file, "staging");
    return { url };
  }

  @Post("upload-multiple")
  @UseInterceptors(FilesInterceptor("files", 10, uploadOpts))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload multiple images to Cloudinary staging" })
  async uploadMany(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files?.length) throw new BadRequestException("No files uploaded");
    const urls = await this.cloudinary.uploadFiles(files, "staging");
    return { urls };
  }
}
