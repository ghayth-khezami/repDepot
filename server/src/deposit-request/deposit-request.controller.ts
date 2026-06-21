import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Param,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { AnyFilesInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@prisma/client";
import { Throttle } from "@nestjs/throttler";
import { memoryImageUpload } from "../common/utils/image-upload";
import { DepositRequestService } from "./deposit-request.service";
import { CreateDepositRequestDto } from "./dto/create-deposit-request.dto";
import { DepositRequestQueryDto } from "./dto/deposit-request-query.dto";
import { UpdateDepositRequestStatusDto } from "./dto/update-deposit-request-status.dto";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

const depositUpload = memoryImageUpload({
  fileSize: 10 * 1024 * 1024,
  files: 12,
});

@ApiTags("deposit-requests")
@Controller("deposit-requests")
export class DepositRequestController {
  constructor(
    private readonly depositRequestService: DepositRequestService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post()
  @Throttle({ deposit: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(AnyFilesInterceptor(depositUpload))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        fullName: { type: "string" },
        phoneNumber: { type: "string" },
        proposedPrice: { type: "number" },
        message: { type: "string" },
        photos: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
      required: ["fullName", "phoneNumber", "proposedPrice"],
    },
  })
  @ApiOperation({ summary: "Create a public deposit request" })
  async create(
    @Body() dto: CreateDepositRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const safeFiles = (files || []).filter((f) => f.fieldname !== "contract");
    const photoFiles = safeFiles.filter(
      (f) => f.fieldname === "photos" || f.fieldname.startsWith("photos"),
    );
    const paths = await this.cloudinary.uploadFiles(photoFiles, "deposit-requests");
    return this.depositRequestService.create(
      {
        ...dto,
        proposedPrice: Number(dto.proposedPrice),
      },
      paths,
    );
  }

  @Post("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(AnyFilesInterceptor(depositUpload))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create a deposit request for current user" })
  async createMine(
    @Req() req: any,
    @Body() dto: CreateDepositRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const photoFiles = (files || []).filter(
      (f) => f.fieldname === "photos" || f.fieldname.startsWith("photos"),
    );
    const paths = await this.cloudinary.uploadFiles(photoFiles, "deposit-requests");
    return this.depositRequestService.create(
      {
        ...dto,
        proposedPrice: Number(dto.proposedPrice),
      },
      paths,
      req.user?.id,
    );
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "List current user's deposit requests" })
  findMine(@Req() req: any) {
    const userId = req.user?.id;
    return this.depositRequestService.findMine(userId);
  }

  @Post("admin")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @UseInterceptors(AnyFilesInterceptor(depositUpload))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Admin: create deposit request for a deposant" })
  async createAdmin(
    @Body() body: Record<string, string>,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const coClientId = body.coClientId?.trim();
    if (!coClientId) throw new BadRequestException("coClientId is required");
    let items: Array<{
      productName: string;
      proposedPrice: number;
      commissionPercent?: number;
      priceAfterCommission?: number;
      photos?: string[];
    }>;
    try {
      items = JSON.parse(body.items || "[]");
    } catch {
      throw new BadRequestException("Invalid items JSON");
    }
    if (!items.length) throw new BadRequestException("At least one product item is required");

    const contractFile = files?.find((f) => f.fieldname === "contract");
    const contractDoc = contractFile
      ? await this.cloudinary.uploadFile(contractFile, "deposit-contracts")
      : undefined;

    items = await Promise.all(
      items.map(async (item, index) => {
        const itemPhotoFiles = (files || []).filter(
          (f) => f.fieldname === `itemPhotos_${index}`,
        );
        const itemPhotos = await this.cloudinary.uploadFiles(
          itemPhotoFiles,
          "deposit-requests",
        );
        return { ...item, photos: itemPhotos };
      }),
    );

    return this.depositRequestService.createAdmin({
      coClientId,
      message: body.message,
      contractDoc,
      items,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Backoffice listing of deposit requests" })
  findAll(@Query() query: DepositRequestQueryDto) {
    return this.depositRequestService.findAll(query);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Backoffice deposit request detail" })
  findOne(@Param("id") id: string) {
    return this.depositRequestService.findOne(id);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update deposit request status" })
  updateStatus(@Param("id") id: string, @Body() dto: UpdateDepositRequestStatusDto) {
    return this.depositRequestService.updateStatus(id, dto);
  }
}
