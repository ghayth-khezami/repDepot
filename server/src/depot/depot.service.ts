import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DepositRequestStatus, Prisma, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SiteSettingsService } from "../site-settings/site-settings.service";
import { computeEan13CheckDigit } from "../common/barcode-label.util";
import { sanitizePlainText } from "../common/utils/sanitize-text";
import { fromMillimes, splitCommission, toMillimes } from "../common/utils/money";
import { AddDepotItemsDto, CreateDepotDto, DepotItemDto } from "./dto/create-depot.dto";
import {
  generateTrackingToken,
  nextContractNumber,
  reserveDepositorRefs,
  withUniqueRetry,
} from "./depot-identity";
import { buildContractPdf, DEFAULT_CONTRACT_TERMS } from "./contract-pdf";

type Tx = Prisma.TransactionClient;

const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

export function publicSiteUrl(): string {
  return (process.env.PUBLIC_SITE_URL || "https://bebedepot.tn").replace(/\/$/, "");
}

export function trackingUrl(token: string): string {
  return `${publicSiteUrl()}/suivi/${token}`;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0); // 31 Jan + 1 month → 28/29 Feb
  return d;
}

/** Money split for any product (new rows carry it; legacy rows are recomputed identically). */
export function productSplit(p: {
  PrixVente: number;
  depotPercentage: number | null;
  shopAmountMillimes: number | null;
  depositorAmountMillimes: number | null;
}) {
  const priceMillimes = toMillimes(p.PrixVente);
  if (p.shopAmountMillimes != null && p.depositorAmountMillimes != null) {
    return { priceMillimes, shopMillimes: p.shopAmountMillimes, depositorMillimes: p.depositorAmountMillimes };
  }
  return splitCommission(priceMillimes, p.depotPercentage ?? 0);
}

function randomBarcode(): string {
  let body = "2";
  for (let i = 0; i < 11; i++) body += Math.floor(Math.random() * 10);
  return body + computeEan13CheckDigit(body);
}

