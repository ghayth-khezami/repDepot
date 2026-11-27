import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PayoutStatus, ProductStatus } from "@prisma/client";
import * as webpush from "web-push";
import { PrismaService } from "../prisma/prisma.service";
import { emptySummary, NotifySummary, onProductStatusChanged, ProductStatusChanged } from "../common/domain-events";
import { EmailService } from "../notification/email.service";
import { productSplit } from "../depot/depot.service";
import { DeposantEvent, renderDeposantMessage } from "../notification/deposant-templates";

const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;

/**
 * Notifies déposants when one of their articles becomes VENDU or PAYE, on every channel they have:
 * push (installed tracking app), email (if known + SMTP configured), SMS (no provider yet → logged as skipped).
 * Every attempt is written to `deposant_notifications`. Each event is sent once per article.
 */
@Injectable()
export class DeposantPushService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeposantPushService.name);
  private pushEnabled = false;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  onModuleInit() {
    const pub = process.env.VAPID_PUBLIC_KEY?.trim();
    const priv = process.env.VAPID_PRIVATE_KEY?.trim();
    if (pub && priv) {
      webpush.setVapidDetails(process.env.VAPID_SUBJECT?.trim() || "mailto:contact@bebedepot.tn", pub, priv);
      this.pushEnabled = true;
    } else {
      this.logger.warn("VAPID keys missing — déposant push notifications are disabled (logged as skipped).");
    }
    if (!process.env.KHEZAMI_PHONE?.trim()) this.logger.warn("KHEZAMI_PHONE is not set — messages will say « la boutique ».");
    this.unsubscribe = onProductStatusChanged((e) => this.onStatusChanged(e));
  }

  onModuleDestroy() {
    this.unsubscribe?.();
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

  async unsubscribeDevice(token: string, endpoint: string) {
    const c = await this.contractFor(token);
    await this.prisma.deposantPush.deleteMany({ where: { endpoint, coClientId: c.coClientId } });
    return { ok: true };
  }

  async onStatusChanged(e: ProductStatusChanged): Promise<NotifySummary | void> {
    if (e.to !== "VENDU" && e.to !== "PAYE") return;
    // "Vendu" message only when the article is sold through an order (web, backoffice, sur place).
    if (e.to === "VENDU" && e.source !== "order") return;
    return this.notify(e.to, e.productIds);
  }

  async notify(event: DeposantEvent, productIds: string[]): Promise<NotifySummary> {
    const summary = emptySummary();
    const marker = event === "VENDU" ? "soldNotifiedAt" : "paidNotifiedAt";
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isDepot: true,
        coclientId: { not: null },
        status: ProductStatus.VENDU,
        // "Vendu, venez chercher votre argent" makes no sense once he has been paid.
        ...(event === "PAYE" ? { payoutStatus: PayoutStatus.PAYE } : { OR: [{ payoutStatus: null }, { payoutStatus: PayoutStatus.A_PERCEVOIR }] }),
        [marker]: null,
      },
      select: {
        id: true,
        ref: true,
        productName: true,
        PrixVente: true,
        depotPercentage: true,
        shopAmountMillimes: true,
        depositorAmountMillimes: true,
        coclientId: true,
        coClient: { select: { firstName: true, email: true } },
      },
    });
    if (!products.length) return summary;
    // Claim first so a concurrent event can't send twice.
    await this.prisma.product.updateMany({ where: { id: { in: products.map((p) => p.id) }, [marker]: null }, data: { [marker]: new Date() } });

    for (const p of products) {
      const msg = renderDeposantMessage(event, {
        prenom: p.coClient?.firstName ?? "",
        produit: p.productName,
        ref: p.ref,
        // What the déposant receives (sale price minus the shop commission).
        prix: (productSplit(p).depositorMillimes / 1000).toFixed(3),
      });
      const log = async (channel: string, status: "sent" | "failed" | "skipped", detail?: string) => {
        summary[status === "sent" ? "sent" : status === "failed" ? "failed" : "skipped"] += 1;
        if (status === "sent" && !summary.channels.includes(channel)) summary.channels.push(channel);
        if (status === "failed" && detail) summary.errors.push(`${channel}: ${detail}`);
        if (status === "failed") this.logger.warn(`Déposant ${event} ${channel} failed for ${p.ref}: ${detail}`);
        await this.prisma.deposantNotification.create({
          data: { productId: p.id, coClientId: p.coclientId!, event, channel, status, detail: detail?.slice(0, 500) },
        });
      };

      // Push
      const subs = await this.prisma.deposantPush.findMany({
        where: { coClientId: p.coclientId! },
        include: { depositRequest: { select: { trackingToken: true } } },
      });
      if (!this.pushEnabled) await log("push", "skipped", "Clés VAPID manquantes");
      else if (!subs.length) await log("push", "skipped", "Aucun appareil abonné aux alertes");
      for (const s of this.pushEnabled ? subs : []) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: msg.title, body: msg.body, url: s.depositRequest.trackingToken ? `/suivi/${s.depositRequest.trackingToken}` : "/" }),
            { TTL: 60 * 60 * 24 },
          );
          await log("push", "sent");
        } catch (err: any) {
          const code = err?.statusCode;
          if (code === 404 || code === 410) {
            await this.prisma.deposantPush.delete({ where: { id: s.id } });
            await log("push", "failed", "Abonnement expiré (supprimé)");
          } else await log("push", "failed", `${code ?? ""} ${err?.message ?? err}`.trim());
        }
      }

      // Email
      const to = p.coClient?.email?.trim();
      if (!to) await log("email", "skipped", "Pas d'email pour ce déposant");
      else if (!this.email.isConfigured()) await log("email", "skipped", "SMTP non configuré");
      else {
        try {
          await this.email.sendText({ to, subject: msg.subject, text: msg.body });
          await log("email", "sent");
        } catch (err) {
          await log("email", "failed", (err as Error).message);
        }
      }

      // SMS: no provider wired yet — recorded so the log shows why nothing went out.
      await log("sms", "skipped", "Aucun fournisseur SMS configuré");
    }
    return summary;
  }
}
