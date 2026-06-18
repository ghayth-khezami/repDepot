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
import { diskStorage } from "multer";
import { extname, join } from "path";
import * as fs from "fs";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@prisma/client";
import { Throttle } from "@nestjs/throttler";
import { imageFileFilter, safeImageExtension } from "../common/utils/image-upload";
import { DepositRequestService } from "./deposit-request.service";
import { CreateDepositRequestDto } from "./dto/create-deposit-request.dto";
import { DepositRequestQueryDto } from "./dto/deposit-request-query.dto";
import { UpdateDepositRequestStatusDto } from "./dto/update-deposit-request-status.dto";

const requestsDir = join(process.cwd(), "uploads", "requests");
const contractsDir = join(process.cwd(), "uploads", "contracts");
for (const dir of [requestsDir, contractsDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const depositStorage = diskStorage({
  destination: (_req, file, cb) => {
    cb(null, file.fieldname === "contract" ? contractsDir : requestsDir);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const prefix = file.fieldname === "contract" ? "contract" : "deposit";
    cb(null, `${prefix}-${unique}${safeImageExtension(file.originalname)}`);
  },
});

const publicDepositUpload = AnyFilesInterceptor({
  storage: depositStorage,
  limits: { fileSize: 6 * 1024 * 1024, files: 6 },
  fileFilter: imageFileFilter,
});

@ApiTags("deposit-requests")
@Controller("deposit-requests")
export class DepositRequestController {
  constructor(private readonly depositRequestService: DepositRequestService) {}

  @Post()
  @Throttle({ deposit: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(publicDepositUpload)
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
  create(
    @Body() dto: CreateDepositRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const safeFiles = (files || []).filter((f) => f.fieldname !== "contract");
    const paths = safeFiles
      .filter((f) => f.fieldname === "photos" || f.fieldname.startsWith("photos"))
      .map((file) => `/uploads/requests/${file.filename}`);
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
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: depositStorage,
      limits: { fileSize: 6 * 1024 * 1024 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Create a deposit request for current user" })
  createMine(
    @Req() req: any,
    @Body() dto: CreateDepositRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const paths = (files || [])
      .filter((f) => f.fieldname === "photos" || f.fieldname.startsWith("photos"))
      .map((file) => `/uploads/requests/${file.filename}`);
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
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: depositStorage,
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Admin: create deposit request for a deposant" })
  createAdmin(
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
      ? `/uploads/contracts/${contractFile.filename}`
      : undefined;

    items = items.map((item, index) => {
      const itemPhotos = (files || [])
        .filter((f) => f.fieldname === `itemPhotos_${index}`)
        .map((f) => `/uploads/requests/${f.filename}`);
      return { ...item, photos: itemPhotos };
    });

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
