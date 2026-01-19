import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCoClientDto } from './dto/create-co-client.dto';
import { CoClientQueryDto } from './dto/co-client-query.dto';
import { PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class CoClientService {
  constructor(private prisma: PrismaService) {}

  async create(createCoClientDto: CreateCoClientDto) {
    return this.prisma.coClient.create({
      data: createCoClientDto,
    });
  }

  async findAll(query: CoClientQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phoneNumber: { contains: search, mode: 'insensitive' as const } },
            { RIB: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.coClient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coClient.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const coClient = await this.prisma.coClient.findUnique({
      where: { id },
    });

    if (!coClient) {
      throw new NotFoundException(`CoClient with ID ${id} not found`);
    }

    return coClient;
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.coClient.delete({
      where: { id },
    });

    return { message: 'CoClient deleted successfully' };
  }
}
