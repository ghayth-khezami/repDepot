import { Injectable, Logger } from "@nestjs/common";
import { Command, DepositRequest, NotificationType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsGateway } from "./notifications.gateway";
import { PushService } from "./push.service";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly pushService: PushService,
  ) {}

  async notifyCommandCreated(command: Command) {
    const title = "Nouvelle commande";
    const body = `${command.productsNumber} article(s) · ${command.PrixVente.toFixed(3)} TND`;
    await this.dispatch({
      type: NotificationType.COMMAND_CREATED,
      title,
      body,
      linkPath: "/commands",
      entityId: command.id,
    });
  }

  async notifyDepositRequestCreated(request: DepositRequest) {
    const title = "Nouvelle demande de dépôt";
    const body = `${request.fullName} · ${request.proposedPrice.toFixed(3)} TND`;
    await this.dispatch({
      type: NotificationType.DEPOSIT_REQUEST_CREATED,
      title,
      body,
      linkPath: "/deposit-requests",
      entityId: request.id,
    });
  }

  private async dispatch(input: {
    type: NotificationType;
    title: string;
    body: string;
    linkPath: string;
    entityId: string;
  }) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          type: input.type,
          title: input.title,
          body: input.body,
          linkPath: input.linkPath,
          entityId: input.entityId,
        },
      });

      const payload = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        linkPath: notification.linkPath,
        entityId: notification.entityId,
        read: notification.read,
        createdAt: notification.createdAt.toISOString(),
      };

      this.gateway.emitNotification(payload);

      await this.pushService.sendToAdmins({
        title: input.title,
        body: input.body,
        linkPath: input.linkPath,
        entityId: input.entityId,
      });
    } catch (err) {
      this.logger.error(`Failed to dispatch notification: ${String(err)}`);
    }
  }

  async list(page = 1, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const skip = (page - 1) * take;
    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { read: false } }),
    ]);
    return {
      data,
      meta: { total, page, limit: take, totalPages: Math.ceil(total / take) || 1, unreadCount },
    };
  }

  async unreadCount() {
    return this.prisma.notification.count({ where: { read: false } });
  }

  async markRead(id: string) {
    return this.prisma.notification.update({ where: { id }, data: { read: true } });
  }

  async markAllRead() {
    await this.prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
    return { ok: true };
  }
}
