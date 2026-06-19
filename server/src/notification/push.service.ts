import { Injectable, Logger } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import * as webpush from "web-push";
import { PrismaService } from "../prisma/prisma.service";

type PushPayload = {
  title: string;
  body: string;
  linkPath?: string;
  entityId?: string;
};

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private enabled = false;

  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
    const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@bebe-depot.com";

    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.enabled = true;
    } else {
      this.logger.warn("VAPID keys missing — Web Push disabled (in-app + WebSocket still work).");
    }
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY?.trim() || null;
  }

  async subscribe(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    await this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId, endpoint: subscription.endpoint },
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
    return { ok: true };
  }

  async unsubscribe(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  }

  async sendToAdmins(payload: PushPayload) {
    if (!this.enabled) return;

    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });
    const adminIds = admins.map((a) => a.id);
    if (!adminIds.length) return;

    const subs = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: adminIds } },
    });

    const body = JSON.stringify({
      title: payload.title,
      body: payload.body,
      linkPath: payload.linkPath ?? "/",
      entityId: payload.entityId,
    });

    await Promise.allSettled(
      subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            body,
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
          this.logger.debug(`Push failed for ${sub.endpoint}: ${String(err)}`);
        }
      }),
    );
  }
}
