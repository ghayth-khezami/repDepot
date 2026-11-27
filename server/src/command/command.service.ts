import { publishProductStatusChangedLater } from "../common/domain-events";
import { PayoutStatus, ProductStatus } from "@prisma/client";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { CommandStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationService } from "../notification/notification.service";
import { CreateCommandDto } from "./dto/create-command.dto";
import { CheckoutCommandDto } from "./dto/checkout-command.dto";
import { UpdateCommandDto } from "./dto/update-command.dto";
import { CommandQueryDto } from "./dto/command-query.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { sanitizePlainText } from "../common/utils/sanitize-text";
import { SiteSettingsService } from "../site-settings/site-settings.service";
import { SurPlaceCommandDto } from "./dto/sur-place-command.dto";

/** Shared client used for in-shop sales ("Achat sur place"). */
export const WALK_IN_EMAIL = "sur-place@bebedepot.local";

/** Sets soldAt (first sale only) and the default payout status for dépôt products. */
async function stampSold(tx: any, productIds: string[]) {
  if (!productIds.length) return;
  publishProductStatusChangedLater({ productIds, to: "VENDU", source: "order" });
  await tx.product.updateMany({
    where: { id: { in: productIds }, soldAt: null },
    data: { soldAt: new Date() },
  });
  await tx.product.updateMany({
    where: { id: { in: productIds }, isDepot: true, payoutStatus: null },
    data: { payoutStatus: PayoutStatus.A_PERCEVOIR },
  });
}

