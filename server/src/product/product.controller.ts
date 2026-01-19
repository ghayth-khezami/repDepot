import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as Papa from 'papaparse';
import * as jsPDF from 'jspdf';
import { join } from 'path';
import * as fs from 'fs';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products with pagination, search and filters' })
  @ApiResponse({ status: 200, description: 'List of products' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productService.findAll(query);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export all products as CSV' })
  async exportCsv(@Res() res: Response) {
    try {
      const result = await this.productService.findAll({ limit: 10000, page: 1 });
      const csvData = result.data.map((product) => ({
        ID: product.id,
        'Nom Produit': product.productName || '',
        Description: product.description || '',
        'Prix Vente': product.PrixVente || 0,
        'Prix Achat': product.PrixAchat || 0,
        'Quantité Stock': product.stockQuantity || 0,
        'En Dépôt': product.isDepot ? 'Oui' : 'Non',
        'Pourcentage Dépôt': product.depotPercentage || '',
        'Surcharge': product.surcharge || 0,
        'Gain': product.gain || 0,
        'Statut': product.isDispo ? 'Disponible' : 'Rupture',
        Catégorie: product.category?.categoryName || '',
        'Co-Client': product.coClient ? `${product.coClient.firstName} ${product.coClient.lastName}` : '',
        'Date Création': new Date(product.createdAt).toLocaleDateString('fr-FR'),
      }));

      const csv = Papa.unparse(csvData, {
        header: true,
        delimiter: ',',
      });
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
      res.send('\ufeff' + csv);
    } catch (error) {
      res.status(500).setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ message: 'Error exporting CSV', error: error.message }));
    }
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export all products as PDF' })
  async exportPdf(@Res() res: Response) {
    const result = await this.productService.findAll({ limit: 10000, page: 1 });
    const doc = new jsPDF.jsPDF();
    
    // Brand colors (lavender, peach, yellow)
    const lavenderColor: [number, number, number] = [128, 90, 213]; // #805ad5
    const peachColor: [number, number, number] = [254, 215, 215]; // #fed7d7
    
    // Header with logo
    try {
      const logoPath = join(process.cwd(), 'depot.jpg');
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = logoData.toString('base64');
        doc.addImage(logoBase64, 'JPEG', 14, 10, 30, 30);
      }
    } catch (error) {
      // If logo not found, continue without it
    }

    // Header background with brand colors
    doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
    doc.rect(0, 0, 210, 15, 'F');
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('BÉBÉ-DÉPÔT', 110, 25, { align: 'center' });
    
    doc.setFontSize(14);
    doc.text('Rapport des Produits', 105, 35, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Table header
    let y = 50;
    const startX = 14;
    const colWidths = [60, 30, 30, 25, 30, 25];
    const headers = ['Produit', 'Prix Vente', 'Prix Achat', 'Stock', 'Catégorie', 'Dépôt'];
    
    // Header row background
    doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
    doc.rect(startX, y - 8, 182, 8, 'F');
    
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
    doc.setFont('helvetica', 'bold');
    let x = startX + 2;
    headers.forEach((header, i) => {
      doc.text(header, x, y - 2);
      x += colWidths[i];
    });
    
    y += 2;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    result.data.forEach((product, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        // Add header to new page
        doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('BÉBÉ-DÉPÔT', 110, 25, { align: 'center' });
        doc.setFontSize(14);
        doc.text('Rapport des Produits', 105, 35, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        
        // Table header on new page
        y = 50;
        doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
        doc.rect(startX, y - 8, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        x = startX + 2;
        headers.forEach((header, i) => {
          doc.text(header, x, y - 2);
          x += colWidths[i];
        });
        y += 2;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(peachColor[0], peachColor[1], peachColor[2]);
        doc.rect(startX, y - 6, 182, 6, 'F');
      }

      // Table data
      x = startX + 2;
      const rowData = [
        product.productName.length > 25 ? product.productName.substring(0, 22) + '...' : product.productName,
        `${product.PrixVente} TND`,
        `${product.PrixAchat} TND`,
        String(product.stockQuantity),
        product.category?.categoryName?.substring(0, 12) || 'N/A',
        product.isDepot ? 'Oui' : 'Non',
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
      doc.text(`Page ${i} / ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('BÉBÉ-DÉPÔT - Back Office', 105, 293, { align: 'center' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=products.pdf');
    res.send(Buffer.from(doc.output('arraybuffer')));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
