import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PayoutStatus, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { publishProductStatusChanged } from "../common/domain-events";
import { productSplit } from "../depot/depot.service";

const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;
const TZ = "Africa/Tunis";
/** Earliest pickup: 2 days after the request. Sundays: shop closed. */
export const MIN_DAYS_AHEAD = 2;

/** "YYYY-MM-DD" of a date in Tunis. */
function tunisDay(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** Validates the chosen day; returns it at noon Tunis time. */
export function parsePickupDay(day: string, now = new Date()): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new BadRequestException("Date invalide.");
  const date = new Date(`${day}T12:00:00+01:00`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException("Date invalide.");
  const min = new Date(`${tunisDay(now)}T12:00:00+01:00`);
  min.setUTCDate(min.getUTCDate() + MIN_DAYS_AHEAD);
  if (min.getUTCDay() === 0) min.setUTCDate(min.getUTCDate() + 1); // first possible day is never a Sunday
  if (date.getTime() < min.getTime()) throw new BadRequestException(`Choisissez une date à partir du ${tunisDay(min).split("-").reverse().join("/")} (48 h minimum).`);
  if (date.getUTCDay() === 0) throw new BadRequestException("La boutique est fermée le dimanche : choisissez un autre jour.");
  const max = new Date(min);
  max.setUTCDate(max.getUTCDate() + 60);
  if (date.getTime() > max.getTime()) throw new BadRequestException("Choisissez une date dans les 2 prochains mois.");
  return date;
}

@Injectable()
export class PaymentRequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
  ) {}

  private async contractFor(token: string) {
    if (!TOKEN_RE.test(token ?? "")) throw new NotFoundException();
    const c = await this.prisma.depositRequest.findUnique({
      where: { trackingToken: token },
      select: { id: true, coClientId: true, coClient: { select: { firstName: true, lastName: true, phoneNumber: true } } },
    });
    if (!c?.coClientId || !c.coClient) throw new NotFoundException();
    return c as typeof c & { coClientId: string; coClient: NonNullable<typeof c.coClient> };
  }

  /** Déposant (public): requests of this contract, newest first (no personal data). */
  async listForToken(token: string) {
    const c = await this.contractFor(token);
    const rows = await this.prisma.paymentRequest.findMany({
      where: { coClientId: c.coClientId, depositRequestId: c.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, productIds: true, amountMillimes: true, pickupDate: true, status: true, createdAt: true },
    });
    const products = await this.prisma.product.findMany({ where: { id: { in: rows.flatMap((r) => r.productIds) } }, select: { id: true, ref: true } });
    const refOf = new Map(products.map((p) => [p.id, p.ref]));
    return rows.map(({ productIds, ...r }) => ({ ...r, refs: productIds.map((id) => refOf.get(id)).filter(Boolean) }));
  }

  /** Déposant (public): "Demande de paiement" for sold, not yet paid articles of this contract. */
  async create(token: string, input: { refs: string[]; pickupDate: string }) {
    const c = await this.contractFor(token);
    const pickup = parsePickupDay(input.pickupDate);
    const refs = [...new Set(input.refs)];
    const products = await this.prisma.product.findMany({
      where: { ref: { in: refs }, depositRequestId: c.id, status: ProductStatus.VENDU, NOT: { payoutStatus: PayoutStatus.PAYE } },
      select: { id: true, ref: true, productName: true, PrixVente: true, depotPercentage: true, shopAmountMillimes: true, depositorAmountMillimes: true },
    });
    if (!products.length || products.length !== refs.length) {
      throw new BadRequestException("Choisissez des articles vendus et pas encore payés.");
    }
    const pending = await this.prisma.paymentRequest.findMany({ where: { coClientId: c.coClientId, status: "PENDING" }, select: { productIds: true } });
    const already = new Set(pending.flatMap((p) => p.productIds));
    const dup = products.filter((p) => already.has(p.id));
    if (dup.length) throw new BadRequestException(`Déjà demandé : ${dup.map((p) => p.ref).join(", ")}.`);

    const amountMillimes = products.reduce((t, p) => t + productSplit(p).depositorMillimes, 0);
    const req = await this.prisma.paymentRequest.create({
      data: { coClientId: c.coClientId, depositRequestId: c.id, productIds: products.map((p) => p.id), amountMillimes, pickupDate: pickup },
    });
    void this.notifications
      .notifyPaymentRequest({
        id: req.id,
        deposant: `${c.coClient.firstName} ${c.coClient.lastName}`.trim(),
        phone: c.coClient.phoneNumber,
        amountMillimes,
        pickupDate: pickup,
        articles: products.map((p) => `${p.productName} (${p.ref})`),
      })
      .catch(() => undefined);
    return { id: req.id, amountMillimes, pickupDate: pickup, status: req.status, refs: products.map((p) => p.ref) };
  }

  /** Admin: requests (pending first, by pickup date) with déposant + articles. */
  async listAdmin(status?: string) {
    const rows = await this.prisma.paymentRequest.findMany({
      where: status ? { status } : {},
      orderBy: [{ status: "desc" }, { pickupDate: "asc" }],
      take: 100,
      include: { coClient: { select: { id: true, number: true, firstName: true, lastName: true, phoneNumber: true, gender: true } } },
    });
    const products = await this.prisma.product.findMany({
      where: { id: { in: rows.flatMap((r) => r.productIds) } },
      select: { id: true, ref: true, productName: true, status: true, payoutStatus: true, PrixVente: true, depotPercentage: true, shopAmountMillimes: true, depositorAmountMillimes: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return rows.map(({ productIds, ...r }) => ({
      ...r,
      products: productIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((p) => ({ id: p!.id, ref: p!.ref, name: p!.productName, paid: p!.payoutStatus === PayoutStatus.PAYE, depositorMillimes: productSplit(p!).depositorMillimes })),
    }));
  }

  /** Admin: DONE = money handed over (articles → Payé, déposant notified) · CANCELLED. */
  async setStatus(id: string, status: "DONE" | "CANCELLED") {
    const req = await this.prisma.paymentRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException("Demande introuvable.");
    if (req.status !== "PENDING") throw new BadRequestException("Cette demande est déjà traitée.");
    let paidIds: string[] = [];
    if (status === "DONE") {
      const toPay = await this.prisma.product.findMany({
        where: { id: { in: req.productIds }, status: ProductStatus.VENDU, NOT: { payoutStatus: PayoutStatus.PAYE } },
        select: { id: true },
      });
      paidIds = toPay.map((p) => p.id);
      if (paidIds.length) {
        await this.prisma.product.updateMany({ where: { id: { in: paidIds } }, data: { payoutStatus: PayoutStatus.PAYE, paidAt: new Date() } });
      }
    }
    await this.prisma.paymentRequest.update({ where: { id }, data: { status, handledAt: new Date() } });
    if (paidIds.length) await publishProductStatusChanged({ productIds: paidIds, to: "PAYE" });
    return { id, status, paid: paidIds.length };
  }
}
