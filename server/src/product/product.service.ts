import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    const {
      isDepot,
      PrixVente,
      PrixAchat,
      depotPercentage,
      surcharge = 0,
    } = createProductDto;

    // Calculate gain based on mode
    let gain = 0;
    if (isDepot) {
      // Depot mode: gain = (PrixVente * depotPercentage/100) - surcharge
      const depotGain = PrixVente * ((depotPercentage || 0) / 100);
      gain = depotGain - surcharge;
    } else {
      // Normal mode: gain = PrixVente - surcharge - PrixAchat
      gain = PrixVente - surcharge - (PrixAchat || 0);
    }

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        gain,
        surcharge: surcharge || 0,
      },
      include: {
        category: {
          select: {
            id: true,
            categoryName: true,
          },
        },
        coClient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(query: ProductQueryDto): Promise<PaginatedResponse<any>> {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      coclientId,
      isDepot,
      minPrice,
      maxPrice,
    } = query;
    const actualLimit = Math.min(limit || 10, 10); // Enforce max 10
    const skip = (page - 1) * actualLimit;

    const where: any = {};

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (coclientId) {
      where.coclientId = coclientId;
    }

    if (isDepot !== undefined) {
      where.isDepot = isDepot;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.PrixVente = {};
      if (minPrice !== undefined) {
        where.PrixVente.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.PrixVente.lte = maxPrice;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: actualLimit,
        include: {
          category: {
            select: {
              id: true,
              categoryName: true,
            },
          },
          coClient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          photos: {
            select: {
              id: true,
              photoDoc: true,
            },
            take: 1,
          },
          commandDetails: {
            include: {
              command: {
                select: {
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Add sold status to each product
    const productsWithSoldStatus = data.map((product) => {
      const hasSoldCommand = product.commandDetails.some(
        (detail) =>
          detail.command.status === "DELIVERED" ||
          detail.command.status === "GOT_PROFIT",
      );
      return {
        ...product,
        isSold: hasSoldCommand,
      };
    });

    return {
      data: productsWithSoldStatus,
      meta: {
        page,
        limit: actualLimit,
        total,
        totalPages: Math.ceil(total / actualLimit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            categoryName: true,
            description: true,
          },
        },
        coClient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        photos: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const existingProduct = await this.findOne(id);

    // Get current values or use updated values
    const isDepot =
      updateProductDto.isDepot !== undefined
        ? updateProductDto.isDepot
        : existingProduct.isDepot;
    const PrixVente =
      updateProductDto.PrixVente !== undefined
        ? updateProductDto.PrixVente
        : existingProduct.PrixVente;
    const PrixAchat =
      updateProductDto.PrixAchat !== undefined
        ? updateProductDto.PrixAchat
        : existingProduct.PrixAchat;
    const depotPercentage =
      updateProductDto.depotPercentage !== undefined
        ? updateProductDto.depotPercentage
        : existingProduct.depotPercentage;
    const surcharge =
      updateProductDto.surcharge !== undefined
        ? updateProductDto.surcharge
        : existingProduct.surcharge || 0;

    // Calculate gain based on mode
    let gain = 0;
    if (isDepot) {
      // Depot mode: gain = (PrixVente * depotPercentage/100) - surcharge
      const depotGain = PrixVente * ((depotPercentage || 0) / 100);
      gain = depotGain - surcharge;
    } else {
      // Normal mode: gain = PrixVente - surcharge - PrixAchat
      gain = PrixVente - surcharge - (PrixAchat || 0);
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        gain,
        surcharge: surcharge || 0,
      },
      include: {
        category: {
          select: {
            id: true,
            categoryName: true,
          },
        },
        coClient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.product.delete({
      where: { id },
    });

    return { message: "Product deleted successfully" };
  }
}
