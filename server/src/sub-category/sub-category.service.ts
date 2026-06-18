import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { CreateSubCategoryDto } from "./dto/create-sub-category.dto";
import { UpdateSubCategoryDto } from "./dto/update-sub-category.dto";
import { SubCategoryQueryDto } from "./dto/sub-category-query.dto";

@Injectable()
export class SubCategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSubCategoryDto) {
    return this.prisma.subCategory.create({
      data: dto,
      include: {
        category: { select: { id: true, categoryName: true } },
        _count: { select: { products: true } },
      },
    });
  }

  async findAll(query: SubCategoryQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search, categoryId } = query;
    const actualLimit = Math.min(limit || 10, 10);
    const skip = (page - 1) * actualLimit;

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.subCategory.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: { title: "asc" },
        include: {
          category: { select: { id: true, categoryName: true } },
          _count: { select: { products: true } },
        },
      }),
      this.prisma.subCategory.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit: actualLimit, total, totalPages: Math.ceil(total / actualLimit) },
    };
  }

  async findOne(id: string) {
    const row = await this.prisma.subCategory.findUnique({
      where: { id },
      include: {
        category: true,
        _count: { select: { products: true } },
      },
    });
    if (!row) throw new NotFoundException(`SubCategory ${id} not found`);
    return row;
  }

  async update(id: string, dto: UpdateSubCategoryDto) {
    await this.findOne(id);
    return this.prisma.subCategory.update({
      where: { id },
      data: dto,
      include: {
        category: { select: { id: true, categoryName: true } },
        _count: { select: { products: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.subCategory.delete({ where: { id } });
    return { message: "SubCategory deleted successfully" };
  }
}
