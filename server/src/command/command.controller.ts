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
import { CommandService } from './command.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { UpdateCommandDto } from './dto/update-command.dto';
import { CommandQueryDto } from './dto/command-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import * as Papa from 'papaparse';
import * as jsPDF from 'jspdf';
import { join } from 'path';
import * as fs from 'fs';

@ApiTags('commands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('commands')
export class CommandController {
  constructor(private readonly commandService: CommandService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new command' })
  @ApiResponse({ status: 201, description: 'Command created' })
  create(@Body() createCommandDto: CreateCommandDto) {
    return this.commandService.create(createCommandDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all commands with pagination and search' })
  @ApiResponse({ status: 200, description: 'List of commands' })
  findAll(@Query() query: CommandQueryDto) {
    return this.commandService.findAll(query);
  }

  @Get('export/csv')
  @ApiOperation({ summary: 'Export all commands as CSV' })
  async exportCsv(@Res() res: Response) {
    try {
      const commands = await this.commandService.getAllForExport();
      
      const csvData = commands.map((cmd) => ({
        ID: cmd.id,
        'Products Number': cmd.productsNumber,
        'Prix Vente': cmd.PrixVente || 0,
        'Prix Achat': cmd.PrixAchat || 0,
        Status: cmd.status,
        'Date Livraison': cmd.dateLivraison ? new Date(cmd.dateLivraison).toLocaleDateString('fr-FR') : '',
        'Adresse Livraison': cmd.adresseLivraison || '',
        'Date Création': new Date(cmd.createdAt).toLocaleDateString('fr-FR'),
      }));

      const csv = Papa.unparse(csvData, {
        header: true,
        delimiter: ',',
      });
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=commands.csv');
      res.send('\ufeff' + csv);
    } catch (error) {
      res.status(500).setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify({ message: 'Error exporting CSV', error: error.message }));
    }
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Export all commands as PDF' })
  async exportPdf(@Res() res: Response) {
    const commands = await this.commandService.getAllForExport();
    
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
    doc.text('Rapport des Commandes', 105, 35, { align: 'center' });
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    // Table header
    let y = 50;
    const startX = 14;
    const colWidths = [25, 30, 30, 30, 35, 40];
    const headers = ['ID', 'Produits', 'Prix Vente', 'Prix Achat', 'Statut', 'Adresse'];
    
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

    commands.forEach((cmd, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
        doc.rect(0, 0, 210, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('BÉBÉ-DÉPÔT', 110, 25, { align: 'center' });
        doc.setFontSize(14);
        doc.text('Rapport des Commandes', 105, 35, { align: 'center' });
        doc.setTextColor(0, 0, 0);
        
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
      const statusLabels: { [key: string]: string } = {
        NOT_DELIVERED: 'Non livré',
        DELIVERED: 'Livré',
        GOT_PROFIT: 'Profit',
      };
      const rowData = [
        cmd.id.substring(0, 8),
        String(cmd.productsNumber),
        `${cmd.PrixVente} TND`,
        `${cmd.PrixAchat} TND`,
        statusLabels[cmd.status] || cmd.status,
        cmd.adresseLivraison.length > 18 ? cmd.adresseLivraison.substring(0, 15) + '...' : cmd.adresseLivraison,
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

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Page ${i} / ${pageCount}`, 105, 290, { align: 'center' });
      doc.text('BÉBÉ-DÉPÔT - Back Office', 105, 293, { align: 'center' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=commands.pdf');
    res.send(Buffer.from(doc.output('arraybuffer')));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a command by ID' })
  @ApiParam({ name: 'id', description: 'Command ID' })
  @ApiResponse({ status: 200, description: 'Command found' })
  @ApiResponse({ status: 404, description: 'Command not found' })
  findOne(@Param('id') id: string) {
    return this.commandService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a command' })
  @ApiParam({ name: 'id', description: 'Command ID' })
  @ApiResponse({ status: 200, description: 'Command updated' })
  @ApiResponse({ status: 404, description: 'Command not found' })
  update(@Param('id') id: string, @Body() updateCommandDto: UpdateCommandDto) {
    return this.commandService.update(id, updateCommandDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a command' })
  @ApiParam({ name: 'id', description: 'Command ID' })
  @ApiResponse({ status: 200, description: 'Command deleted' })
  @ApiResponse({ status: 404, description: 'Command not found' })
  remove(@Param('id') id: string) {
    return this.commandService.remove(id);
  }
}
