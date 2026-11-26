import { Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import * as webpush from "web-push";
import { PrismaService } from "../prisma/prisma.service";
import { onProductsSold } from "../common/sold-events";
import { formatTnd } from "../common/utils/money";

const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;

/** Push notifications for déposants who installed their tracking page ("Télécharger l'app"). */
@Injectable()
export class DeposantPushService implements OnModuleInit {
  private readonly logger = new Logger(DeposantPushService.name);
  private enabled = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const pub = process.env.VAPID_PUBLIC_KEY?.trim();
    const priv = process.env.VAPID_PRIVATE_KEY?.trim();
    if (pub && priv) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "mailto:contact@bebedepot.tn", pub, priv);
      this.enabled = true;
    }
    onProductsSold((ids) => this.notifySold(ids));
  }

  publicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY?.trim() || null };
  }

  private async contractFor(token: string) {
    if (!TOKEN_RE.test(token)) throw new NotFoundException();
    const c = await this.prisma.depositRequest.findUnique({ where: { trackingToken: token }, select: { id: true, coClientId: true } });
    if (!c?.coClientId) throw new NotFoundException();
    return { id: c.id, coClientId: c.coClientId };
  }

  async subscribe(token: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    const c = await this.contractFor(token);
    await this.prisma.deposantPush.upsert({
      where: { endpoint: sub.endpoint },
      create: { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, coClientId: c.coClientId, depositRequestId: c.id },
      update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, coClientId: c.coClientId, depositRequestId: c.id },
    });
    return { ok: true };
  }

  async unsubscribe(token: string, endpoint: string) {
    const c = await this.contractFor(token);
    await this.prisma.deposantPush.deleteMany({ where: { endpoint, coClientId: c.coClientId } });
    return { ok: true };
  }

  /** "🎉 Votre article est vendu" — once per product, to every device of its déposant. */
  async notifySold(productIds: string[]) {
    if (!this.enabled || !productIds.length) return;
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isDepot: true, status: ProductStatus.VENDU, soldNotifiedAt: null, coclientId: { not: null } },
      select: { id: true, productName: true, depositorAmountMillimes: true, coclientId: true },
    });
    if (!products.length) return;
    await this.prisma.product.updateMany({ where: { id: { in: products.map((p) => p.id) } }, data: { soldNotifiedAt: new Date() } });

    const byDeposant = new Map<string, typeof products>();
    products.forEach((p) => byDeposant.set(p.coclientId!, [...(byDeposant.get(p.coclientId!) ?? []), p]));

    for (const [coClientId, items] of byDeposant) {
      const subs = await this.prisma.deposantPush.findMany({
        where: { coClientId },
        include: { depositRequest: { select: { trackingToken: true } } },
      });
      if (!subs.length) continue;
      const total = items.reduce((t, p) => t + (p.depositorAmountMillimes ?? 0), 0);
      const payload =
        items.length === 1
          ? { title: "🎉 Votre article est vendu !", body: `${items[0].productName} — ${formatTnd(total)} pour vous.` }
          : { title: `🎉 ${items.length} articles vendus !`, body: `${formatTnd(total)} pour vous. Touchez pour voir le détail.` };
      await Promise.allSettled(
        subs.map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ ...payload, url: s.depositRequest.trackingToken ? `/suivi/${s.depositRequest.trackingToken}` : "/" }),
              { TTL: 60 * 60 * 24 },
            );
          } catch (e: any) {
            if (e?.statusCode === 404 || e?.statusCode === 410) await this.prisma.deposantPush.delete({ where: { id: s.id } }).catch(() => undefined);
            else this.logger.warn(`Push failed: ${e?.statusCode ?? e?.message}`);
          }
        }),
      );
    }
  }
}
