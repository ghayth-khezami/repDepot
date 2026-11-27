import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

export const MAX_PRODUCT_PHOTOS = 4;

@Injectable()
export class ProductPhotoService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async create(productId: string, photoDoc: string) {
    return this.prisma.productPhoto.create({
      data: {
        idProduct: productId,
        photoDoc,
      },
    });
  }

  /** A product shows at most MAX_PRODUCT_PHOTOS photos (backoffice + boutique gallery). */
  async assertRoom(productId: string, adding: number) {
    const existing = await this.prisma.productPhoto.count({ where: { idProduct: productId } });
    if (existing + adding > MAX_PRODUCT_PHOTOS) {
      throw new BadRequestException(
        `Maximum ${MAX_PRODUCT_PHOTOS} photos par produit (déjà ${existing}). Supprimez-en avant d'en ajouter.`,
      );
    }
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

    await this.cloudinary.deleteByUrl(photo.photoDoc);

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
