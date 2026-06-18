import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaginatedResponse } from "../common/dto/pagination.dto";

const productInclude = {
  category: { select: { id: true, categoryName: true } },
  photos: true,
} as const;

@Injectable()
export class LikesService {
  constructor(private prisma: PrismaService) {}

  async check(userId: string, productIds: string[]) {
    const unique = [...new Set(productIds)].filter(Boolean);
    if (unique.length === 0) return { likedIds: [] as string[] };

    const rows = await this.prisma.userLike.findMany({
      where: { userId, productId: { in: unique } },
      select: { productId: true },
    });
    return { likedIds: rows.map((r) => r.productId) };
  }

  async add(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException("Product not found");

    await this.prisma.userLike.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
    return { liked: true as const };
  }

  async remove(userId: string, productId: string) {
    await this.prisma.userLike.deleteMany({
      where: { userId, productId },
    });
    return { liked: false as const };
  }

  async listMine(userId: string, page = 1, limit = 12): Promise<PaginatedResponse<unknown>> {
    const take = Math.min(Math.max(limit, 1), 30);
    const skip = (Math.max(page, 1) - 1) * take;

    const [total, likes] = await Promise.all([
      this.prisma.userLike.count({ where: { userId } }),
      this.prisma.userLike.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: {
          product: { include: productInclude },
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / take));
    return {
      data: likes.map((l) => l.product),
      meta: { page: Math.max(page, 1), limit: take, total, totalPages },
    };
  }
}
