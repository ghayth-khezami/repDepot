import { Injectable, NotFoundException } from "@nestjs/common";
import { PayoutStatus, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SiteSettingsService } from "../site-settings/site-settings.service";
import { StoreHoursService } from "../store-hours/store-hours.service";
import { addMonths, productSplit } from "../depot/depot.service";

/** Tokens are base64url, at least 22 chars. Anything else is a 404 without touching the DB. */
const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;

export interface PublicSuiviItem {
  ref: string;
  name: string;
  photo: string | null;
  category: string | null;
  priceMillimes: number;
  depositorMillimes: number;
  status: ProductStatus;
  depositedAt: Date;
  soldAt: Date | null;
  paidAt: Date | null;
  payoutStatus: PayoutStatus | null;
}

export function computeSuiviTotals(
  items: Array<Pick<PublicSuiviItem, "status" | "payoutStatus" | "depositorMillimes">>,
) {
  const t = {
    count: items.length,
    sold: 0,
    onSale: 0,
    withdrawn: 0,
    /** Déposant share of everything not withdrawn ("si tout est vendu"). */
    potentialMillimes: 0,
    soldMillimes: 0,
    toCollectMillimes: 0,
    paidMillimes: 0,
  };
  for (const it of items) {
    if (it.status === ProductStatus.RETIRE) {
      t.withdrawn++;
      continue;
    }
    t.potentialMillimes += it.depositorMillimes;
    if (it.status === ProductStatus.VENDU) {
      t.sold++;
      t.soldMillimes += it.depositorMillimes;
      if (it.payoutStatus === PayoutStatus.PAYE) t.paidMillimes += it.depositorMillimes;
      else t.toCollectMillimes += it.depositorMillimes;
    } else {
      t.onSale++;
    }
  }
  return t;
}

/**
 * Read-only, unauthenticated. The response is built field by field (never spread from a
 * Prisma row) so the déposant's phone, email, address and RIB can never leak.
 */
@Injectable()
export class PublicSuiviService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly siteSettings: SiteSettingsService,
    private readonly storeHours: StoreHoursService,
  ) {}

  async getByToken(token: string) {
    if (!TOKEN_RE.test(token ?? "")) throw new NotFoundException();

    const contract = await this.prisma.depositRequest.findUnique({
      where: { trackingToken: token },
      select: {
        contractNumber: true,
        createdAt: true,
        durationMonths: true,
        coClient: { select: { firstName: true, lastName: true } },
        products: {
          orderBy: { ref: "asc" },
          select: {
            ref: true,
            productName: true,
            PrixVente: true,
            depotPercentage: true,
            shopAmountMillimes: true,
            depositorAmountMillimes: true,
            status: true,
            soldAt: true,
            paidAt: true,
            payoutStatus: true,
            createdAt: true,
            category: { select: { categoryName: true } },
            photos: { select: { photoDoc: true }, take: 1, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
    if (!contract || !contract.coClient) throw new NotFoundException();

    const items: PublicSuiviItem[] = contract.products.map((p) => {
      const split = productSplit(p);
      return {
        ref: p.ref,
        name: p.productName,
        photo: p.photos[0]?.photoDoc ?? null,
        category: p.category?.categoryName ?? null,
        priceMillimes: split.priceMillimes,
        depositorMillimes: split.depositorMillimes,
        status: p.status,
        depositedAt: p.createdAt,
        soldAt: p.soldAt,
        paidAt: p.status === ProductStatus.VENDU && p.payoutStatus === PayoutStatus.PAYE ? p.paidAt : null,
        payoutStatus:
          p.status === ProductStatus.VENDU ? (p.payoutStatus ?? PayoutStatus.A_PERCEVOIR) : null,
      };
    });

    const durationMonths = contract.durationMonths ?? 3;
    const [shop, hours] = await Promise.all([
      this.siteSettings.getShopContact(),
      this.storeHours.findAll(),
    ]);

    return {
      deposant: {
        firstName: contract.coClient.firstName,
        lastInitial: contract.coClient.lastName.trim().charAt(0).toUpperCase(),
      },
      contract: {
        number: contract.contractNumber,
        depositDate: contract.createdAt,
        durationMonths,
        expiresAt: addMonths(contract.createdAt, durationMonths),
      },
      items,
      totals: computeSuiviTotals(items),
      shop: {
        phoneDisplay: shop.phoneDisplay,
        phoneTel: shop.phoneTel,
        whatsapp: shop.whatsapp,
        address: shop.address,
        mapsUrl: shop.mapsUrl,
        hours: hours.map((h) => ({
          weekday: h.weekday,
          isClosed: h.isClosed,
          openTime: h.openTime,
          closeTime: h.closeTime,
        })),
      },
    };
  }
}
