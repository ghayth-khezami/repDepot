import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDepositRequestDto } from "./dto/create-deposit-request.dto";
import { DepositRequestQueryDto } from "./dto/deposit-request-query.dto";
import { UpdateDepositRequestStatusDto } from "./dto/update-deposit-request-status.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";

export type DepositRequestItemInput = {
  productName: string;
  proposedPrice: number;
  commissionPercent?: number;
  priceAfterCommission?: number;
  photos?: string[];
};

@Injectable()
export class DepositRequestService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateDepositRequestDto, photos: string[], userId?: string | null) {
    return this.prisma.depositRequest.create({
      data: {
        ...dto,
        photos,
        userId: userId || null,
      },
    });
  }

  async createAdmin(payload: {
    coClientId: string;
    message?: string;
    contractDoc?: string;
    items: DepositRequestItemInput[];
  }) {
    const coClient = await this.prisma.coClient.findUnique({
      where: { id: payload.coClientId },
    });
    if (!coClient) throw new NotFoundException("Deposant introuvable.");

    const total = payload.items.reduce((s, i) => s + i.proposedPrice, 0);
    const flatPhotos = payload.items.flatMap((i) => i.photos || []);

    return this.prisma.depositRequest.create({
      data: {
        coClientId: payload.coClientId,
        fullName: `${coClient.firstName} ${coClient.lastName}`.trim(),
        phoneNumber: coClient.phoneNumber,
        proposedPrice: total,
        message: payload.message,
        photos: flatPhotos,
        contractDoc: payload.contractDoc,
        items: {
          create: payload.items.map((item) => ({
            productName: item.productName,
            proposedPrice: item.proposedPrice,
            commissionPercent: item.commissionPercent,
            priceAfterCommission: item.priceAfterCommission,
            photos: item.photos || [],
          })),
        },
      },
      include: { items: true, coClient: true },
    });
  }

  findMine(userId: string) {
    return this.prisma.depositRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
  }

  async findAll(query: DepositRequestQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search, status } = query;
    const actualLimit = Math.min(limit || 10, 50);
    const skip = (page - 1) * actualLimit;

    const where: any = {};
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.depositRequest.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: { createdAt: "desc" },
        include: {
          coClient: { select: { id: true, firstName: true, lastName: true } },
          items: true,
        },
      }),
      this.prisma.depositRequest.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit: actualLimit,
        total,
        totalPages: Math.ceil(total / actualLimit),
      },
    };
  }

  async findOne(id: string) {
    const req = await this.prisma.depositRequest.findUnique({
      where: { id },
      include: {
        coClient: true,
        items: true,
      },
    });
    if (!req) throw new NotFoundException("Deposit request not found.");
    return req;
  }

  updateStatus(id: string, dto: UpdateDepositRequestStatusDto) {
    return this.prisma.depositRequest.update({
      where: { id },
      data: { status: dto.status },
      include: { items: true, coClient: true },
    });
  }
}
