import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { UserRole } from "@prisma/client";

/** The owner account: always ADMIN, cannot be deleted (PROTECTED_ADMIN_EMAIL overrides). */
export const PROTECTED_ADMIN_EMAIL = (process.env.PROTECTED_ADMIN_EMAIL || "eya@bebedepot.tn").toLowerCase();
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserQueryDto } from "./dto/user-query.dto";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import * as bcrypt from "bcryptjs";

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await ensureOwnerIsAdmin(this.prisma).catch(() => undefined);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(query: UserQueryDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 10, search } = query;
    const actualLimit = Math.min(limit || 10, 50); // Requests above 50 are clamped, never rejected
    const skip = (page - 1) * actualLimit;

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { username: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: actualLimit,
        select: {
          id: true,
          email: true,
          username: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const current = await this.findOne(id);

    const data: any = { ...updateUserDto };
    if ((current as { email?: string }).email?.toLowerCase() === PROTECTED_ADMIN_EMAIL) {
      // The owner keeps the ADMIN role and her email.
      if (data.role && data.role !== UserRole.ADMIN) throw new ForbiddenException("Le compte propriétaire reste administrateur.");
      delete data.email;
    }
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    if ((current as { email?: string }).email?.toLowerCase() === PROTECTED_ADMIN_EMAIL) {
      throw new ForbiddenException("Le compte propriétaire (" + PROTECTED_ADMIN_EMAIL + ") ne peut pas être supprimé.");
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: "User deleted successfully" };
  }
}

/** Startup safety net: the owner account always has the ADMIN role. */
export async function ensureOwnerIsAdmin(prisma: PrismaService) {
  await prisma.user.updateMany({ where: { email: PROTECTED_ADMIN_EMAIL, NOT: { role: UserRole.ADMIN } }, data: { role: UserRole.ADMIN } });
}
