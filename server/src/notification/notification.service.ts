import { Injectable, Logger } from "@nestjs/common";
import { Command, DepositRequest, NotificationType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsGateway } from "./notifications.gateway";
import { PushService } from "./push.service";
import { EmailService } from "./email.service";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly pushService: PushService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    const timer = setInterval(() => void this.sendOverdueOrderReminders(), 15 * 60 * 1000);
    timer.unref();
  }

  async notifyCommandCreated(command: Command & { commandDetails?: Array<{ product?: { productName: string; photos?: Array<{ photoDoc: string }> }; client?: { firstName: string; lastName: string; phoneNumber: string } }> }) {
    const title = "Nouvelle commande";
    const detail = command.commandDetails?.[0];
    const clientName = detail?.client ? `${detail.client.firstName} ${detail.client.lastName}` : "Client";
    const productName = detail?.product?.productName || `${command.productsNumber} article(s)`;
    const productImage = detail?.product?.photos?.[0]?.photoDoc;
    const body = `Le client ${clientName} a commandé ${productName} · ${command.PrixVente.toFixed(3)} TND · ${command.adresseLivraison}`;
    await this.dispatch({
      type: NotificationType.COMMAND_CREATED,
      title,
      body,
      linkPath: "/commands",
      entityId: command.id,
      clientName,
      clientPhone: detail?.client?.phoneNumber,
      orderAddress: command.adresseLivraison,
      productName,
      productImage,
      orderPrice: command.PrixVente,
      createdAt: command.createdAt,
    });
    await this.emailService.sendOrderNotification({ clientName, productName, price: command.PrixVente, address: command.adresseLivraison, orderId: command.id, productImage, createdAt: command.createdAt });
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
    clientName?: string;
    clientPhone?: string;
    orderAddress?: string;
    productName?: string;
    productImage?: string;
    orderPrice?: number;
    createdAt?: Date;
  }) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          type: input.type,
          title: input.title,
          body: input.body,
          linkPath: input.linkPath,
          entityId: input.entityId,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          orderAddress: input.orderAddress,
          productName: input.productName,
          productImage: input.productImage,
          orderPrice: input.orderPrice,
        },
      });

      const payload = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        linkPath: notification.linkPath,
        entityId: notification.entityId,
        clientName: notification.clientName,
        clientPhone: notification.clientPhone,
        orderAddress: notification.orderAddress,
        productName: notification.productName,
        productImage: notification.productImage,
        orderPrice: notification.orderPrice,
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

  private async sendOverdueOrderReminders() {
    const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const overdue = await this.prisma.notification.findMany({
      where: { type: NotificationType.COMMAND_CREATED, read: false, reminderSentAt: null, createdAt: { lte: cutoff } },
      take: 25,
    });
    for (const notification of overdue) {
      if (!notification.clientName || !notification.productName || notification.orderPrice == null) continue;
      await this.emailService.sendOrderNotification({ clientName: notification.clientName, productName: notification.productName, price: notification.orderPrice, address: notification.orderAddress || "", orderId: notification.entityId || "", productImage: notification.productImage, reminder: true, createdAt: notification.createdAt });
      await this.prisma.notification.update({ where: { id: notification.id }, data: { reminderSentAt: new Date() } });
    }
  }
}
