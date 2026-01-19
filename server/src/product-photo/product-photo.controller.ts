import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProductPhotoService } from './product-photo.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';

@ApiTags('product-photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('product-photos')
export class ProductPhotoController {
  constructor(private readonly productPhotoService: ProductPhotoService) {}

  // Ensure uploads directory exists
  private ensureUploadsDir() {
    const uploadsDir = join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadsDir = join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          cb(null, uploadsDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `product-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          cb(null, true);
        } else {
          cb(new Error('Only image files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        productId: {
          type: 'string',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a photo for a product' })
  async uploadPhoto(@UploadedFile() file: Express.Multer.File, @Body('productId') productId: string) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    const filePath = `/uploads/${file.filename}`;
    return this.productPhotoService.create(productId, filePath);
  }

  @Post()
  @ApiOperation({ summary: 'Add photos to a product (legacy base64 method)' })
  async create(@Body() body: { productId: string; photoDocs: string[] }) {
    return this.productPhotoService.createMany(body.productId, body.photoDocs);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get all photos for a product' })
  async findByProduct(@Param('productId') productId: string) {
    return this.productPhotoService.findByProduct(productId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a photo' })
  async remove(@Param('id') id: string) {
    return this.productPhotoService.remove(id);
  }
}
