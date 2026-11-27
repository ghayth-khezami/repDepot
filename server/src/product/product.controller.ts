import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Response } from "express";
import { SkipThrottle } from "@nestjs/throttler";
import { ProductService } from "./product.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";
import { ChangeLifecycleDto } from "./dto/change-lifecycle.dto";
import { SetFeaturedProductsDto } from "./dto/set-featured-products.dto";
import { PublishProductsDto } from "./dto/publish-products.dto";
import { buildProductsReportPdf } from "../export/products-report-pdf";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { ProductStatus, UserRole } from "@prisma/client";
import * as Papa from "papaparse";
import * as jsPDF from "jspdf";
import { join } from "path";
import * as fs from "fs";
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from "@nestjs/platform-express";
import {
  buildProductLabelsPdf,
  buildSingleProductLabelPdf,
  buildProductQrPdf,
} from "../common/barcode-label.util";
import { memoryImageUpload } from "../common/utils/image-upload";
import { buildQrCardsPdf } from "../common/barcode-label.util";
import { CloudinaryService } from "../cloudinary/cloudinary.service";

const productPhotoUpload = memoryImageUpload({ fileSize: 5 * 1024 * 1024 });

@ApiTags("products")
@ApiBearerAuth()
@Controller("products")
export class ProductController {
  constructor(
    private readonly productService: ProductService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Create a new product" })
  @ApiResponse({ status: 201, description: "Product created" })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Post("with-photos")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: "photos", maxCount: 20 },
      ],
      productPhotoUpload,
    ),
  )
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        productName: { type: "string" },
        description: { type: "string" },
        instagramLink: { type: "string" },
        facebookLink: { type: "string" },
        tiktokLink: { type: "string" },
        PrixVente: { type: "number" },
        PrixAchat: { type: "number" },
        isDepot: { type: "boolean" },
        depotPercentage: { type: "number" },
        surcharge: { type: "number" },
        coclientId: { type: "string" },
        categoryId: { type: "string" },
        subCategoryId: { type: "string" },
        photos: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
      },
      required: ["productName", "PrixVente", "isDepot", "categoryId"],
    },
  })
  @ApiOperation({ summary: "Create product with photos in one request" })
  async createWithPhotos(
    @Body() body: Record<string, string>,
    @UploadedFiles()
    files: {
      photos?: Express.Multer.File[];
    },
  ) {
    const parseIds = (value?: string) => {
      if (!value) return undefined;
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : undefined;
      } catch {
        return undefined;
      }
    };
    const dto: CreateProductDto = {
      productName: body.productName,
      description: body.description || undefined,
      instagramLink: body.instagramLink || undefined,
      facebookLink: body.facebookLink || undefined,
      tiktokLink: body.tiktokLink || undefined,
      PrixVente: Number(body.PrixVente),
      PrixAchat: body.PrixAchat ? Number(body.PrixAchat) : undefined,
      isDepot: body.isDepot === "true",
      isDispo: body.isDispo === undefined ? true : body.isDispo === "true",
      depotPercentage: body.depotPercentage
        ? Number(body.depotPercentage)
        : undefined,
      surcharge: body.surcharge ? Number(body.surcharge) : 0,
      coclientId: body.coclientId || undefined,
      categoryId: body.categoryId,
      categoryIds: parseIds(body.categoryIds),
      subCategoryId: body.subCategoryId || undefined,
      subCategoryIds: parseIds(body.subCategoryIds),
      subSubCategory1Id: body.subSubCategory1Id || undefined,
      subSubCategory1Ids: parseIds(body.subSubCategory1Ids),
      subSubCategory2Id: body.subSubCategory2Id || undefined,
      subSubCategory2Ids: parseIds(body.subSubCategory2Ids),
      subSubCategory3Id: body.subSubCategory3Id || undefined,
      subSubCategory3Ids: parseIds(body.subSubCategory3Ids),
      status: (Object.values(ProductStatus) as string[]).includes(body.status)
        ? (body.status as ProductStatus)
        : undefined,
      ref: body.ref?.trim() || undefined,
    };
    const photoDocs = await this.cloudinary.uploadFiles(
      files?.photos || [],
      "products",
    );
    return this.productService.createWithPhotos(dto, photoDocs);
  }

  @Patch("admin/publish")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Admin: publier / dépublier des produits sur le site" })
  publish(@Body() dto: PublishProductsDto) {
    return this.productService.setPublished(dto.ids, dto.published);
  }

  @Get("admin/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @SkipThrottle()
  @ApiOperation({ summary: "Admin: full product list with sensitive fields" })
  findAllAdmin(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query, { sanitize: false });
  }

  @Get()
  @ApiOperation({
    summary: "Get all products with pagination, search and filters",
  })
  @SkipThrottle()
  @ApiResponse({ status: 200, description: "List of products" })
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query, { sanitize: true });
  }

  @Get("price-range")
  @SkipThrottle()
  getPriceRange() {
    return this.productService.getPriceRange();
  }

  @Get("featured")
  @ApiOperation({ summary: "Get featured products for homepage (max 8)" })
  @SkipThrottle()
  @ApiResponse({ status: 200, description: "Featured products list" })
  getFeatured() {
    return this.productService.getFeaturedProducts();
  }

  @Get("featured/ids")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get featured product IDs (admin)" })
  @SkipThrottle()
  getFeaturedIds() {
    return this.productService.getFeaturedProductIds();
  }

  @Put("featured")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Set featured products (max 8, ordered)" })
  setFeatured(@Body() dto: SetFeaturedProductsDto) {
    return this.productService.setFeaturedProducts(dto.productIds);
  }

  @Get("export/csv")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Export products as CSV (Oui / Non, statut lisible, couleur = état)" })
  async exportCsv(@Res() res: Response) {
    const rows = await this.productService.reportRows();
    const csv = Papa.unparse(
      rows.map((r) => ({
        "Réf.": r.ref,
        Produit: r.name,
        Catégorie: r.category,
        Type: r.type,
        Statut: r.stage,
        Vendu: r.sold,
        Payé: r.paid,
        Livré: r.delivered,
        "En ligne": r.online,
        "Prix (TND)": (r.priceMillimes / 1000).toFixed(3),
        "Commission %": r.commission ?? "",
        "Part déposant (TND)": r.depositorMillimes != null ? (r.depositorMillimes / 1000).toFixed(3) : "",
        Déposant: r.deposant,
        Contrat: r.contract,
        "Fin du contrat": r.contractEnd ? r.contractEnd.toLocaleDateString("fr-FR") : "",
        "Vendu le": r.soldAt ? r.soldAt.toLocaleDateString("fr-FR") : "",
        "À noter": r.alertLabel,
      })),
      { header: true, delimiter: ";" },
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=produits.csv");
    res.send("\ufeff" + csv);
  }

  @Get("export/pdf")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Liste des produits en PDF (paysage, couleurs : vert terminé, jaune à payer, rouge contrat bientôt fini)" })
  async exportPdf(@Res() res: Response) {
    const rows = await this.productService.reportRows();
    const buffer = buildProductsReportPdf(rows, { shopName: "Bébé-Dépôt" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="produits-${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  }

  @Get("export/labels/pdf")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Export barcode label stickers PDF for all products" })
  async exportLabelsPdf(@Res() res: Response, @Query() query: ProductQueryDto) {
    const result = await this.productService.findAll({
      limit: 10000,
      page: 1,
      ...query,
    });
    const buffer = buildProductLabelsPdf(
      result.data.map((product) => ({
        productName: product.productName,
        PrixVente: product.PrixVente,
        barcode: product.barcode,
      })),
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=etiquettes-code-barres.pdf",
    );
    res.send(buffer);
  }

  @Get("export/qr/pdf")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Export one QR code per product" })
  async exportQrPdf(@Res() res: Response) {
    const products = await this.productService.findAllForQrExport();
    const buffer = await buildProductQrPdf(products);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=produits-qr.pdf");
    res.send(buffer);
  }

  @Get("export/qr-cards/pdf")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "A4 sheet of QR cards (3×4) for the products matching the current filters" })
  async exportQrCards(@Query() query: ProductQueryDto, @Res() res: Response) {
    const products = await this.productService.findForQrCards(query);
    const buffer = await buildQrCardsPdf(products);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="qr-produits.pdf"');
    res.send(buffer);
  }

  @Get(":id/qr-card/pdf")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "QR card for one product (same card format as the sheet)" })
  async exportOneQrCard(@Param("id") id: string, @Res() res: Response) {
    const p = await this.productService.findOne(id);
    const buffer = await buildQrCardsPdf([{ id: p.id, ref: p.ref, productName: p.productName, description: p.description, PrixVente: p.PrixVente }]);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="qr-${(p.ref || p.id).replace(/[^\w-]/g, "")}.pdf"`);
    res.send(buffer);
  }

  @Patch(":id/lifecycle")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Change status: EN_VENTE → VENDU → PAYE (or reset). Notifies the déposant." })
  changeLifecycle(@Param("id") id: string, @Body() dto: ChangeLifecycleDto) {
    return this.productService.changeLifecycle(id, dto.to);
  }

  @Get("lookup/:code")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Admin: find product by QR payload, id, ref (P-00012 / 12) or barcode" })
  async lookup(@Param("code") code: string) {
    const product = await this.productService.lookup(code);
    // Scanner: does this article already have its order? (→ "Vendu / Payé" asks for the order if not)
    return { ...product, inOrder: await this.productService.isInOrder(product.id) };
  }

  @Get("by-barcode/:code")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Admin: find product by barcode (scanner)" })
  findByBarcode(@Param("code") code: string) {
    return this.productService.findByBarcode(code);
  }

  @Get(":id/label/pdf")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Download barcode label PDF for one product" })
  async exportSingleLabelPdf(@Param("id") id: string, @Res() res: Response) {
    const product = await this.productService.findOne(id);
    if (product.isDepot) {
      throw new BadRequestException("Article de dépôt : son QR est déjà imprimé avec le contrat (réimprimez les étiquettes du contrat).");
    }
    const buffer = buildSingleProductLabelPdf({
      productName: product.productName,
      PrixVente: product.PrixVente,
      barcode: product.barcode,
    });
    res.setHeader("Content-Type", "application/pdf");
    const safeName = product.productName
      .replace(/[^a-z0-9-_]/gi, "_")
      .slice(0, 40);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=etiquette-${safeName}.pdf`,
    );
    res.send(buffer);
  }

  @Get(":id/full")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @SkipThrottle()
  @ApiOperation({ summary: "Admin: get product with sensitive fields" })
  findOneFull(@Param("id") id: string) {
    return this.productService.findOneAdmin(id);
  }

  @Get(":id")
  @SkipThrottle()
  @ApiOperation({ summary: "Get a product by ID" })
  @ApiParam({ name: "id", description: "Product ID" })
  @ApiResponse({ status: 200, description: "Product found" })
  @ApiResponse({ status: 404, description: "Product not found" })
  findOne(@Param("id") id: string) {
    return this.productService.findOnePublic(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Update a product" })
  @ApiParam({ name: "id", description: "Product ID" })
  @ApiResponse({ status: 200, description: "Product updated" })
  @ApiResponse({ status: 404, description: "Product not found" })
  update(@Param("id") id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a product" })
  @ApiParam({ name: "id", description: "Product ID" })
  @ApiResponse({ status: 200, description: "Product deleted" })
  @ApiResponse({ status: 404, description: "Product not found" })
  remove(@Param("id") id: string) {
    return this.productService.remove(id);
  }
}
