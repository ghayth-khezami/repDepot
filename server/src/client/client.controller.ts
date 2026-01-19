import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Response } from "express";
import { ClientService } from "./client.service";
import { CreateClientDto } from "./dto/create-client.dto";
import { ClientQueryDto } from "./dto/client-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import * as Papa from "papaparse";
import * as jsPDF from "jspdf";
import { join } from "path";
import * as fs from "fs";

@ApiTags("clients")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("clients")
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Post()
  @ApiOperation({ summary: "Create a new client" })
  @ApiResponse({ status: 201, description: "Client created" })
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all clients with pagination and search" })
  @ApiResponse({ status: 200, description: "List of clients" })
  findAll(@Query() query: ClientQueryDto) {
    return this.clientService.findAll(query);
  }

  @Get("export/csv")
  @ApiOperation({ summary: "Export all clients as CSV" })
  async exportCsv(@Res() res: Response) {
    try {
      const result = await this.clientService.findAll({
        limit: 10000,
        page: 1,
      });
      const csvData = result.data.map((client) => ({
        ID: client.id,
        Prénom: client.firstName || "",
        Nom: client.lastName || "",
        Email: client.email || "",
        Téléphone: client.phoneNumber || "",
        Adresse: client.address || "",
        "Date Création": new Date(client.createdAt).toLocaleDateString("fr-FR"),
      }));

      const csv = Papa.unparse(csvData, {
        header: true,
        delimiter: ",",
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=clients.csv");
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
  @ApiOperation({ summary: "Export all clients as PDF" })
  async exportPdf(@Res() res: Response) {
    const result = await this.clientService.findAll({ limit: 10000, page: 1 });
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
    doc.text("Rapport des Clients", 105, 35, { align: "center" });

    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");

    // Table header
    let y = 50;
    const startX = 14;
    const colWidths = [40, 40, 50, 40, 40];
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Adresse"];

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

    result.data.forEach((client, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        doc.setFillColor(lavenderColor[0], lavenderColor[1], lavenderColor[2]);
        doc.rect(0, 0, 210, 15, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("BÉBÉ-DÉPÔT", 110, 25, { align: "center" });
        doc.setFontSize(14);
        doc.text("Rapport des Clients", 105, 35, { align: "center" });
        doc.setTextColor(0, 0, 0);

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
        client.firstName.length > 15
          ? client.firstName.substring(0, 12) + "..."
          : client.firstName,
        client.lastName.length > 15
          ? client.lastName.substring(0, 12) + "..."
          : client.lastName,
        client.email.length > 20
          ? client.email.substring(0, 17) + "..."
          : client.email,
        client.phoneNumber.length > 15
          ? client.phoneNumber.substring(0, 12) + "..."
          : client.phoneNumber,
        client.address.length > 20
          ? client.address.substring(0, 17) + "..."
          : client.address,
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
    res.setHeader("Content-Disposition", "attachment; filename=clients.pdf");
    res.send(Buffer.from(doc.output("arraybuffer")));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a client by ID" })
  @ApiParam({ name: "id", description: "Client ID" })
  @ApiResponse({ status: 200, description: "Client found" })
  @ApiResponse({ status: 404, description: "Client not found" })
  findOne(@Param("id") id: string) {
    return this.clientService.findOne(id);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a client" })
  @ApiParam({ name: "id", description: "Client ID" })
  @ApiResponse({ status: 200, description: "Client deleted" })
  @ApiResponse({ status: 404, description: "Client not found" })
  remove(@Param("id") id: string) {
    return this.clientService.remove(id);
  }
}
