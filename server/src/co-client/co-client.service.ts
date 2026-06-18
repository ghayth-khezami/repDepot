import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCoClientDto } from "./dto/create-co-client.dto";
import { CoClientQueryDto } from "./dto/co-client-query.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";

@Injectable()
export class CoClientService {
  constructor(private prisma: PrismaService) {}

  async create(createCoClientDto: CreateCoClientDto) {
    const { password, ...data } = createCoClientDto;
    const email = data.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException("Un compte existe déjà avec cet email.");
    }

  return this.prisma.$transaction(async (tx) => {
      let userId: string | undefined;
      if (password) {
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await tx.user.create({
          data: {
            email,
            password: passwordHash,
            role: UserRole.DEPOSER,
            isVerified: true,
            username: `${data.firstName} ${data.lastName}`.trim(),
          },
        });
        userId = user.id;
      }

      return tx.coClient.create({
        data: {
          ...data,
          email,
          userId,
        },
      });
    });
  }

  async findAll(query: CoClientQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search } = query;
    const actualLimit = Math.min(limit || 10, 50);
    const skip = (page - 1) * actualLimit;

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phoneNumber: { contains: search, mode: "insensitive" as const } },
            { RIB: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.coClient.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, role: true } } },
      }),
      this.prisma.coClient.count({ where }),
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
    const coClient = await this.prisma.coClient.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true } },
        depositRequests: {
          orderBy: { createdAt: "desc" },
          include: { items: true },
        },
      },
    });

    if (!coClient) {
      throw new NotFoundException(`CoClient with ID ${id} not found`);
    }

    return coClient;
  }

  async getProductHistory(coClientId: string) {
    await this.findOne(coClientId);

    const products = await this.prisma.product.findMany({
      where: {
        coclientId: coClientId,
      },
      include: {
        category: {
          select: { id: true, categoryName: true },
        },
        photos: {
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return products.map((p) => ({
      id: p.id,
      productName: p.productName,
      description: p.description,
      PrixVente: p.PrixVente,
      PrixAchat: p.PrixAchat,
      stockQuantity: p.stockQuantity,
      isDepot: p.isDepot,
      depotPercentage: p.depotPercentage,
      surcharge: p.surcharge,
      gain: p.gain,
      isDispo: p.isDispo,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      category: p.category,
      photo: p.photos?.[0]?.photoDoc || null,
    }));
  }

  async getDepositHistory(coClientId: string) {
    return this.prisma.depositRequest.findMany({
      where: { coClientId },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.coClient.delete({
      where: { id },
    });

    return { message: "CoClient deleted successfully" };
  }
}
