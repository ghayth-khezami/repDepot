import { publishProductStatusChanged } from "../common/domain-events";
import { COMMISSION_MESSAGE, isAllowedCommission } from "../common/commission";
import { assertTransition, ProductStage, stageData, stageOf } from "./lifecycle";
import { deposantSearchClauses } from "./deposant-search";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PayoutStatus, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { fromMillimes, splitCommission, toMillimes } from "../common/utils/money";
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

  /** Optional explicit ref (admin edit). Omitted means DB default P-xxxxx (the dépôt flow sets D-x-y). */
  private async resolveRef(explicit?: string | null, excludeId?: string): Promise<string | undefined> {
    if (explicit === undefined || explicit === null) return undefined;
    const ref = explicit.trim().toUpperCase();
    if (!ref) throw new BadRequestException("La référence ne peut pas être vide.");
    const taken = await this.prisma.product.findUnique({ where: { ref }, select: { id: true } });
    if (taken && taken.id !== excludeId) throw new BadRequestException(`La référence ${ref} est déjà utilisée.`);
    return ref;
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

  /**
   * Single place where status, legacy isDispo, soldAt and payoutStatus are kept consistent.
   * isDispo (used by the storefront and orders) is true only while the product is EN_VENTE.
   */
  private resolveLifecycle(
    dto: { status?: ProductStatus; isDispo?: boolean; payoutStatus?: PayoutStatus | null },
    isDepot: boolean,
    existing?: { status: ProductStatus; soldAt: Date | null; payoutStatus: PayoutStatus | null },
  ) {
    let status: ProductStatus = existing?.status ?? ProductStatus.EN_VENTE;
    if (dto.status) status = dto.status;
    else if (dto.isDispo !== undefined) {
      status = dto.isDispo
        ? ProductStatus.EN_VENTE
        : existing?.status === ProductStatus.RETIRE
          ? ProductStatus.RETIRE
          : ProductStatus.VENDU;
    }
    const sold = status === ProductStatus.VENDU;
    return {
      status,
      isDispo: status === ProductStatus.EN_VENTE,
      soldAt: sold ? (existing?.soldAt ?? new Date()) : null,
      payoutStatus: sold
        ? (dto.payoutStatus ?? existing?.payoutStatus ?? (isDepot ? PayoutStatus.A_PERCEVOIR : null))
        : null,
    };
  }

  /** Millime-exact commission split for dépôt products (null for shop-owned products). */
  private computeSplit(isDepot: boolean, PrixVente: number, depotPercentage?: number | null) {
    if (!isDepot) return { shopAmountMillimes: null, depositorAmountMillimes: null };
    const split = splitCommission(toMillimes(PrixVente), depotPercentage ?? 0);
    return { shopAmountMillimes: split.shopMillimes, depositorAmountMillimes: split.depositorMillimes };
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
      const { shopMillimes } = splitCommission(toMillimes(payload.PrixVente), payload.depotPercentage || 0);
      return fromMillimes(shopMillimes - toMillimes(surcharge));
    }
    return payload.PrixVente - surcharge - (payload.PrixAchat || 0);
  }

  private async syncCategoryLinks(tx: any, productId: string, dto: CreateProductDto | UpdateProductDto) {
    const links = [
      ["productCategory", "categoryId", dto.categoryIds],
      ["productSubCategory", "subCategoryId", dto.subCategoryIds],
      ["productSubSubCategory1", "subSubCategoryId", dto.subSubCategory1Ids],
      ["productSubSubCategory2", "subSubCategoryId", dto.subSubCategory2Ids],
      ["productSubSubCategory3", "subSubCategoryId", dto.subSubCategory3Ids],
    ] as const;

    for (const [model, field, ids] of links) {
      if (ids === undefined) continue;
      await tx[model].deleteMany({ where: { productId } });
      if (ids.length > 0) {
        await tx[model].createMany({
          data: ids.map((id) => ({ productId, [field]: id })),
        });
      }
    }
  }

  async create(createProductDto: CreateProductDto) {
    const gain = this.computeGain(createProductDto);
    const lifecycle = this.resolveLifecycle(createProductDto, createProductDto.isDepot);
    const split = this.computeSplit(createProductDto.isDepot, createProductDto.PrixVente, createProductDto.depotPercentage);
    const barcode = await this.resolveBarcode(createProductDto.barcode);
    const ref = await this.resolveRef(createProductDto.ref);

    const { categoryIds, subCategoryIds, subSubCategory1Ids, subSubCategory2Ids, subSubCategory3Ids, ...productData } = createProductDto;
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
      data: {
        ...productData,
        barcode,
        ...(ref ? { ref } : {}),
        gain: gain || 0,
        surcharge: createProductDto.surcharge || 0,
        ...lifecycle,
        ...split,
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
        photos: true,
      },
      });
      await this.syncCategoryLinks(tx, product.id, createProductDto);
      return tx.product.findUniqueOrThrow({ where: { id: product.id }, include: { category: true, coClient: true, photos: true } });
    });
  }

  async createWithPhotos(
    createProductDto: CreateProductDto,
    photoDocs: string[],
  ) {
    const gain = this.computeGain(createProductDto);
    const lifecycle = this.resolveLifecycle(createProductDto, createProductDto.isDepot);
    const split = this.computeSplit(createProductDto.isDepot, createProductDto.PrixVente, createProductDto.depotPercentage);
    const barcode = await this.resolveBarcode(createProductDto.barcode);
    const ref = await this.resolveRef(createProductDto.ref);
    const { categoryIds, subCategoryIds, subSubCategory1Ids, subSubCategory2Ids, subSubCategory3Ids, ...productData } = createProductDto;
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          ...productData,
          barcode,
          ...(ref ? { ref } : {}),
          gain: gain || 0,
          surcharge: createProductDto.surcharge || 0,
          ...lifecycle,
          ...split,
        },
      });

      await this.syncCategoryLinks(tx, product.id, createProductDto);

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
      coclientId,
      isDepot,
      minPrice,
      maxPrice,
      isDispo,
      sort,
      age,
      status,
      depositRequestId,
      stage,
    } = query;
    const actualLimit = Math.min(limit || 10, 50);
    const skip = (page - 1) * actualLimit;

    const where: any = {};
    // Storefront: only published products. Admin: optional "published" filter.
    if (sanitize) where.isPublished = true;
    else if (query.published === "yes") where.isPublished = true;
    else if (query.published === "no") where.isPublished = false;

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { ref: { contains: search.trim(), mode: "insensitive" as const } },
        // Backoffice only: "karim" / "55863778" / "2" also find that déposant's articles.
        ...(sanitize ? [] : deposantSearchClauses(search)),
      ];
    }

    if (status) {
      where.status = status;
    }

    if (depositRequestId) {
      where.depositRequestId = depositRequestId;
    }

    if (stage && !sanitize) {
      if (stage === "PAYE") Object.assign(where, { status: ProductStatus.VENDU, payoutStatus: PayoutStatus.PAYE });
      else if (stage === "VENDU") Object.assign(where, { status: ProductStatus.VENDU, NOT: { payoutStatus: PayoutStatus.PAYE } });
      else where.status = stage;
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

    const AGE_TITLES: Record<string, string[]> = {
      "0-6": ["0-3 mois", "3-6 mois", "0-6 mois", "0-6"],
      "6-12": ["6-9 mois", "9-12 mois", "6-12 mois", "6-12"],
      "12-24": ["12-24 mois", "12-24"],
      "2-3": ["24-36 mois", "2-3 ans", "2 ans", "3 ans"],
      "4plus": ["4 ans", "5 ans", "6 ans", "4 ans et plus"],
    };
    const ageTitles = age ? AGE_TITLES[age] : undefined;
    if (ageTitles?.length) {
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { subSubCategory1: { title: { in: ageTitles } } },
            { subSubCategory2: { title: { in: ageTitles } } },
            { subSubCategory3: { title: { in: ageTitles } } },
            { subCategory: { title: { in: ageTitles } } },
            ...ageTitles.flatMap((title) => [
              { productName: { contains: title, mode: "insensitive" as const } },
              { description: { contains: title, mode: "insensitive" as const } },
            ]),
          ],
        },
      ];
    }

    const orderBy =
      sort === "price_asc"
        ? { PrixVente: "asc" as const }
        : sort === "price_desc"
          ? { PrixVente: "desc" as const }
          : sort === "name_asc"
            ? { productName: "asc" as const }
            : { createdAt: "desc" as const };

    // Backoffice segmented filter: Tous / Dépôts / Achats counts for the same filters.
    const { isDepot: _type, ...whereAnyType } = where;
    const countsPromise = sanitize
      ? Promise.resolve(undefined)
      : Promise.all([
          this.prisma.product.count({ where: whereAnyType }),
          this.prisma.product.count({ where: { ...whereAnyType, isDepot: true } }),
        ]).then(([all, depot]) => ({ all, depot, achat: all - depot }));

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
          coClient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          depositRequest: { select: { id: true, contractNumber: true } },
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
        (detail) => detail.command.status === "DELIVERED" || detail.command.status === "GOT_PROFIT",
      );
      // Status of the product's order (admin): Reçue / Acceptée / Livrée — "Livrée" = paid by the client and delivered.
      const orderStatus = commandDetails.length
        ? hasSoldCommand
          ? "DELIVERED"
          : commandDetails.some((d) => d.command.status === "ACCEPTED")
            ? "ACCEPTED"
            : "NOT_DELIVERED"
        : null;
      const withSold = sanitize ? { ...rest, isSold: hasSoldCommand } : { ...rest, isSold: hasSoldCommand, orderStatus };
      return sanitize ? sanitizeProductForStorefront(withSold) : withSold;
    });

    return {
      data: productsWithSoldStatus,
      meta: {
        page,
        limit: actualLimit,
        total,
        totalPages: Math.ceil(total / actualLimit),
        ...(sanitize ? {} : { counts: await countsPromise }),
      },
    };
  }

  async getPriceRange() {
    const range = await this.prisma.product.aggregate({
      where: { isPublished: true },
      _min: { PrixVente: true },
      _max: { PrixVente: true },
    });
    return { min: range._min.PrixVente ?? 0, max: range._max.PrixVente ?? 0 };
  }

  async findAllForQrExport() {
    return this.prisma.product.findMany({
      // Dépôt articles get their QR labels with the contract — only purchased stock here.
      where: { isDepot: false },
      select: { id: true, productName: true, PrixVente: true, ref: true },
      orderBy: { productName: "asc" },
    });
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
        coClient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        depositRequest: { select: { id: true, contractNumber: true } },
        photos: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  /** Backoffice detail: everything related to one product (orders, buyer, likes, contract). */
  async findOneAdmin(id: string) {
    const product = await this.findOne(id);
    const [orders, likes] = await Promise.all([
      this.prisma.commandDetail.findMany({
        where: { productId: id },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          command: { select: { id: true, createdAt: true, status: true, PrixVente: true, adresseLivraison: true, dateLivraison: true } },
          client: { select: { firstName: true, lastName: true, phoneNumber: true } },
          coClient: { select: { firstName: true, lastName: true, phoneNumber: true } },
        },
      }),
      // Likes table may be missing on some databases — never break the detail view for it.
      this.prisma.userLike.count({ where: { productId: id } }).catch(() => 0),
    ]);
    return { ...product, orders, likesCount: likes };
  }

  async findOnePublic(id: string) {
    const product = await this.findOne(id);
    if (!(product as { isPublished?: boolean }).isPublished) throw new NotFoundException("Produit introuvable.");
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

  /** Scanner / manual entry: accepts a QR payload (URL or id), a ref ("P-00012", "p12", "12") or a barcode. */
  async lookup(raw: string) {
    const input = decodeURIComponent(raw ?? "").trim();
    if (!input) throw new BadRequestException("Saisissez une référence.");
    const uuid = input.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
    if (uuid) {
      const byId = await this.prisma.product.findUnique({ where: { id: uuid }, select: { id: true } });
      if (byId) return this.findOne(byId.id);
    }
    const compact = input.toUpperCase().replace(/\s+/g, "");
    const refCandidates = new Set<string>([compact]);
    const pNum = compact.match(/^P-?0*(\d{1,7})$/) ?? compact.match(/^0*(\d{1,5})$/);
    if (pNum) refCandidates.add(`P-${pNum[1].padStart(5, "0")}`);
    const byRef = await this.prisma.product.findFirst({
      where: { ref: { in: [...refCandidates], mode: "insensitive" } },
      select: { id: true },
    });
    if (byRef) return this.findOne(byRef.id);
    if (/^\d{6,14}$/.test(compact)) {
      try {
        const p = await this.findByBarcode(compact);
        return this.findOne(p.id);
      } catch {
        /* fall through */
      }
    }
    throw new NotFoundException(`Aucun produit pour « ${input} ».`);
  }

  async findByBarcode(barcode: string) {
    const candidates = this.barcodeLookupCandidates(barcode);
    if (!candidates.length) {
      throw new BadRequestException("Code-barres invalide.");
    }

    const include = {
      category: { select: { id: true, categoryName: true } },
      subCategory: { select: { id: true, title: true } },
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

    if (
      isDepot &&
      updateProductDto.depotPercentage !== undefined &&
      updateProductDto.depotPercentage !== existingProduct.depotPercentage &&
      !isAllowedCommission(updateProductDto.depotPercentage)
    ) {
      throw new BadRequestException(COMMISSION_MESSAGE);
    }

    const resolved = this.resolveLifecycle(updateProductDto, isDepot, existingProduct);
    // Same transition rules as PATCH /products/:id/lifecycle.
    const fromStage = stageOf(existingProduct);
    const toStage = stageOf({ status: resolved.status, payoutStatus: resolved.payoutStatus ?? null });
    const stageChanged = fromStage !== toStage;
    if (stageChanged) assertTransition(fromStage, toStage, isDepot);
    const lifecycle = stageChanged
      ? { ...resolved, ...stageData(toStage, isDepot, { soldAt: existingProduct.soldAt, paidAt: (existingProduct as any).paidAt ?? null }) }
      : resolved;
    const split = this.computeSplit(isDepot, PrixVente, depotPercentage);
    const ref = await this.resolveRef(updateProductDto.ref, id);

    const { categoryIds, subCategoryIds, subSubCategory1Ids, subSubCategory2Ids, subSubCategory3Ids, ...productData } = updateProductDto;
    const updated = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: { id },
        data: {
          ...productData,
          gain,
          surcharge: surcharge || 0,
          ...(ref ? { ref } : {}),
          ...lifecycle,
          ...split,
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
      await this.syncCategoryLinks(tx, id, updateProductDto);
      return product;
    });
    if (stageChanged) {
      // After commit: live suivi pages refresh; VENDU / PAYE also notify the déposant.
      void publishProductStatusChanged({ productIds: [id], to: toStage, source: "manual" });
    }
    return updated;
  }

  /**
   * EN_VENTE → VENDU → PAYE (+ reset to EN_VENTE). Validates the transition, stamps soldAt / paidAt,
   * then publishes `product.status.changed` and returns what was sent to the déposant.
   */
  async changeLifecycle(id: string, to: ProductStage) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      select: { id: true, isDepot: true, status: true, payoutStatus: true, soldAt: true, paidAt: true },
    });
    if (!p) throw new NotFoundException("Produit introuvable.");
    const from = stageOf(p);
    assertTransition(from, to, p.isDepot);
    if (from === to) return { id, from, stage: to, notification: null };
    await this.prisma.product.update({ where: { id }, data: stageData(to, p.isDepot, { soldAt: p.soldAt, paidAt: p.paidAt }) });
    const summary = await publishProductStatusChanged({ productIds: [id], to, source: "manual" });
    // Manual "Vendu": nobody is notified yet (the déposant is told when the order is created).
    const notification = to === "PAYE" ? summary : null;
    return { id, from, stage: to, notification };
  }

  /** Products for the QR sheet, honouring the same filters as the admin list (max 1 000). */
  async findForQrCards(query: ProductQueryDto) {
    const out: any[] = [];
    let page = 1;
    for (;;) {
      const res = await this.findAll({ ...query, page, limit: 50 }, { sanitize: false });
      out.push(...res.data);
      if (page >= res.meta.totalPages || out.length >= 1000) break;
      page += 1;
    }
    return out.slice(0, 1000).map((p) => ({ id: p.id, ref: p.ref, productName: p.productName, description: p.description, PrixVente: p.PrixVente }));
  }

  /**
   * A product can only be deleted while nothing depends on it: not in an order, not sold / paid /
   * delivered (it would break orders, déposant payouts and the history).
   */
  async remove(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      select: { status: true, _count: { select: { commandDetails: true } } },
    });
    if (!p) throw new NotFoundException("Produit introuvable.");
    if (p._count.commandDetails > 0) {
      throw new BadRequestException("Impossible de supprimer : ce produit fait partie d'une commande.");
    }
    if (p.status === ProductStatus.VENDU) {
      throw new BadRequestException("Impossible de supprimer un produit vendu, payé ou livré. Remettez-le en vente ou retirez-le d'abord.");
    }
    await this.prisma.product.delete({ where: { id } });
    return { message: "Produit supprimé" };
  }

  /** Publish / unpublish on the storefront (bulk). */
  async setPublished(ids: string[], published: boolean) {
    const res = await this.prisma.product.updateMany({ where: { id: { in: ids } }, data: { isPublished: published } });
    return { updated: res.count, published };
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
    photos: {
      select: {
        id: true,
        photoDoc: true,
      },
    },
  };

  async getFeaturedProducts() {
    // Storefront "Sélection": only articles still available (sold / withdrawn ones are hidden).
    const rows = await this.prisma.featuredProduct.findMany({
      where: { product: { isDispo: true, status: ProductStatus.EN_VENTE, isPublished: true } },
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
