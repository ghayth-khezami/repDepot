import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';
import { CommandQueryDto } from './dto/command-query.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class CommandService {
  constructor(private prisma: PrismaService) {}

  async create(createCommandDto: CreateCommandDto) {
    const { productIds, clientId, coClientId, ...commandData } = createCommandDto;

    // Create the command first
    const command = await this.prisma.command.create({
      data: {
        ...commandData,
        dateLivraison: createCommandDto.dateLivraison ? new Date(createCommandDto.dateLivraison) : null,
      },
    });

    // Create command details for each product
    const commandDetails = await Promise.all(
      productIds.map((productId) =>
        this.prisma.commandDetail.create({
          data: {
            commandId: command.id,
            productId,
            clientId,
            coClientId: coClientId || null,
          },
        })
      )
    );

    // Return command with details
    return this.prisma.command.findUnique({
      where: { id: command.id },
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

  async findAll(query: CommandQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search, status } = query;
    const actualLimit = Math.min(limit || 10, 10); // Enforce max 10
    const skip = (page - 1) * actualLimit;

    const where: any = {};

    if (search) {
      where.adresseLivraison = { contains: search, mode: 'insensitive' as const };
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
                },
              },
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
              coClient: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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
            product: true,
            client: true,
            coClient: true,
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

    const data: any = { ...updateCommandDto };
    if (updateCommandDto.dateLivraison) {
      data.dateLivraison = new Date(updateCommandDto.dateLivraison);
    }

    // If status is being updated to DELIVERED or GOT_PROFIT, set products' isDispo to false
    if (updateCommandDto.status === 'DELIVERED' || updateCommandDto.status === 'GOT_PROFIT') {
      const productIds = command.commandDetails.map((detail) => detail.productId);
      if (productIds.length > 0) {
        await this.prisma.product.updateMany({
          where: {
            id: { in: productIds },
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
            product: true,
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

    return { message: 'Command deleted successfully' };
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