@Injectable()
export class CommandService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private siteSettings: SiteSettingsService,
  ) {}

  private async resolvePricing(productIds: string[]) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        isDispo: true,
        status: true,
        PrixVente: true,
        PrixAchat: true,
        isDepot: true,
        _count: { select: { commandDetails: true } },
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("Un ou plusieurs articles sont introuvables.");
    }

    // An article marked « Vendu » in the backoffice but not yet in an order can still get its order
    // ("Continuer la commande" / "Achat sur place"). Only articles already in an order, or withdrawn, are refused.
    const unavailable = products.filter((p) => p._count.commandDetails > 0 || p.status === ProductStatus.RETIRE || (p.isDispo === false && p.status !== ProductStatus.VENDU));
    if (unavailable.length > 0) {
      throw new BadRequestException("Un ou plusieurs articles sont déjà dans une commande (ou retirés).");
    }

    const PrixVente = products.reduce((sum, p) => sum + p.PrixVente, 0);
    const PrixAchat = products.reduce((sum, p) => {
      if (p.isDepot) return sum;
      return sum + (p.PrixAchat || 0);
    }, 0);

    return { products, PrixVente, PrixAchat, productsNumber: productIds.length };
  }

  async createFromCheckout(dto: CheckoutCommandDto) {
    const productIds = [...new Set(dto.productIds)];
    const adresseLivraison = sanitizePlainText(dto.adresseLivraison, 500);
    const guestClient = dto.guestClient
      ? {
          ...dto.guestClient,
          firstName: sanitizePlainText(dto.guestClient.firstName, 80),
          lastName: sanitizePlainText(dto.guestClient.lastName, 80),
          address: sanitizePlainText(dto.guestClient.address, 300),
        }
      : undefined;

    const command = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, isDispo: true },
        select: { id: true, PrixVente: true, PrixAchat: true, isDepot: true },
      });

      if (products.length !== productIds.length) {
        throw new BadRequestException("One or more products are unavailable.");
      }

      const locked = await tx.product.updateMany({
        where: { id: { in: productIds }, isDispo: true },
        data: { isDispo: false, status: ProductStatus.VENDU },
      });
      if (locked.count !== productIds.length) {
        throw new BadRequestException("One or more products are already ordered.");
      }
      await stampSold(tx, productIds);

      const PrixVente = products.reduce((sum, p) => sum + p.PrixVente, 0);
      const PrixAchat = products.reduce((sum, p) => {
        if (p.isDepot) return sum;
        return sum + (p.PrixAchat || 0);
      }, 0);

      return this.persistCommandInTx(
        tx,
        {
          productIds,
          clientId: dto.clientId,
          guestClient,
          coClientId: dto.coClientId,
          adresseLivraison,
          dateLivraison: dto.dateLivraison,
          PrixVente,
          PrixAchat,
          productsNumber: productIds.length,
          status: CommandStatus.NOT_DELIVERED,
        },
        { productsAlreadyLocked: true },
      );
    });

    if (command) {
      void this.notificationService.notifyCommandCreated(command);
    }
    return command;
  }

  async create(createCommandDto: CreateCommandDto) {
    const { productIds, clientId, guestClient, coClientId, adresseLivraison, dateLivraison } =
      createCommandDto;
    const pricing = await this.resolvePricing(productIds);

    return this.persistCommandInTx(this.prisma, {
      productIds,
      clientId,
      guestClient,
      coClientId,
      adresseLivraison,
      dateLivraison,
      PrixVente: pricing.PrixVente,
      PrixAchat: pricing.PrixAchat,
      productsNumber: pricing.productsNumber,
      status: createCommandDto.status ?? CommandStatus.NOT_DELIVERED,
    });
  }

  /** In-shop sale: "Client sur place", shop address, delivered immediately, dated `date` (default now). */
  async createSurPlace(dto: SurPlaceCommandDto) {
    const productIds = [...new Set(dto.productIds)];
    const pricing = await this.resolvePricing(productIds);
    const shop = await this.siteSettings.getShopContact();
    const when = dto.date ? new Date(dto.date) : new Date();
    const walkIn = await this.prisma.client.upsert({
      where: { email: WALK_IN_EMAIL },
      update: {},
      create: { email: WALK_IN_EMAIL, firstName: "Client", lastName: "sur place", address: shop.address, phoneNumber: "00000000" },
    });
    const command = await this.persistCommandInTx(this.prisma, {
      productIds,
      clientId: walkIn.id,
      coClientId: undefined,
      adresseLivraison: `Achat sur place — ${shop.address}`,
      dateLivraison: when.toISOString(),
      PrixVente: pricing.PrixVente,
      PrixAchat: pricing.PrixAchat,
      productsNumber: pricing.productsNumber,
      status: CommandStatus.DELIVERED,
    });
    if (command) {
      await this.prisma.command.update({ where: { id: command.id }, data: { createdAt: when, acceptedAt: when, deliveredAt: when } });
      await this.prisma.product.updateMany({ where: { id: { in: productIds } }, data: { soldAt: when } });
    }
    return command;
  }

  private async persistCommandInTx(
    tx: Pick<PrismaService, "client" | "command" | "commandDetail" | "product">,
    input: {
      productIds: string[];
      clientId?: string;
      guestClient?: CheckoutCommandDto["guestClient"];
      coClientId?: string;
      adresseLivraison: string;
      dateLivraison?: string;
      PrixVente: number;
      PrixAchat: number;
      productsNumber: number;
      status: CommandStatus;
    },
    options?: { productsAlreadyLocked?: boolean },
  ) {
    const { productIds, clientId, guestClient, coClientId, adresseLivraison, dateLivraison } =
      input;
    let resolvedClientId = clientId;

    if (!resolvedClientId && guestClient) {
      const normalizedEmail =
        guestClient.email?.trim().toLowerCase() ||
        `guest.${guestClient.phoneNumber}@bebedepot.local`;
      const existingClient = await tx.client.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingClient) {
        resolvedClientId = existingClient.id;
      } else {
        const createdClient = await tx.client.create({
          data: {
            ...guestClient,
            email: normalizedEmail,
          },
        });
        resolvedClientId = createdClient.id;
      }
    }

    if (!resolvedClientId) {
      throw new BadRequestException("clientId or guestClient is required.");
    }

    const command = await tx.command.create({
      data: {
        PrixVente: input.PrixVente,
        PrixAchat: input.PrixAchat,
        productsNumber: input.productsNumber,
        status: input.status,
        adresseLivraison,
        dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
      },
    });

    await Promise.all(
      productIds.map((productId) =>
        tx.commandDetail.create({
          data: {
            commandId: command.id,
            productId,
            clientId: resolvedClientId || null,
            coClientId: coClientId || null,
          },
        }),
      ),
    );

    if (!options?.productsAlreadyLocked) {
      await tx.product.updateMany({
        where: { id: { in: productIds } },
        data: { isDispo: false, status: ProductStatus.VENDU },
      });
      await stampSold(tx, productIds);
    }

    return tx.command.findUnique({
      where: { id: command.id },
      include: {
        commandDetails: {
          include: {
            product: {
              include: {
                photos: {
                  take: 1,
                  orderBy: { createdAt: "asc" },
                },
              },
            },
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            coClient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll(query: CommandQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search, status } = query;
    const actualLimit = Math.min(limit || 10, 50); // Requests above 50 are clamped, never rejected
    const skip = (page - 1) * actualLimit;

    const where: any = {};

    if (search) {
      const q = { contains: search, mode: "insensitive" as const };
      const digits = search.replace(/\D/g, "");
      where.OR = [
        { adresseLivraison: q },
        { id: { startsWith: search.toLowerCase() } },
        {
          commandDetails: {
            some: {
              OR: [
                { client: { OR: [{ firstName: q }, { lastName: q }, ...(digits.length >= 3 ? [{ phoneNumber: { contains: digits } }] : [])] } },
                { product: { OR: [{ productName: q }, { ref: q }] } },
              ],
            },
          },
        },
      ];
    }

    if (status) {
      // "DELIVERED" also covers the legacy GOT_PROFIT status.
      where.status = status === "DELIVERED" ? { in: ["DELIVERED", "GOT_PROFIT"] } : status;
    }

    const [data, total] = await Promise.all([
      this.prisma.command.findMany({
        where,
        skip,
        take: actualLimit,
        include: {
          commandDetails: {
            include: {
              product: {
                select: {
                  id: true,
                  productName: true,
                  PrixVente: true,
                  photos: {
                    take: 1,
                    orderBy: { createdAt: "asc" },
                  },
                },
              },
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
              coClient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.command.count({ where }),
    ]);
    // Counts per status for the filter tabs (same search, any status).
    const { status: _ignored, ...searchOnly } = where;
    const grouped = await this.prisma.command.groupBy({ by: ["status"], where: searchOnly, _count: { _all: true } });
    const n = (s: string) => grouped.filter((g) => g.status === s).reduce((t, g) => t + g._count._all, 0);
    const counts = {
      all: grouped.reduce((t, g) => t + g._count._all, 0),
      NOT_DELIVERED: n("NOT_DELIVERED"),
      ACCEPTED: n("ACCEPTED"),
      DELIVERED: n("DELIVERED") + n("GOT_PROFIT"),
      CANCELLED: n("CANCELLED"),
    };

    return {
      data,
      meta: {
        page,
        limit: actualLimit,
        total,
        totalPages: Math.ceil(total / actualLimit),
        counts,
      },
    };
  }

  async findOne(id: string) {
    const command = await this.prisma.command.findUnique({
      where: { id },
      include: {
        commandDetails: {
          include: {
            product: {
              include: {
                photos: {
                  take: 1,
                  orderBy: { createdAt: "asc" },
                },
              },
            },
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
            coClient: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
              },
            },
          },
        },
      },
    });

    if (!command) {
      throw new NotFoundException(`Command with ID ${id} not found`);
    }

    return command;
  }

  async update(id: string, updateCommandDto: UpdateCommandDto) {
    const command = await this.findOne(id);
    if (command.status === CommandStatus.CANCELLED) {
      throw new BadRequestException("Commande annulée : elle ne peut plus être modifiée (vous pouvez la supprimer).");
    }
    if (updateCommandDto.status === CommandStatus.CANCELLED) return this.cancel(id);
    const isLikelyWebOrder = command.commandDetails.length > 0
      && command.commandDetails.some((d) => !!d.client)
      && command.commandDetails.every((d) => !d.coClient);
    if (isLikelyWebOrder) {
      // Web orders: products / client / prices are the customer's; status, date and address can be edited.
      const forbiddenKeys = ["productsNumber", "PrixVente", "PrixAchat", "productIds", "clientId"];
      const hasForbidden = forbiddenKeys.some((k) => (updateCommandDto as any)[k] !== undefined);
      if (hasForbidden) {
        throw new BadRequestException("Commande web : seuls le statut, la date et l'adresse de livraison sont modifiables.");
      }
    }

    const { productIds, clientId, ...rest } = updateCommandDto;
    const data: any = { ...rest };
    if (updateCommandDto.dateLivraison) {
      data.dateLivraison = new Date(updateCommandDto.dateLivraison);
    }
    if (updateCommandDto.adresseLivraison !== undefined) {
      data.adresseLivraison = sanitizePlainText(updateCommandDto.adresseLivraison, 500);
    }
    // Timestamps for the customer's stepper (Reçue → Acceptée → Livrée).
    if (updateCommandDto.status && updateCommandDto.status !== command.status) {
      const now = new Date();
      if (updateCommandDto.status === CommandStatus.NOT_DELIVERED) Object.assign(data, { acceptedAt: null, deliveredAt: null });
      if (updateCommandDto.status === CommandStatus.ACCEPTED) Object.assign(data, { acceptedAt: command.acceptedAt ?? now, deliveredAt: null });
      if (updateCommandDto.status === CommandStatus.DELIVERED || updateCommandDto.status === CommandStatus.GOT_PROFIT) {
        Object.assign(data, { acceptedAt: command.acceptedAt ?? now, deliveredAt: command.deliveredAt ?? now });
      }
    }

    if (productIds && productIds.length > 0 && !isLikelyWebOrder) {
      const oldProductIds = command.commandDetails.map((d) => d.productId);
      const resolvedClientId =
        clientId || command.commandDetails.find((d) => d.clientId)?.clientId;
      if (!resolvedClientId) {
        throw new BadRequestException("clientId is required when updating products.");
      }

      await this.prisma.$transaction(async (tx) => {
        if (oldProductIds.length > 0) {
          await tx.product.updateMany({
            where: { id: { in: oldProductIds } },
            data: { isDispo: true, status: ProductStatus.EN_VENTE, soldAt: null, payoutStatus: null },
          });
        }
        await tx.commandDetail.deleteMany({ where: { commandId: id } });
        await Promise.all(
          productIds.map((productId) =>
            tx.commandDetail.create({
              data: {
                commandId: id,
                productId,
                clientId: resolvedClientId,
                coClientId: updateCommandDto.coClientId || null,
              },
            }),
          ),
        );
        await tx.product.updateMany({
          where: { id: { in: productIds } },
          data: { isDispo: false, status: ProductStatus.VENDU },
        });
        await stampSold(tx, productIds);
      });
    }

    // If status is updated to DELIVERED, keep products unavailable
    if (updateCommandDto.status === "DELIVERED") {
      const productIdsToLock = productIds?.length
        ? productIds
        : command.commandDetails.map((detail) => detail.productId);
      if (productIdsToLock.length > 0) {
        await this.prisma.product.updateMany({
          where: {
            id: { in: productIdsToLock },
          },
          data: { isDispo: false, status: ProductStatus.VENDU },
        });
        await stampSold(this.prisma, productIdsToLock);
      }
    }

    return this.prisma.command.update({
      where: { id },
      data,
      include: {
        commandDetails: {
          include: {
            product: {
              include: {
                photos: { take: 1, orderBy: { createdAt: "asc" } },
              },
            },
            client: true,
            coClient: true,
          },
        },
      },
    });
  }

  /** Annulée: the articles go back on sale (unless the déposant was already paid for them). */
  async cancel(id: string) {
    const command = await this.findOne(id);
    if (command.status === CommandStatus.CANCELLED) return command;
    const productIds = command.commandDetails.map((d) => d.productId);
    const released = await this.prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { id: true, payoutStatus: true } });
      const ids = products.filter((p) => p.payoutStatus !== PayoutStatus.PAYE).map((p) => p.id);
      if (ids.length) {
        await tx.product.updateMany({
          where: { id: { in: ids } },
          data: { status: ProductStatus.EN_VENTE, isDispo: true, soldAt: null, payoutStatus: null, paidAt: null, soldNotifiedAt: null, paidNotifiedAt: null },
        });
      }
      await tx.command.update({ where: { id }, data: { status: CommandStatus.CANCELLED, cancelledAt: new Date() } });
      return ids;
    });
    if (released.length) publishProductStatusChangedLater({ productIds: released, to: "EN_VENTE" }, 100);
    return this.findOne(id);
  }

  /** Only a cancelled order can be deleted (its articles are already back on sale). */
  async remove(id: string) {
    const command = await this.findOne(id);
    if (command.status !== CommandStatus.CANCELLED) {
      throw new BadRequestException("Annulez d'abord la commande (statut « Annulée ») avant de la supprimer.");
    }
    await this.prisma.command.delete({ where: { id } });
    return { message: "Commande supprimée" };
  }

  async removeAll() {
    const result = await this.prisma.command.deleteMany({ where: { status: CommandStatus.CANCELLED } });
    return { deleted: result.count };
  }

  async getAllForExport() {
    return this.prisma.command.findMany({
      include: {
        commandDetails: {
          include: {
            product: true,
            client: true,
            coClient: true,
          },
        },
      },
    });
  }
}
