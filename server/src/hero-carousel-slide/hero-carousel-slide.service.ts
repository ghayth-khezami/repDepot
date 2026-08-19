import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { HeroCarouselSlideQueryDto } from "./dto/hero-carousel-slide-query.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";

export type HeroCarouselSlideInput = {
  imageDoc: string;
  imageAlt?: string;
  sortOrder?: number;
  isPublished?: boolean;
  imageOnly?: boolean;
  arabicWelcome?: string | null;
  title?: string | null;
  subtitle?: string | null;
  description?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaType?: string | null;
  align?: string | null;
};

@Injectable()
export class HeroCarouselSlideService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: HeroCarouselSlideQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search } = query;
    const actualLimit = Math.min(limit || 10, 50);
    const skip = (page - 1) * actualLimit;
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { imageAlt: { contains: search, mode: "insensitive" } },
        { title: { contains: search, mode: "insensitive" } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.heroCarouselSlide.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      this.prisma.heroCarouselSlide.count({ where }),
    ]);
    return {
      data,
      meta: { page, limit: actualLimit, total, totalPages: Math.ceil(total / actualLimit) },
    };
  }

  async findPublished() {
    return this.prisma.heroCarouselSlide.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.heroCarouselSlide.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Hero carousel slide ${id} not found`);
    return row;
  }

  async create(data: HeroCarouselSlideInput) {
    return this.prisma.heroCarouselSlide.create({
      data: {
        imageDoc: data.imageDoc,
        imageAlt: data.imageAlt ?? "",
        sortOrder: data.sortOrder ?? 0,
        isPublished: data.isPublished ?? true,
        imageOnly: data.imageOnly ?? true,
        arabicWelcome: data.arabicWelcome ?? null,
        title: data.title ?? null,
        subtitle: data.subtitle ?? null,
        description: data.description ?? null,
        ctaLabel: data.ctaLabel ?? null,
        ctaHref: data.ctaHref ?? null,
        ctaType: data.ctaType ?? null,
        align: data.align ?? null,
      },
    });
  }

  async update(id: string, data: Partial<HeroCarouselSlideInput>) {
    await this.findOne(id);
    return this.prisma.heroCarouselSlide.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.heroCarouselSlide.delete({ where: { id } });
    return { message: "Hero carousel slide deleted successfully" };
  }
}
