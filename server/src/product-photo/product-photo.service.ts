import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ProductPhotoService {
  constructor(private prisma: PrismaService) {}

  async create(productId: string, photoDoc: string) {
    return this.prisma.productPhoto.create({
      data: {
        idProduct: productId,
        photoDoc,
      },
    });
  }

  async createMany(productId: string, photoDocs: string[]) {
    return this.prisma.productPhoto.createMany({
      data: photoDocs.map((photoDoc) => ({
        idProduct: productId,
        photoDoc,
      })),
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.productPhoto.findMany({
      where: { idProduct: productId },
    });
  }

  async remove(id: string) {
    const photo = await this.prisma.productPhoto.findUnique({
      where: { id },
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${id} not found`);
    }

    await this.prisma.productPhoto.delete({
      where: { id },
    });

    return { message: "Photo deleted successfully" };
  }

  async removeByProduct(productId: string) {
    await this.prisma.productPhoto.deleteMany({
      where: { idProduct: productId },
    });
  }
}
