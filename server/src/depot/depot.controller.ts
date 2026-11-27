import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Response } from "express";
import * as QRCode from "qrcode";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { buildProductQrPdf } from "../common/barcode-label.util";
import { DepotService } from "./depot.service";
import { AddDepotItemsDto, CreateDepotDto, DeposantSearchDto } from "./dto/create-depot.dto";

function sendPdf(res: Response, buffer: Buffer, filename: string, inline: boolean) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store");
  res.send(buffer);
}

@ApiTags("depots")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller()
export class DepotController {
  constructor(private readonly depotService: DepotService) {}

  @Get("deposants/search")
  @ApiOperation({ summary: "Search déposants by name or phone (stepper 'Déposant existant')" })
  search(@Query() query: DeposantSearchDto) {
    return this.depotService.searchDeposants(query.q);
  }

  @Get("deposants/by-phone/:phone")
  @ApiOperation({ summary: "Inline duplicate-phone check" })
  byPhone(@Param("phone") phone: string) {
    return this.depotService.findByPhone(phone);
  }

  @Get("depots/latest")
  @ApiOperation({ summary: "Latest contract (assistant greeting)" })
  latest() {
    return this.depotService.latestContract();
  }

  @Get("deposants/by-token/:token")
  @ApiOperation({ summary: "Déposant overview from a scanned contract QR token" })
  byToken(@Param("token") token: string) {
    return this.depotService.deposantByToken(token);
  }

  @Get("deposants/:id/report.pdf")
  @ApiOperation({ summary: "Fiche déposant PDF : infos, articles (infos manquantes), contrats, historique" })
  async deposantReport(@Param("id", ParseUUIDPipe) id: string, @Query("inline") inline: string | undefined, @Res() res: Response) {
    const { buffer, filename } = await this.depotService.deposantReportPdf(id);
    sendPdf(res, buffer, filename, inline === "1");
  }

  @Get("deposants/:id/overview")
  @ApiOperation({ summary: "Déposant overview: articles, statuses, contracts, amounts due" })
  overview(@Param("id", ParseUUIDPipe) id: string) {
    return this.depotService.deposantOverview(id);
  }

  @Post("depots")
  @ApiOperation({ summary: "Create déposant (or reuse) + contract + products in one transaction" })
  create(@Body() dto: CreateDepotDto) {
    return this.depotService.create(dto);
  }

  @Get("depots/:id")
  @ApiOperation({ summary: "Contract detail (preview data)" })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.depotService.getContract(id);
  }

  @Delete("depots/:id")
  @ApiOperation({ summary: "Supprimer un contrat et ses articles (refusé si un article est vendu / en commande)" })
  removeContract(@Param("id", ParseUUIDPipe) id: string) {
    return this.depotService.removeContract(id);
  }

  @Post("depots/:id/items")
  @ApiOperation({ summary: "Add articles to an existing contract" })
  addItems(@Param("id", ParseUUIDPipe) id: string, @Body() dto: AddDepotItemsDto) {
    return this.depotService.addItems(id, dto);
  }

  @Post("depots/:id/signed")
  @ApiOperation({ summary: "Mark contract as signed" })
  markSigned(@Param("id", ParseUUIDPipe) id: string) {
    return this.depotService.markSigned(id);
  }

  @Get("depots/:id/contract.pdf")
  @ApiOperation({ summary: "Contract PDF with the global tracking QR (409 if refs cannot be ensured)" })
  async contractPdf(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("inline") inline: string | undefined,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.depotService.contractPdf(id);
    sendPdf(res, buffer, filename, inline === "1");
  }

  @Get("depots/:id/qr.svg")
  @ApiOperation({ summary: "Global tracking QR as SVG (admin preview; same payload as the PDF)" })
  async qrSvg(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const { trackingUrl } = await this.depotService.getContract(id);
    const svg = await QRCode.toString(trackingUrl, { type: "svg", errorCorrectionLevel: "M", margin: 1 });
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(svg);
  }

  @Get("depots/:id/labels.pdf")
  @ApiOperation({ summary: "Per-article QR labels (product id QR + ref) for this contract" })
  async labelsPdf(@Param("id", ParseUUIDPipe) id: string, @Res() res: Response) {
    const products = await this.depotService.labelProducts(id);
    const buffer = await buildProductQrPdf(products);
    sendPdf(res, buffer, `etiquettes-${id.slice(0, 8)}.pdf`, false);
  }
}
