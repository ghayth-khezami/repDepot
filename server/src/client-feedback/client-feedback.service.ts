import { Injectable, NotFoundException } from "@nestjs/common";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { PrismaService } from "../prisma/prisma.service";
import { ClientFeedbackQueryDto } from "./dto/client-feedback-query.dto";
import { CreateClientFeedbackDto } from "./dto/create-client-feedback.dto";
import { UpdateClientFeedbackDto } from "./dto/update-client-feedback.dto";

@Injectable()
export class ClientFeedbackService {
  constructor(private prisma: PrismaService) {}

  async findPublished() {
    return this.prisma.clientFeedback.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  }

  async findAllAdmin(query: ClientFeedbackQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search } = query;
    const actualLimit = Math.min(limit || 10, 50);
    const skip = (page - 1) * actualLimit;
    const where = search
      ? {
          OR: [
            { clientName: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.clientFeedback.findMany({
        where,
        skip,
        take: actualLimit,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      this.prisma.clientFeedback.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit: actualLimit, total, totalPages: Math.ceil(total / actualLimit) },
    };
  }

  async create(dto: CreateClientFeedbackDto) {
    return this.prisma.clientFeedback.create({
      data: {
        clientName: dto.clientName,
        description: dto.description,
        rating: dto.rating,
        sortOrder: dto.sortOrder ?? 0,
        isPublished: dto.isPublished ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateClientFeedbackDto) {
    await this.findOne(id);
    return this.prisma.clientFeedback.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.clientFeedback.delete({ where: { id } });
    return { message: "Feedback deleted successfully" };
  }

  private async findOne(id: string) {
    const row = await this.prisma.clientFeedback.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`ClientFeedback ${id} not found`);
    return row;
  }
}
