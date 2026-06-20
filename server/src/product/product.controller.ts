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
import { ProductService } from "./product.service";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
import { ProductQueryDto } from "./dto/product-query.dto";
import { SetFeaturedProductsDto } from "./dto/set-featured-products.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UserRole } from "@prisma/client";
import * as Papa from "papaparse";
import * as jsPDF from "jspdf";
import { join } from "path";
import * as fs from "fs";
import {
  FileFieldsInterceptor,
  FileInterceptor,
  FilesInterceptor,
} from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname } from "path";
import { compressUploadedFile, compressUploadedFiles } from "../common/image-compress.util";
import {
  buildProductLabelsPdf,
  buildSingleProductLabelPdf,
} from "../common/barcode-label.util";

@ApiTags("products")
@ApiBearerAuth()
@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

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
        { name: "marque", maxCount: 1 },
      ],
      {
        storage: diskStorage({
          destination: (req, file, cb) => {
            if (file.fieldname === "marque") {
              const brandsDir = join(process.cwd(), "uploads", "brands");
              if (!fs.existsSync(brandsDir)) {
                fs.mkdirSync(brandsDir, { recursive: true });
              }
              cb(null, brandsDir);
              return;
            }
            const uploadsDir = join(process.cwd(), "uploads");
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }
            cb(null, uploadsDir);
          },
          filename: (req, file, cb) => {
            const uniqueSuffix =
              Date.now() + "-" + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            const prefix =
              file.fieldname === "marque" ? "marque-" : "product-";
            cb(null, `${prefix}${uniqueSuffix}${ext}`);
          },
        }),
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
        fileFilter: (req, file, cb) => {
          if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
            cb(null, true);
          } else {
            cb(new Error("Only image files are allowed"), false);
          }
        },
      },
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
        stockQuantity: { type: "number" },
        isDepot: { type: "boolean" },
        depotPercentage: { type: "number" },
        surcharge: { type: "number" },
        coclientId: { type: "string" },
        categoryId: { type: "string" },
        subCategoryId: { type: "string" },
        markId: { type: "string" },
        photos: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
        marque: {
          type: "string",
          format: "binary",
          description: "Optional brand / marque logo (saved under uploads/brands)",
        },
      },
      required: ["productName", "PrixVente", "stockQuantity", "isDepot", "categoryId"],
    },
  })
  @ApiOperation({ summary: "Create product with photos in one request" })
  async createWithPhotos(
    @Body() body: Record<string, string>,
    @UploadedFiles()
    files: {
      photos?: Express.Multer.File[];
      marque?: Express.Multer.File[];
    },
  ) {
    const dto: CreateProductDto = {
      productName: body.productName,
      description: body.description || undefined,
      instagramLink: body.instagramLink || undefined,
      facebookLink: body.facebookLink || undefined,
      tiktokLink: body.tiktokLink || undefined,
      PrixVente: Number(body.PrixVente),
      PrixAchat: body.PrixAchat ? Number(body.PrixAchat) : undefined,
      stockQuantity: Number(body.stockQuantity),
      isDepot: body.isDepot === "true",
      depotPercentage: body.depotPercentage
        ? Number(body.depotPercentage)
        : undefined,
      surcharge: body.surcharge ? Number(body.surcharge) : 0,
      coclientId: body.coclientId || undefined,
      categoryId: body.categoryId,
      subCategoryId: body.subCategoryId || undefined,
      subSubCategory1Id: body.subSubCategory1Id || undefined,
      subSubCategory2Id: body.subSubCategory2Id || undefined,
      subSubCategory3Id: body.subSubCategory3Id || undefined,
      markId: body.markId || undefined,
    };
    await compressUploadedFiles(files?.photos);
    if (files?.marque?.[0]) await compressUploadedFile(files.marque[0]);

    const photoDocs = (files?.photos || []).map(
      (file) => `/uploads/${file.filename}`,
    );
    const marqueFile = files?.marque?.[0];
    const marqueDoc = marqueFile
      ? `/uploads/brands/${marqueFile.filename}`
      : undefined;
    return this.productService.createWithPhotos(dto, photoDocs, marqueDoc);
  }

  @Get("admin/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Admin: full product list with sensitive fields" })
  findAllAdmin(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query, { sanitize: false });
  }

  @Get()
  @ApiOperation({
    summary: "Get all products with pagination, search and filters",
  })
  @ApiResponse({ status: 200, description: "List of products" })
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query, { sanitize: true });
  }

  @Get("featured")
  @ApiOperation({ summary: "Get featured products for homepage (max 8)" })
  @ApiResponse({ status: 200, description: "Featured products list" })
  getFeatured() {
    return this.productService.getFeaturedProducts();
  }

  @Get("featured/ids")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Get featured product IDs (admin)" })
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
  @ApiOperation({ summary: "Export all products as CSV" })
  async exportCsv(@Res() res: Response) {
    try {
      const result = await this.productService.findAll({
        limit: 10000,
        page: 1,
      });
      const csvData = result.data.map((product) => ({
        ID: product.id,
        "Nom Produit": product.productName || "",
        Description: product.description || "",
        "Prix Vente": product.PrixVente || 0,
        "Prix Achat": product.PrixAchat || 0,
        "Quantité Stock": product.stockQuantity || 0,
        "En Dépôt": product.isDepot ? "Oui" : "Non",
        "Pourcentage Dépôt": product.depotPercentage || "",
        Surcharge: product.surcharge || 0,
        Gain: product.gain || 0,
        Statut: product.isDispo ? "Disponible" : "Rupture",
        Catégorie: product.category?.categoryName || "",
        "Co-Client": product.coClient
          ? `${product.coClient.firstName} ${product.coClient.lastName}`
          : "",
        "Date Création": new Date(product.createdAt).toLocaleDateString(
          "fr-FR",
        ),
      }));

      const csv = Papa.unparse(csvData, {
        header: true,
        delimiter: ",",
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=products.csv");
      res.send("\ufeff" + csv);
    } catch (error) {
      res.status(500).setHeader("Content-Type", "application/json");
      res.send(
        JSON.stringify({
          message: "Error exporting CSV",
          error: error.message,
        }),
      );
    }
  }

  @Get("export/pdf")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Export all products as PDF" })
  async exportPdf(@Res() res: Response) {
    const result = await this.productService.findAll({ limit: 10000, page: 1 });
    const doc = new jsPDF.jsPDF();

    // Brand colors (lavender, peach, yellow)
    const lavenderColor: [number, number, number] = [128, 90, 213]; // #805ad5
    const peachColor: [number, number, number] = [254, 215, 215]; // #fed7d7

    // Header with logo
    try {
      const logoPath = join(process.cwd(), "depot.jpg");
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = logoData.toString("base64");
        doc.addImage(logoBase64, "JPEG", 14, 10, 30, 30);
      }
    } catch (error) {
      // If logo not found, continue without it
    }

    // Header background with brand colors
    doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
    doc.rect(0, 0, 210, 15, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("BÉBÉ-DÉPÔT", 110, 25, { align: "center" });

    doc.setFontSize(14);
    doc.text("Rapport des Produits", 105, 35, { align: "center" });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    // Table header
    let y = 50;
    const startX = 14;
    const colWidths = [60, 30, 30, 25, 30, 25];
    const headers = [
      "Produit",
      "Prix Vente",
      "Prix Achat",
      "Stock",
      "Catégorie",
      "Dépôt",
    ];

    // Header row background
    doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
    doc.rect(startX, y - 8, 182, 8, "F");

    // Draw border around header
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(startX, y - 8, 182, 8);

    // Draw vertical lines in header
    let headerColX = startX;
    headers.forEach((_, i) => {
      if (i > 0) {
        doc.line(headerColX, y - 8, headerColX, y);
      }
      headerColX += colWidths[i];
    });

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    let x = startX + 2;
    headers.forEach((header, i) => {
      doc.text(header, x, y - 2);
      x += colWidths[i];
    });

    y += 2;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    result.data.forEach((product, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        // Add header to new page
        doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
        doc.rect(0, 0, 210, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("BÉBÉ-DÉPÔT", 110, 25, { align: "center" });
        doc.setFontSize(14);
        doc.text("Rapport des Produits", 105, 35, { align: "center" });
        doc.setTextColor(0, 0, 0);

        // Table header on new page
        y = 50;
        doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
        doc.rect(startX, y - 8, 182, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        x = startX + 2;
        headers.forEach((header, i) => {
          doc.text(header, x, y - 2);
          x += colWidths[i];
        });
        y += 2;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(peachColor[0], peachColor[1], peachColor[2]);
        doc.rect(startX, y - 6, 182, 6, "F");
      }

      // Table data
      x = startX + 2;
      const rowData = [
        product.productName.length > 25
          ? product.productName.substring(0, 22) + "..."
          : product.productName,
        `${product.PrixVente} TND`,
        `${product.PrixAchat} TND`,
        String(product.stockQuantity),
        product.category?.categoryName?.substring(0, 12) || "N/A",
        product.isDepot ? "Oui" : "Non",
      ];

      rowData.forEach((cell, i) => {
        doc.text(cell, x, y);
        x += colWidths[i];
      });

      // Draw borders - horizontal line below row
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(startX, y + 1, startX + 182, y + 1);

      // Draw vertical lines between columns
      let colX = startX;
      headers.forEach((_, i) => {
        if (i > 0) {
          doc.line(colX, y - 6, colX, y + 1);
        }
        colX += colWidths[i];
      });

      y += 7;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} / ${pageCount}`, 105, 290, { align: "center" });
      doc.text("BÉBÉ-DÉPÔT - Back Office", 105, 293, { align: "center" });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=products.pdf");
    res.send(Buffer.from(doc.output("arraybuffer")));
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

  @Post(":id/brand-mark")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor("marque", {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const brandsDir = join(process.cwd(), "uploads", "brands");
          if (!fs.existsSync(brandsDir)) {
            fs.mkdirSync(brandsDir, { recursive: true });
          }
          cb(null, brandsDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `marque-${uniqueSuffix}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(null, true);
        } else {
          cb(new Error("Only image files are allowed"), false);
        }
      },
    }),
  )
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload or replace optional marque (brand) logo" })
  uploadBrandMark(
    @Param("id") id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("marque image file is required");
    }
    const path = `/uploads/brands/${file.filename}`;
    return this.productService.setBrandMark(id, path);
  }

  @Delete(":id/brand-mark")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove optional marque (brand) logo" })
  deleteBrandMark(@Param("id") id: string) {
    return this.productService.clearBrandMark(id);
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
  @ApiOperation({ summary: "Admin: get product with sensitive fields" })
  findOneFull(@Param("id") id: string) {
    return this.productService.findOne(id);
  }

  @Get(":id")
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