@Injectable()
export class DepotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteSettings: SiteSettingsService,
  ) {}

  // ── Déposants ──────────────────────────────────────────────────────────

  async searchDeposants(q?: string) {
    const term = q?.trim();
    const digits = term?.replace(/\D/g, "") ?? "";
    const words = (term ?? "").split(/\s+/).filter((w) => w && !/^\d+$/.test(w));
    const where: Prisma.CoClientWhereInput = term
      ? {
          OR: [
            // "sarra ben" → every word must match the first or last name
            ...(words.length
              ? [{
                  AND: words.map((w) => ({
                    OR: [
                      { firstName: { contains: w, mode: "insensitive" as const } },
                      { lastName: { contains: w, mode: "insensitive" as const } },
                    ],
                  })),
                }]
              : []),
            ...(digits.length >= 2 ? [{ phoneNumber: { contains: digits } }] : []),
          ],
        }
      : {};
    const rows = await this.prisma.coClient.findMany({
      where,
      take: 12,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        number: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        _count: { select: { products: true, depositRequests: true } },
      },
    });
    return rows.map(({ _count, phoneNumber, ...r }) => ({
      ...r,
      phone: phoneNumber,
      productsCount: _count.products,
      contractsCount: _count.depositRequests,
    }));
  }

  /** Backoffice "suivi déposant": articles, statuses, contracts and amounts (after a scan or from the list). */
  async deposantOverview(id: string) {
    const d = await this.prisma.coClient.findUnique({
      where: { id },
      include: {
        products: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            ref: true,
            productName: true,
            PrixVente: true,
            status: true,
            soldAt: true,
            payoutStatus: true,
            depotPercentage: true,
            shopAmountMillimes: true,
            depositorAmountMillimes: true,
            createdAt: true,
            depositRequestId: true,
            category: { select: { categoryName: true } },
            photos: { select: { photoDoc: true }, take: 1 },
          },
        },
        depositRequests: {
          orderBy: { createdAt: "desc" },
          select: { id: true, contractNumber: true, createdAt: true, durationMonths: true, signedAt: true, status: true, trackingToken: true },
        },
      },
    });
    if (!d) throw new NotFoundException("Déposant introuvable.");
    const share = (p: { depositorAmountMillimes: number | null; PrixVente: number; depotPercentage: number | null }) =>
      p.depositorAmountMillimes ?? splitCommission(toMillimes(p.PrixVente), p.depotPercentage ?? 0).depositorMillimes;
    const totals = { total: d.products.length, onSale: 0, sold: 0, removed: 0, paid: 0, toPayMillimes: 0, paidMillimes: 0, stockValueMillimes: 0 };
    for (const p of d.products) {
      if (p.status === "EN_VENTE") {
        totals.onSale++;
        totals.stockValueMillimes += toMillimes(p.PrixVente);
      } else if (p.status === "RETIRE") totals.removed++;
      else if (p.status === "VENDU") {
        totals.sold++;
        if (p.payoutStatus === "PAYE") {
          totals.paid++;
          totals.paidMillimes += share(p);
        } else totals.toPayMillimes += share(p);
      }
    }
    return {
      id: d.id,
      number: d.number,
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phoneNumber,
      email: d.email,
      address: d.address,
      rib: d.RIB,
      createdAt: d.createdAt,
      contracts: d.depositRequests.map(({ trackingToken, ...c }) => ({ ...c, hasTracking: !!trackingToken })),
      products: d.products.map((p) => ({
        id: p.id,
        ref: p.ref,
        name: p.productName,
        category: p.category?.categoryName ?? null,
        priceMillimes: toMillimes(p.PrixVente),
        depositorMillimes: share(p),
        status: p.status,
        payoutStatus: p.payoutStatus,
        soldAt: p.soldAt,
        createdAt: p.createdAt,
        contractId: p.depositRequestId,
        photo: p.photos[0]?.photoDoc ?? null,
      })),
      totals,
    };
  }

  /** Contract QR (/suivi/<token>) scanned in the backoffice → that déposant's overview. */
  async deposantByToken(token: string) {
    const c = await this.prisma.depositRequest.findUnique({ where: { trackingToken: token }, select: { coClientId: true } });
    if (!c?.coClientId) throw new NotFoundException("Contrat introuvable pour ce QR.");
    return this.deposantOverview(c.coClientId);
  }

  async findByPhone(phone: string) {
    const digits = (phone || "").replace(/\D/g, "");
    if (digits.length !== 8) return { exists: false as const };
    const row = await this.prisma.coClient.findUnique({
      where: { phoneNumber: digits },
      select: { id: true, number: true, firstName: true, lastName: true },
    });
    return row ? { exists: true as const, deposant: row } : { exists: false as const };
  }

  private async resolveDeposant(tx: Tx, dto: CreateDepotDto) {
    if (dto.deposantId) {
      const existing = await tx.coClient.findUnique({ where: { id: dto.deposantId } });
      if (!existing) throw new NotFoundException("Déposant introuvable.");
      return existing;
    }
    const d = dto.deposant;
    if (!d) throw new BadRequestException("Déposant requis.");

    const samePhone = await tx.coClient.findUnique({
      where: { phoneNumber: d.phone },
      select: { id: true, number: true, firstName: true, lastName: true },
    });
    if (samePhone) {
      throw new ConflictException({
        code: "PHONE_EXISTS",
        message: "Un déposant existe déjà avec ce numéro.",
        deposant: samePhone,
      });
    }
    const email = d.email?.toLowerCase();
    if (email) {
      const sameEmail = await tx.coClient.findUnique({ where: { email }, select: { id: true } });
      if (sameEmail) throw new ConflictException({ code: "EMAIL_EXISTS", message: "Cet email est déjà utilisé par un autre déposant." });
    }

    return tx.coClient.create({
      data: {
        firstName: sanitizePlainText(d.firstName, 80),
        lastName: sanitizePlainText(d.lastName, 80),
        phoneNumber: d.phone,
        email: email ?? null,
        address: d.address ? sanitizePlainText(d.address, 300) : null,
        lat: d.lat ?? null,
        lng: d.lng ?? null,
        RIB: d.rib ?? null,
      },
    });
  }

  private async assertCategories(tx: Tx, items: DepotItemDto[]) {
    const ids = [...new Set(items.map((i) => i.categoryId))];
    if (!ids.length) return;
    const found = await tx.category.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException("Une ou plusieurs catégories sont introuvables.");
  }

  /** Creates products for a contract. Refs are reserved server-side; the client never sends one. */
  private async createItems(tx: Tx, contractId: string, coClientId: string, items: DepotItemDto[]) {
    if (!items.length) return;
    await this.assertCategories(tx, items);
    const refs = await reserveDepositorRefs(tx, coClientId, items.length);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const split = splitCommission(toMillimes(item.price), item.commissionPercent);
      await tx.product.create({
        data: {
          productName: sanitizePlainText(item.name, 160),
          PrixVente: fromMillimes(split.priceMillimes),
          isDepot: true,
          depotPercentage: item.commissionPercent,
          gain: fromMillimes(split.shopMillimes),
          surcharge: 0,
          isDispo: true,
          status: ProductStatus.EN_VENTE,
          shopAmountMillimes: split.shopMillimes,
          depositorAmountMillimes: split.depositorMillimes,
          ref: refs[i],
          barcode: randomBarcode(),
          coclientId: coClientId,
          categoryId: item.categoryId,
          subCategoryId: item.subCategoryId || undefined,
          subSubCategory1Id: item.subSubCategory1Id || undefined,
          depositRequestId: contractId,
          ProductCategory: { create: { categoryId: item.categoryId } },
          ProductSubCategory: item.subCategoryId ? { create: { subCategoryId: item.subCategoryId } } : undefined,
          ProductSubSubCategory1: item.subSubCategory1Id ? { create: { subSubCategoryId: item.subSubCategory1Id } } : undefined,
          photos: item.photos?.length ? { create: item.photos.map((photoDoc) => ({ photoDoc })) } : undefined,
        },
      });
    }
  }

  private async refreshContractTotals(tx: Tx, contractId: string) {
    const products = await tx.product.findMany({
      where: { depositRequestId: contractId },
      select: { PrixVente: true, photos: { select: { photoDoc: true }, take: 1 } },
    });
    const totalMillimes = products.reduce((s, p) => s + toMillimes(p.PrixVente), 0);
    await tx.depositRequest.update({
      where: { id: contractId },
      data: {
        proposedPrice: fromMillimes(totalMillimes),
        photos: products.flatMap((p) => p.photos.map((ph) => ph.photoDoc)),
      },
    });
  }

  // ── Contracts ──────────────────────────────────────────────────────────

  /** POST /depots — one transaction: déposant (new or reused) + contract + products + refs. */
  async create(dto: CreateDepotDto) {
    const id = await withUniqueRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const deposant = await this.resolveDeposant(tx, dto);
        const contract = await tx.depositRequest.create({
          data: {
            coClientId: deposant.id,
            fullName: `${deposant.firstName} ${deposant.lastName}`.trim(),
            phoneNumber: deposant.phoneNumber,
            proposedPrice: 0,
            photos: [],
            status: DepositRequestStatus.CONFIRMED,
            contractNumber: await nextContractNumber(tx),
            trackingToken: generateTrackingToken(),
            durationMonths: dto.durationMonths,
            internalNote: dto.internalNote ? sanitizePlainText(dto.internalNote, 2000) : null,
          },
        });
        await this.createItems(tx, contract.id, deposant.id, dto.items);
        await this.refreshContractTotals(tx, contract.id);
        return contract.id;
      }, TX_OPTIONS),
    );
    return this.getContract(id);
  }

  /** POST /depots/:id/items — articles added later stay covered by the same global QR. */
  async addItems(id: string, dto: AddDepotItemsDto) {
    if (!dto.items.length) throw new BadRequestException("Aucun article à ajouter.");
    await withUniqueRetry(() =>
      this.prisma.$transaction(async (tx) => {
        const contract = await tx.depositRequest.findUnique({ where: { id }, select: { id: true, coClientId: true } });
        if (!contract) throw new NotFoundException("Contrat introuvable.");
        if (!contract.coClientId) throw new BadRequestException("Ce dépôt n'est lié à aucun déposant.");
        await this.ensureIdentity(tx, id);
        await this.createItems(tx, id, contract.coClientId, dto.items);
        await this.refreshContractTotals(tx, id);
      }, TX_OPTIONS),
    );
    return this.getContract(id);
  }

  /** Legacy demandes get a contract number + token the first time a contract is requested. */
  private async ensureIdentity(tx: Tx, id: string) {
    const row = await tx.depositRequest.findUniqueOrThrow({
      where: { id },
      select: { contractNumber: true, trackingToken: true, durationMonths: true },
    });
    if (row.contractNumber && row.trackingToken && row.durationMonths) return;
    await tx.depositRequest.update({
      where: { id },
      data: {
        contractNumber: row.contractNumber ?? (await nextContractNumber(tx)),
        trackingToken: row.trackingToken ?? generateTrackingToken(),
        durationMonths: row.durationMonths ?? 3,
      },
    });
  }

  /**
   * Every product on the contract must have a non-empty, unique ref before a PDF is built.
   * Missing refs are generated and saved; anything that still fails → 409 with the products concerned.
   */
  async ensureRefs(id: string) {
    const products = await this.prisma.product.findMany({
      where: { depositRequestId: id },
      select: { id: true, productName: true, ref: true, coclientId: true },
    });
    const missing = products.filter((p) => !p.ref || !p.ref.trim());
    const failed: Array<{ id: string; productName: string }> = [];
    for (const p of missing) {
      try {
        await withUniqueRetry(() =>
          this.prisma.$transaction(async (tx) => {
            const ref = p.coclientId
              ? (await reserveDepositorRefs(tx, p.coclientId, 1))[0]
              : `P-${String(Number((await tx.$queryRaw<Array<{ seq: bigint }>>`SELECT nextval('product_ref_seq') AS seq`)[0].seq)).padStart(5, "0")}`;
            await tx.product.update({ where: { id: p.id }, data: { ref } });
          }),
        );
      } catch {
        failed.push({ id: p.id, productName: p.productName });
      }
    }
    // Uniqueness is enforced by the DB index; double-check in case of manual edits on a non-indexed copy.
    const refs = await this.prisma.product.findMany({ where: { depositRequestId: id }, select: { id: true, productName: true, ref: true } });
    const seen = new Map<string, number>();
    refs.forEach((r) => seen.set(r.ref.trim(), (seen.get(r.ref.trim()) ?? 0) + 1));
    for (const r of refs) {
      if (!r.ref.trim() || (seen.get(r.ref.trim()) ?? 0) > 1) {
        if (!failed.some((f) => f.id === r.id)) failed.push({ id: r.id, productName: r.productName });
      }
    }
    if (failed.length) {
      throw new ConflictException({
        code: "REF_MISSING",
        message: "Certains articles n'ont pas de référence unique. Aucun contrat n'a été généré.",
        products: failed,
      });
    }
  }

  /** Admin view of a contract — the single source the stepper preview and the PDF both use. */
  async getContract(id: string) {
    const exists = await this.prisma.depositRequest.findUnique({ where: { id }, select: { coClientId: true } });
    if (!exists) throw new NotFoundException("Contrat introuvable.");
    if (!exists.coClientId) throw new BadRequestException("Ce dépôt n'est lié à aucun déposant.");
    await this.prisma.$transaction((tx) => this.ensureIdentity(tx, id));

    const c = await this.prisma.depositRequest.findUniqueOrThrow({
      where: { id },
      include: {
        coClient: true,
        items: true,
        products: {
          orderBy: { ref: "asc" },
          include: { photos: { take: 1, orderBy: { createdAt: "asc" } }, category: { select: { id: true, categoryName: true } } },
        },
      },
    });
    const items = c.products.map((p) => {
      const split = productSplit(p);
      return {
        id: p.id,
        ref: p.ref,
        name: p.productName,
        photo: p.photos[0]?.photoDoc ?? null,
        category: p.category,
        commissionPercent: p.depotPercentage ?? 0,
        priceMillimes: split.priceMillimes,
        shopMillimes: split.shopMillimes,
        depositorMillimes: split.depositorMillimes,
        status: p.status,
        soldAt: p.soldAt,
        payoutStatus: p.payoutStatus,
      };
    });
    const totals = items.reduce(
      (t, it) => ({
        priceMillimes: t.priceMillimes + it.priceMillimes,
        shopMillimes: t.shopMillimes + it.shopMillimes,
        depositorMillimes: t.depositorMillimes + it.depositorMillimes,
      }),
      { priceMillimes: 0, shopMillimes: 0, depositorMillimes: 0 },
    );
    const co = c.coClient!;
    return {
      id: c.id,
      contractNumber: c.contractNumber!,
      trackingToken: c.trackingToken!,
      trackingUrl: trackingUrl(c.trackingToken!),
      durationMonths: c.durationMonths!,
      createdAt: c.createdAt,
      expiresAt: addMonths(c.createdAt, c.durationMonths!),
      signedAt: c.signedAt,
      internalNote: c.internalNote,
      status: c.status,
      deposant: {
        id: co.id,
        number: co.number,
        firstName: co.firstName,
        lastName: co.lastName,
        phone: co.phoneNumber,
        email: co.email,
        address: co.address,
        rib: co.RIB,
      },
      items,
      legacyItems: c.items.map((i) => ({ id: i.id, name: i.productName, priceMillimes: toMillimes(i.proposedPrice) })),
      totals,
    };
  }

  async contractPdf(id: string): Promise<{ buffer: Buffer; filename: string }> {
    await this.ensureRefs(id);
    const c = await this.getContract(id);
    const shop = await this.siteSettings.getShopContact();
    const settings = await this.siteSettings.getAdmin();
    const buffer = await buildContractPdf({
      shop: { name: "Bébé-Dépôt", address: shop.address, phone: shop.phoneDisplay },
      contractNumber: c.contractNumber,
      createdAt: c.createdAt,
      durationMonths: c.durationMonths,
      expiresAt: c.expiresAt,
      deposant: {
        fullName: `${c.deposant.lastName} ${c.deposant.firstName}`,
        phone: c.deposant.phone,
        address: c.deposant.address,
        email: c.deposant.email,
        rib: c.deposant.rib,
      },
      items: c.items.map((it) => ({
        ref: it.ref,
        name: it.name,
        priceMillimes: it.priceMillimes,
        commissionPercent: it.commissionPercent,
        shopMillimes: it.shopMillimes,
        depositorMillimes: it.depositorMillimes,
      })),
      totals: c.totals,
      terms: settings.contractTerms?.trim() || DEFAULT_CONTRACT_TERMS,
      trackingUrl: c.trackingUrl,
    });
    return { buffer, filename: `contrat-${c.contractNumber}.pdf` };
  }

  async labelProducts(id: string) {
    await this.ensureRefs(id);
    const products = await this.prisma.product.findMany({
      where: { depositRequestId: id },
      orderBy: { ref: "asc" },
      select: { id: true, productName: true, PrixVente: true, ref: true },
    });
    if (!products.length) throw new BadRequestException("Ce contrat ne contient aucun article.");
    return products;
  }

  async markSigned(id: string) {
    await this.prisma.depositRequest.update({ where: { id }, data: { signedAt: new Date() } });
    return this.getContract(id);
  }
}
