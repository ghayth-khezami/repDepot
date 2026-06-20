import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import {
  CreateSubSubCategory1Dto,
  CreateSubSubCategory2Dto,
  CreateSubSubCategory3Dto,
} from "./dto/create-sub-sub-category.dto";
import {
  UpdateSubSubCategory1Dto,
  UpdateSubSubCategory2Dto,
  UpdateSubSubCategory3Dto,
} from "./dto/update-sub-sub-category.dto";
import {
  SubSubCategory1QueryDto,
  SubSubCategory2QueryDto,
  SubSubCategory3QueryDto,
} from "./dto/sub-sub-category-query.dto";

@Injectable()
export class SubSubCategoryService {
  constructor(private prisma: PrismaService) {}

  private clampLimit(limit?: number) {
    return Math.min(Math.max(limit || 10, 1), 100);
  }

  create1(dto: CreateSubSubCategory1Dto) {
    return this.prisma.subSubCategory1.create({
      data: dto,
      include: {
        subCategory: {
          select: {
            id: true,
            title: true,
            category: { select: { id: true, categoryName: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });
  }

  async findAll1(query: SubSubCategory1QueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit, search, subCategoryId } = query;
    const actualLimit = this.clampLimit(limit);
    const skip = (page - 1) * actualLimit;
    const where: Record<string, unknown> = {};
    if (subCategoryId) where.subCategoryId = subCategoryId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.subSubCategory1.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: { title: "asc" },
        include: {
          subCategory: {
            select: {
              id: true,
              title: true,
              category: { select: { id: true, categoryName: true } },
            },
          },
          _count: { select: { products: true } },
        },
      }),
      this.prisma.subSubCategory1.count({ where }),
    ]);
    return {
      data,
      meta: { page, limit: actualLimit, total, totalPages: Math.ceil(total / actualLimit) },
    };
  }

  async findOne1(id: string) {
    const row = await this.prisma.subSubCategory1.findUnique({
      where: { id },
      include: {
        subCategory: { include: { category: true } },
        _count: { select: { products: true } },
      },
    });
    if (!row) throw new NotFoundException(`SubSubCategory1 ${id} not found`);
    return row;
  }

  async update1(id: string, dto: UpdateSubSubCategory1Dto) {
    await this.findOne1(id);
    return this.prisma.subSubCategory1.update({
      where: { id },
      data: dto,
      include: {
        subCategory: {
          select: {
            id: true,
            title: true,
            category: { select: { id: true, categoryName: true } },
          },
        },
        _count: { select: { products: true } },
      },
    });
  }

  async remove1(id: string) {
    await this.findOne1(id);
    await this.prisma.subSubCategory1.delete({ where: { id } });
    return { message: "SubSubCategory1 deleted successfully" };
  }

  create2(dto: CreateSubSubCategory2Dto) {
    return this.prisma.subSubCategory2.create({
      data: dto,
      include: {
        subSubCategory1: {
          select: {
            id: true,
            title: true,
            subCategory: {
              select: {
                id: true,
                title: true,
                category: { select: { id: true, categoryName: true } },
              },
            },
          },
        },
        _count: { select: { products: true } },
      },
    });
  }

  async findAll2(query: SubSubCategory2QueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit, search, subSubCategory1Id } = query;
    const actualLimit = this.clampLimit(limit);
    const skip = (page - 1) * actualLimit;
    const where: Record<string, unknown> = {};
    if (subSubCategory1Id) where.subSubCategory1Id = subSubCategory1Id;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.subSubCategory2.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: { title: "asc" },
        include: {
          subSubCategory1: {
            select: {
              id: true,
              title: true,
              subCategory: {
                select: {
                  id: true,
                  title: true,
                  category: { select: { id: true, categoryName: true } },
                },
              },
            },
          },
          _count: { select: { products: true } },
        },
      }),
      this.prisma.subSubCategory2.count({ where }),
    ]);
    return {
      data,
      meta: { page, limit: actualLimit, total, totalPages: Math.ceil(total / actualLimit) },
    };
  }

  async findOne2(id: string) {
    const row = await this.prisma.subSubCategory2.findUnique({
      where: { id },
      include: {
        subSubCategory1: { include: { subCategory: { include: { category: true } } } },
        _count: { select: { products: true } },
      },
    });
    if (!row) throw new NotFoundException(`SubSubCategory2 ${id} not found`);
    return row;
  }

  async update2(id: string, dto: UpdateSubSubCategory2Dto) {
    await this.findOne2(id);
    return this.prisma.subSubCategory2.update({
      where: { id },
      data: dto,
      include: {
        subSubCategory1: {
          select: {
            id: true,
            title: true,
            subCategory: {
              select: {
                id: true,
                title: true,
                category: { select: { id: true, categoryName: true } },
              },
            },
          },
        },
        _count: { select: { products: true } },
      },
    });
  }

  async remove2(id: string) {
    await this.findOne2(id);
    await this.prisma.subSubCategory2.delete({ where: { id } });
    return { message: "SubSubCategory2 deleted successfully" };
  }

  create3(dto: CreateSubSubCategory3Dto) {
    return this.prisma.subSubCategory3.create({
      data: dto,
      include: {
        subSubCategory2: {
          select: {
            id: true,
            title: true,
            subSubCategory1: {
              select: {
                id: true,
                title: true,
                subCategory: {
                  select: {
                    id: true,
                    title: true,
                    category: { select: { id: true, categoryName: true } },
                  },
                },
              },
            },
          },
        },
        _count: { select: { products: true } },
      },
    });
  }

  async findAll3(query: SubSubCategory3QueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit, search, subSubCategory2Id } = query;
    const actualLimit = this.clampLimit(limit);
    const skip = (page - 1) * actualLimit;
    const where: Record<string, unknown> = {};
    if (subSubCategory2Id) where.subSubCategory2Id = subSubCategory2Id;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.subSubCategory3.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: { title: "asc" },
        include: {
          subSubCategory2: {
            select: {
              id: true,
              title: true,
              subSubCategory1: {
                select: {
                  id: true,
                  title: true,
                  subCategory: {
                    select: {
                      id: true,
                      title: true,
                      category: { select: { id: true, categoryName: true } },
                    },
                  },
                },
              },
            },
          },
          _count: { select: { products: true } },
        },
      }),
      this.prisma.subSubCategory3.count({ where }),
    ]);
    return {
      data,
      meta: { page, limit: actualLimit, total, totalPages: Math.ceil(total / actualLimit) },
    };
  }

  async findOne3(id: string) {
    const row = await this.prisma.subSubCategory3.findUnique({
      where: { id },
      include: {
        subSubCategory2: {
          include: {
            subSubCategory1: { include: { subCategory: { include: { category: true } } } },
          },
        },
        _count: { select: { products: true } },
      },
    });
    if (!row) throw new NotFoundException(`SubSubCategory3 ${id} not found`);
    return row;
  }

  async update3(id: string, dto: UpdateSubSubCategory3Dto) {
    await this.findOne3(id);
    return this.prisma.subSubCategory3.update({
      where: { id },
      data: dto,
      include: {
        subSubCategory2: {
          select: {
            id: true,
            title: true,
            subSubCategory1: {
              select: {
                id: true,
                title: true,
                subCategory: {
                  select: {
                    id: true,
                    title: true,
                    category: { select: { id: true, categoryName: true } },
                  },
                },
              },
            },
          },
        },
        _count: { select: { products: true } },
      },
    });
  }

  async remove3(id: string) {
    await this.findOne3(id);
    await this.prisma.subSubCategory3.delete({ where: { id } });
    return { message: "SubSubCategory3 deleted successfully" };
  }
}
