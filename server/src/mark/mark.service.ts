import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MarkQueryDto } from "./dto/mark-query.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";

@Injectable()
export class MarkService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: MarkQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search } = query;
    const actualLimit = Math.min(limit || 10, 50);
    const skip = (page - 1) * actualLimit;
    const where: Record<string, unknown> = {};
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    const [data, total] = await Promise.all([
      this.prisma.mark.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.mark.count({ where }),
    ]);
    return {
      data,
      meta: { page, limit: actualLimit, total, totalPages: Math.ceil(total / actualLimit) },
    };
  }

  async findAllPublished() {
    return this.prisma.mark.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.mark.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!row) throw new NotFoundException(`Mark ${id} not found`);
    return row;
  }

  async create(data: { name: string; logoDoc: string; sortOrder?: number }) {
    return this.prisma.mark.create({
      data: {
        name: data.name,
        logoDoc: data.logoDoc,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: string,
    data: { name?: string; logoDoc?: string; sortOrder?: number },
  ) {
    await this.findOne(id);
    return this.prisma.mark.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.mark.delete({ where: { id } });
    return { message: "Mark deleted successfully" };
  }
}
