import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeEan13 } from "../common/barcode-label.util";
import { sanitizeProductForStorefront } from "../common/utils/sanitize-product";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  private async generateUniqueBarcode(): Promise<string> {
    for (let attempt = 0; attempt < 15; attempt++) {
      const ts = Date.now().toString().slice(-10);
      const rnd = Math.floor(Math.random() * 100).toString().padStart(2, "0");
      const code = `2${ts}${rnd}`.slice(0, 13);
      const existing = await this.prisma.product.findUnique({ where: { barcode: code } });
      if (!existing) return code;
    }
    throw new BadRequestException("Impossible de générer un code-barres unique.");
  }

  private async resolveBarcode(explicit?: string | null): Promise<string> {
    const trimmed = explicit?.trim();
    if (trimmed) {
      const taken = await this.prisma.product.findUnique({ where: { barcode: trimmed } });
      if (taken) throw new BadRequestException("Ce code-barres est déjà utilisé.");
      return trimmed;
    }
    return this.generateUniqueBarcode();
  }

  private computeGain(payload: {
    isDepot: boolean;
    PrixVente: number;
    PrixAchat?: number | null;
    depotPercentage?: number | null;
    surcharge?: number | null;
  }) {
    const surcharge = payload.surcharge || 0;
    if (payload.isDepot) {
      const depotGain = payload.PrixVente * ((payload.depotPercentage || 0) / 100);
      return depotGain - surcharge;
    }
    return payload.PrixVente - surcharge - (payload.PrixAchat || 0);
  }

  async create(createProductDto: CreateProductDto) {
    const gain = this.computeGain(createProductDto);
    const isDispo = createProductDto.stockQuantity > 0;
    const barcode = await this.resolveBarcode(createProductDto.barcode);

    return this.prisma.product.create({
      data: {
        ...createProductDto,
        barcode,
        gain: gain || 0,
        surcharge: createProductDto.surcharge || 0,
        isDispo,
      },
      include: {
        category: {
          select: {
            id: true,
            categoryName: true,
          },
        },
        mark: {
          select: { id: true, name: true, logoDoc: true },
        },
        coClient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        photos: true,
      },
    });
  }

  async createWithPhotos(
    createProductDto: CreateProductDto,
    photoDocs: string[],
    marqueDoc?: string | null,
  ) {
    const gain = this.computeGain(createProductDto);
    const isDispo = createProductDto.stockQuantity > 0;
    const barcode = await this.resolveBarcode(createProductDto.barcode);
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...createProductDto,
          barcode,
          gain: gain || 0,
          surcharge: createProductDto.surcharge || 0,
          isDispo,
          ...(marqueDoc ? { marqueDoc } : {}),
        },
      });

      if (photoDocs.length > 0) {
        await tx.productPhoto.createMany({
          data: photoDocs.map((photoDoc) => ({
            idProduct: product.id,
            photoDoc,
          })),
        });
      }

      return tx.product.findUnique({
        where: { id: product.id },
        include: {
          category: true,
          mark: { select: { id: true, name: true, logoDoc: true } },
          coClient: true,
          photos: true,
        },
      });
    });
  }

  async findAll(
    query: ProductQueryDto,
    options?: { sanitize?: boolean },
  ): Promise<PaginatedResponse<any>> {
    const sanitize = options?.sanitize !== false;
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      subCategoryId,
      subSubCategory1Id,
      subSubCategory2Id,
      subSubCategory3Id,
      markId,
      coclientId,
      isDepot,
      minPrice,
      maxPrice,
      isDispo,
      sort,
    } = query;
    const actualLimit = Math.min(limit || 10, 50);
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

    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    }

    if (subSubCategory1Id) {
      where.subSubCategory1Id = subSubCategory1Id;
    }

    if (subSubCategory2Id) {
      where.subSubCategory2Id = subSubCategory2Id;
    }

    if (subSubCategory3Id) {
      where.subSubCategory3Id = subSubCategory3Id;
    }

    if (markId) {
      where.markId = markId;
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

    if (isDispo !== undefined) {
      where.isDispo = isDispo;
    }

    const orderBy =
      sort === "price_asc"
        ? { PrixVente: "asc" as const }
        : sort === "price_desc"
          ? { PrixVente: "desc" as const }
          : sort === "name_asc"
            ? { productName: "asc" as const }
            : { createdAt: "desc" as const };

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
          subCategory: {
            select: {
              id: true,
              title: true,
            },
          },
          subSubCategory1: { select: { id: true, title: true } },
          subSubCategory2: { select: { id: true, title: true } },
          subSubCategory3: { select: { id: true, title: true } },
          mark: {
            select: {
              id: true,
              name: true,
              logoDoc: true,
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
        orderBy,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Add sold status to each product
    const productsWithSoldStatus = data.map((product) => {
      const { commandDetails, ...rest } = product;
      const hasSoldCommand = commandDetails.some(
        (detail) => detail.command.status === "DELIVERED",
      );
      const withSold = { ...rest, isSold: hasSoldCommand };
      return sanitize ? sanitizeProductForStorefront(withSold) : withSold;
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
        subCategory: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
        subSubCategory1: { select: { id: true, title: true } },
        subSubCategory2: { select: { id: true, title: true } },
        subSubCategory3: { select: { id: true, title: true } },
        mark: {
          select: {
            id: true,
            name: true,
            logoDoc: true,
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

  async findOnePublic(id: string) {
    const product = await this.findOne(id);
    return sanitizeProductForStorefront(product);
  }

  private barcodeLookupCandidates(raw: string): string[] {
    const trimmed = raw.trim().replace(/\s/g, "");
    if (!trimmed) return [];

    const digits = trimmed.replace(/\D/g, "");
    const candidates = new Set<string>([trimmed]);
    if (digits) {
      candidates.add(digits);
      candidates.add(normalizeEan13(digits));
      if (digits.length === 13 && digits.startsWith("0")) {
        candidates.add(digits.slice(1));
      }
      if (digits.length === 12) {
        candidates.add(`0${digits}`);
        candidates.add(normalizeEan13(`0${digits}`));
      }
    }
    return [...candidates].filter(Boolean);
  }

  async findByBarcode(barcode: string) {
    const candidates = this.barcodeLookupCandidates(barcode);
    if (!candidates.length) {
      throw new BadRequestException("Code-barres invalide.");
    }

    const include = {
      category: { select: { id: true, categoryName: true } },
      subCategory: { select: { id: true, title: true } },
      mark: { select: { id: true, name: true, logoDoc: true } },
      coClient: { select: { id: true, firstName: true, lastName: true } },
      photos: true,
    } as const;

    for (const code of candidates) {
      const product = await this.prisma.product.findUnique({
        where: { barcode: code },
        include,
      });
      if (product) return product;
    }

    throw new NotFoundException("Produit introuvable pour ce code-barres.");
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

    const gain = this.computeGain({
      isDepot,
      PrixVente,
      PrixAchat,
      depotPercentage,
      surcharge,
    });

    const nextStock =
      updateProductDto.stockQuantity !== undefined
        ? updateProductDto.stockQuantity
        : existingProduct.stockQuantity;
    const isDispo =
      updateProductDto.isDispo !== undefined
        ? updateProductDto.isDispo
        : updateProductDto.stockQuantity !== undefined
          ? updateProductDto.stockQuantity > 0
          : existingProduct.isDispo;

    return this.prisma.product.update({
      where: { id },
      data: {
        ...updateProductDto,
        gain,
        surcharge: surcharge || 0,
        stockQuantity: nextStock,
        isDispo,
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
        photos: {
          select: { id: true, photoDoc: true },
        },
      },
    });
  }

  async setBrandMark(id: string, marqueRelativePath: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { marqueDoc: marqueRelativePath },
      include: {
        category: { select: { id: true, categoryName: true } },
        coClient: { select: { id: true, firstName: true, lastName: true } },
        photos: true,
      },
    });
  }

  async clearBrandMark(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { marqueDoc: null },
      include: {
        category: { select: { id: true, categoryName: true } },
        coClient: { select: { id: true, firstName: true, lastName: true } },
        photos: true,
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

  private readonly storefrontInclude = {
    category: {
      select: {
        id: true,
        categoryName: true,
      },
    },
    subCategory: {
      select: {
        id: true,
        title: true,
      },
    },
    mark: {
      select: {
        id: true,
        name: true,
        logoDoc: true,
      },
    },
    photos: {
      select: {
        id: true,
        photoDoc: true,
      },
    },
  };

  async getFeaturedProducts() {
    const rows = await this.prisma.featuredProduct.findMany({
      orderBy: { sortOrder: "asc" },
      take: 8,
      include: {
        product: {
          include: this.storefrontInclude,
        },
      },
    });
    return rows.map((row) => sanitizeProductForStorefront(row.product));
  }

  async getFeaturedProductIds() {
    const rows = await this.prisma.featuredProduct.findMany({
      orderBy: { sortOrder: "asc" },
      select: { productId: true },
    });
    return rows.map((row) => row.productId);
  }

  async setFeaturedProducts(productIds: string[]) {
    if (productIds.length > 8) {
      throw new BadRequestException("Maximum 8 featured products allowed");
    }

    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length !== productIds.length) {
      throw new BadRequestException("Duplicate product IDs are not allowed");
    }

    if (uniqueIds.length > 0) {
      const found = await this.prisma.product.count({
        where: { id: { in: uniqueIds } },
      });
      if (found !== uniqueIds.length) {
        throw new BadRequestException("One or more products were not found");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.featuredProduct.deleteMany();
      if (uniqueIds.length > 0) {
        await tx.featuredProduct.createMany({
          data: uniqueIds.map((productId, index) => ({
            productId,
            sortOrder: index + 1,
          })),
        });
      }
    });

    return this.getFeaturedProducts();
  }
}
