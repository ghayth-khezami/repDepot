import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCoClientDto } from "./dto/create-co-client.dto";
import { CoClientQueryDto } from "./dto/co-client-query.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { stageOf } from "../product/lifecycle";

@Injectable()
export class CoClientService {
  constructor(private prisma: PrismaService) {}

  async create(createCoClientDto: CreateCoClientDto) {
    const { password, ...data } = createCoClientDto;
    const email = data.email?.trim().toLowerCase() || null;

    const samePhone = await this.prisma.coClient.findUnique({
      where: { phoneNumber: data.phoneNumber },
      select: { id: true },
    });
    if (samePhone) {
      throw new ConflictException("Un déposant existe déjà avec ce numéro de téléphone.");
    }
    if (email) {
      const sameEmail = await this.prisma.coClient.findUnique({ where: { email }, select: { id: true } });
      if (sameEmail) throw new ConflictException("Un déposant existe déjà avec cet email.");
    }
    if (password) {
      if (!email) throw new BadRequestException("Un email est requis pour créer un accès.");
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new BadRequestException("Un compte existe déjà avec cet email.");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let userId: string | undefined;
      if (password && email) {
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
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.phoneNumber,
          address: data.address ?? null,
          lat: data.lat ?? null,
          lng: data.lng ?? null,
          RIB: data.RIB ?? null,
          email,
          userId,
        },
      });
    });
  }

  async findAll(query: CoClientQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search, articles = "all" } = query;
    const actualLimit = Math.min(limit || 10, 50);
    const skip = (page - 1) * actualLimit;

    const term = search?.trim();
    const searchWhere: any = term
      ? {
          OR: [
            { firstName: { contains: term, mode: "insensitive" as const } },
            { lastName: { contains: term, mode: "insensitive" as const } },
            { email: { contains: term, mode: "insensitive" as const } },
            { phoneNumber: { contains: term.replace(/\s/g, ""), mode: "insensitive" as const } },
            { RIB: { contains: term, mode: "insensitive" as const } },
            ...(/^\d{1,6}$/.test(term) ? [{ number: Number(term) }] : []),
          ],
        }
      : {};
    const withArticles = { products: { some: {} } };
    const withoutArticles = { products: { none: {} } };
    const where = articles === "with" ? { ...searchWhere, ...withArticles } : articles === "without" ? { ...searchWhere, ...withoutArticles } : searchWhere;
    const [countAll, countWith] = await Promise.all([
      this.prisma.coClient.count({ where: searchWhere }),
      this.prisma.coClient.count({ where: { ...searchWhere, ...withArticles } }),
    ]);

    const [data, total] = await Promise.all([
      this.prisma.coClient.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, role: true } },
          _count: { select: { products: true, depositRequests: true } },
        },
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
        counts: { all: countAll, with: countWith, without: countAll - countWith },
      },
    };
  }

  /**
   * Déposant detail. Products of the dépôt flow hang off the déposant (coclientId) and their lot
   * (depositRequestId) — the old include only had `depositRequests.items` (web-form requests), so
   * the detail came back without any product. Products are returned flat AND grouped by lot.
   */
  async findOne(id: string) {
    const coClient = await this.prisma.coClient.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true } },
        depositRequests: {
          orderBy: { createdAt: "desc" },
          include: { items: true },
        },
        products: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            ref: true,
            productName: true,
            PrixVente: true,
            status: true,
            payoutStatus: true,
            soldAt: true,
            paidAt: true,
            depositRequestId: true,
            depositorAmountMillimes: true,
            photos: { select: { photoDoc: true }, take: 1 },
          },
        },
      },
    });

    if (!coClient) {
      throw new NotFoundException(`CoClient with ID ${id} not found`);
    }

    const products = coClient.products.map((p) => ({ ...p, stage: stageOf(p), photo: p.photos[0]?.photoDoc ?? null }));
    const lots = coClient.depositRequests
      .map((c) => ({
        id: c.id,
        contractNumber: c.contractNumber,
        createdAt: c.createdAt,
        products: products.filter((p) => p.depositRequestId === c.id),
      }))
      .filter((l) => l.products.length || l.contractNumber);
    const loose = products.filter((p) => !p.depositRequestId || !coClient.depositRequests.some((c) => c.id === p.depositRequestId));
    if (loose.length) lots.push({ id: "sans-lot", contractNumber: null, createdAt: coClient.createdAt, products: loose });

    return { ...coClient, products, lots };
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
      isDepot: p.isDepot,
      depotPercentage: p.depotPercentage,
      surcharge: p.surcharge,
      gain: p.gain,
      isDispo: p.isDispo,
      ref: p.ref,
      status: p.status,
      soldAt: p.soldAt,
      payoutStatus: p.payoutStatus,
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
