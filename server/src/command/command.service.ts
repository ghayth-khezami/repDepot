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

@Injectable()
export class CommandService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  private async resolvePricing(productIds: string[]) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, isDispo: true, PrixVente: true, PrixAchat: true, isDepot: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException("One or more products were not found.");
    }

    const unavailable = products.filter((p) => p.isDispo === false).map((p) => p.id);
    if (unavailable.length > 0) {
      throw new BadRequestException("One or more products are already ordered.");
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
        data: { isDispo: false },
      });
      if (locked.count !== productIds.length) {
        throw new BadRequestException("One or more products are already ordered.");
      }

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
        data: { isDispo: false },
      });
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
    const actualLimit = Math.min(limit || 10, 10); // Enforce max 10
    const skip = (page - 1) * actualLimit;

    const where: any = {};

    if (search) {
      where.adresseLivraison = {
        contains: search,
        mode: "insensitive" as const,
      };
    }

    if (status) {
      where.status = status;
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

    return {
      data,
      meta: {
        page,
        limit: actualLimit,
        total,
        totalPages: Math.ceil(total / actualLimit),
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
    const isLikelyWebOrder = command.commandDetails.length > 0
      && command.commandDetails.some((d) => !!d.client)
      && command.commandDetails.every((d) => !d.coClient);
    if (isLikelyWebOrder) {
      const forbiddenKeys = ["productsNumber", "PrixVente", "PrixAchat", "adresseLivraison", "productIds", "clientId"];
      const hasForbidden = forbiddenKeys.some((k) => (updateCommandDto as any)[k] !== undefined);
      if (hasForbidden) {
        throw new BadRequestException("Web orders can only update status/date.");
      }
    }

    const { productIds, clientId, ...rest } = updateCommandDto;
    const data: any = { ...rest };
    if (updateCommandDto.dateLivraison) {
      data.dateLivraison = new Date(updateCommandDto.dateLivraison);
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
            data: { isDispo: true },
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
          data: { isDispo: false },
        });
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
          data: {
            isDispo: false,
          },
        });
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

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.command.delete({
      where: { id },
    });

    return { message: "Command deleted successfully" };
  }

  async removeAll() {
    const result = await this.prisma.command.deleteMany();
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
