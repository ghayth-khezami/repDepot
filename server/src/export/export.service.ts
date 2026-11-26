import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as ExcelJS from "exceljs";
import { PrismaService } from "../prisma/prisma.service";
import { StatsService } from "../stats/stats.service";

export interface ExportQuery {
  search?: string;
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  status?: string;
  isDepot?: string;
  year?: string;
}

type Col = { header: string; key: string; width?: number; money?: boolean; date?: boolean };

const BRAND_PINK = "FFEC4899";
const BRAND_VIOLET = "FF7C3AED";

export const EXPORT_ENTITIES = [
  "dashboard",
  "products",
  "clients",
  "co-clients",
  "commands",
  "deposit-requests",
  "users",
  "newsletter",
  "feedbacks",
] as const;
export type ExportEntity = (typeof EXPORT_ENTITIES)[number];

@Injectable()
export class ExportService {
  constructor(
    private prisma: PrismaService,
    private stats: StatsService,
  ) {}

  async build(entity: string, q: ExportQuery): Promise<{ buffer: Buffer; filename: string }> {
    if (!EXPORT_ENTITIES.includes(entity as ExportEntity)) {
      throw new BadRequestException(`Export inconnu : ${entity}`);
    }
    const wb = new ExcelJS.Workbook();
    wb.creator = "Bébé-Dépôt Back Office";
    wb.created = new Date();

    switch (entity as ExportEntity) {
      case "dashboard":
        await this.dashboard(wb, q);
        break;
      case "products":
        await this.products(wb, q);
        break;
      case "clients":
        await this.clients(wb, q);
        break;
      case "co-clients":
        await this.coClients(wb, q);
        break;
      case "commands":
        await this.commands(wb, q);
        break;
      case "deposit-requests":
        await this.depositRequests(wb, q);
        break;
      case "users":
        await this.users(wb, q);
        break;
      case "newsletter":
        await this.newsletter(wb, q);
        break;
      case "feedbacks":
        await this.feedbacks(wb, q);
        break;
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return { buffer, filename: `${entity}-${stamp}.xlsx` };
  }

  /* ───────────────────────────── helpers ───────────────────────────── */

  private dateRange(q: ExportQuery): Prisma.DateTimeFilter | undefined {
    if (!q.startDate && !q.endDate) return undefined;
    const f: Prisma.DateTimeFilter = {};
    if (q.startDate) f.gte = new Date(q.startDate);
    if (q.endDate) f.lte = new Date(q.endDate);
    return f;
  }

  private ci(search?: string) {
    const s = search?.trim();
    return s ? { contains: s, mode: "insensitive" as const } : undefined;
  }

  private sheet(wb: ExcelJS.Workbook, name: string, cols: Col[], rows: Record<string, unknown>[], color = BRAND_PINK) {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(14, c.header.length + 4) }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    head.alignment = { vertical: "middle" };
    head.height = 22;
    rows.forEach((r) => ws.addRow(r));
    cols.forEach((c) => {
      const col = ws.getColumn(c.key);
      if (c.money) col.numFmt = '#,##0.000 "TND"';
      if (c.date) col.numFmt = "dd/mm/yyyy hh:mm";
    });
    if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
    return ws;
  }

  /* ───────────────────────────── entities ───────────────────────────── */

  private async dashboard(wb: ExcelJS.Workbook, q: ExportQuery) {
    const sq = { startDate: q.startDate, endDate: q.endDate, categoryId: q.categoryId, year: q.year ? Number(q.year) : undefined };
    const [kpis, revenue, surcharge, dvb, monthly, top, byCat, byStatus] = await Promise.all([
      this.stats.getKPIs(sq),
      this.stats.getRevenueBreakdown(sq),
      this.stats.getTotalSurcharge(sq),
      this.stats.getDepotVsBuyingProducts(sq),
      this.stats.getMonthlySoldProducts(sq),
      this.stats.getTopProducts(sq, 20),
      this.stats.getProductsByCategory(sq),
      this.stats.getCommandsByStatus(sq),
    ]);

    const period =
      q.startDate || q.endDate
        ? `${q.startDate ? new Date(q.startDate).toLocaleDateString("fr-FR") : "…"} → ${q.endDate ? new Date(q.endDate).toLocaleDateString("fr-FR") : "…"}`
        : "Toute la période";
    const cat = q.categoryId ? (await this.prisma.category.findUnique({ where: { id: q.categoryId } }))?.categoryName : null;

    const ws = this.sheet(
      wb,
      "Résumé",
      [
        { header: "Indicateur", key: "k", width: 34 },
        { header: "Valeur", key: "v", width: 22 },
      ],
      [
        { k: "Période", v: period },
        { k: "Catégorie", v: cat ?? "Toutes" },
        { k: "Revenu total (TND)", v: revenue.totalRevenue },
        { k: "Revenu d'achat (TND)", v: revenue.buyingRevenue },
        { k: "Revenu de dépôt (TND)", v: revenue.depotRevenue },
        { k: "Surcharge totale (TND)", v: surcharge.totalSurcharge },
        { k: "Chiffre d'affaires livré (TND)", v: kpis.totalRevenue },
        { k: "Coût d'achat (TND)", v: kpis.totalPurchaseCost },
        { k: "Bénéfice (TND)", v: kpis.totalProfit },
        { k: "Panier moyen (TND)", v: kpis.avgOrderValue },
        { k: "Produits", v: kpis.totalProducts },
        { k: "Produits en dépôt", v: dvb.depot },
        { k: "Produits achetés", v: dvb.buying },
        { k: "Commandes", v: kpis.totalCommands },
        { k: "Commandes livrées", v: kpis.deliveredCommands },
        { k: "Clients", v: kpis.totalClients },
        { k: "Déposants", v: kpis.totalCoClients },
      ],
    );
    ws.getColumn("v").numFmt = "#,##0.###";

    this.sheet(
      wb,
      "Ventes par mois",
      [
        { header: "Mois", key: "month", width: 14 },
        { header: "Produits vendus", key: "count", width: 18 },
      ],
      monthly,
      BRAND_VIOLET,
    );
    this.sheet(
      wb,
      "Top produits",
      [
        { header: "#", key: "rank", width: 6 },
        { header: "Produit", key: "productName", width: 40 },
        { header: "Catégorie", key: "categoryName", width: 22 },
        { header: "Ventes", key: "count", width: 10 },
        { header: "Valeur (TND)", key: "totalValue", money: true, width: 18 },
      ],
      (top as any[]).map((t, i) => ({ ...t, rank: t.rank ?? i + 1 })),
    );
    this.sheet(
      wb,
      "Par catégorie",
      [
        { header: "Catégorie", key: "categoryName", width: 30 },
        { header: "Produits", key: "count", width: 12 },
      ],
      byCat,
      BRAND_VIOLET,
    );
    this.sheet(
      wb,
      "Commandes par statut",
      [
        { header: "Statut", key: "status", width: 20 },
        { header: "Nombre", key: "count", width: 12 },
      ],
      byStatus,
    );
    await this.commands(wb, q, "Commandes de la période");
  }

  private async products(wb: ExcelJS.Workbook, q: ExportQuery) {
    const s = this.ci(q.search);
    const where: Prisma.ProductWhereInput = {
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.status ? { status: q.status as any } : {}),
      ...(q.isDepot === "true" ? { isDepot: true } : q.isDepot === "false" ? { isDepot: false } : {}),
      ...(this.dateRange(q) ? { createdAt: this.dateRange(q) } : {}),
      ...(s ? { OR: [{ productName: s }, { ref: s }, { barcode: s }] } : {}),
    };
    const rows = await this.prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { category: { select: { categoryName: true } }, coClient: { select: { firstName: true, lastName: true, number: true } } },
    });
    this.sheet(
      wb,
      "Produits",
      [
        { header: "Réf", key: "ref", width: 12 },
        { header: "Code-barres", key: "barcode", width: 16 },
        { header: "Produit", key: "productName", width: 38 },
        { header: "Catégorie", key: "category", width: 22 },
        { header: "Type", key: "type", width: 10 },
        { header: "Statut", key: "status", width: 12 },
        { header: "Prix de vente", key: "PrixVente", money: true },
        { header: "Prix d'achat", key: "PrixAchat", money: true },
        { header: "Commission %", key: "depotPercentage" },
        { header: "Marge boutique", key: "shop", money: true },
        { header: "Part déposant", key: "depositor", money: true },
        { header: "Déposant", key: "deposant", width: 26 },
        { header: "Disponible", key: "dispo" },
        { header: "Créé le", key: "createdAt", date: true, width: 18 },
        { header: "Vendu le", key: "soldAt", date: true, width: 18 },
      ],
      rows.map((p) => ({
        ...p,
        category: p.category?.categoryName,
        type: p.isDepot ? "Dépôt" : "Achat",
        shop: p.shopAmountMillimes != null ? p.shopAmountMillimes / 1000 : null,
        depositor: p.depositorAmountMillimes != null ? p.depositorAmountMillimes / 1000 : null,
        deposant: p.coClient ? `N°${p.coClient.number} · ${p.coClient.firstName} ${p.coClient.lastName}` : "",
        dispo: p.isDispo ? "Oui" : "Non",
      })),
    );
  }

  private async clients(wb: ExcelJS.Workbook, q: ExportQuery) {
    const s = this.ci(q.search);
    const rows = await this.prisma.client.findMany({
      where: {
        ...(this.dateRange(q) ? { createdAt: this.dateRange(q) } : {}),
        ...(s ? { OR: [{ firstName: s }, { lastName: s }, { email: s }, { phoneNumber: s }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { commandDetails: true } } },
    });
    this.sheet(
      wb,
      "Clients",
      [
        { header: "Prénom", key: "firstName" },
        { header: "Nom", key: "lastName" },
        { header: "Email", key: "email", width: 30 },
        { header: "Téléphone", key: "phoneNumber" },
        { header: "Adresse", key: "address", width: 36 },
        { header: "Articles commandés", key: "orders" },
        { header: "Créé le", key: "createdAt", date: true, width: 18 },
      ],
      rows.map((c) => ({ ...c, orders: c._count.commandDetails })),
    );
  }

  private async coClients(wb: ExcelJS.Workbook, q: ExportQuery) {
    const s = this.ci(q.search);
    const rows = await this.prisma.coClient.findMany({
      where: {
        ...(this.dateRange(q) ? { createdAt: this.dateRange(q) } : {}),
        ...(s ? { OR: [{ firstName: s }, { lastName: s }, { email: s }, { phoneNumber: s }] } : {}),
      },
      orderBy: { number: "desc" },
      include: { products: { select: { status: true, PrixVente: true, depositorAmountMillimes: true, payoutStatus: true } } },
    });
    this.sheet(
      wb,
      "Déposants",
      [
        { header: "N°", key: "number", width: 8 },
        { header: "Prénom", key: "firstName" },
        { header: "Nom", key: "lastName" },
        { header: "Téléphone", key: "phoneNumber" },
        { header: "Email", key: "email", width: 28 },
        { header: "Adresse", key: "address", width: 32 },
        { header: "RIB", key: "RIB", width: 26 },
        { header: "Articles", key: "total" },
        { header: "En vente", key: "onSale" },
        { header: "Vendus", key: "sold" },
        { header: "À payer (TND)", key: "toPay", money: true },
        { header: "Créé le", key: "createdAt", date: true, width: 18 },
      ],
      rows.map((c) => ({
        ...c,
        total: c.products.length,
        onSale: c.products.filter((p) => p.status === "EN_VENTE").length,
        sold: c.products.filter((p) => p.status === "VENDU").length,
        toPay:
          c.products
            .filter((p) => p.status === "VENDU" && p.payoutStatus !== "PAYE")
            .reduce((t, p) => t + (p.depositorAmountMillimes ?? 0), 0) / 1000,
      })),
    );
  }

  private async commands(wb: ExcelJS.Workbook, q: ExportQuery, name = "Commandes") {
    const rows = await this.prisma.command.findMany({
      where: {
        ...(this.dateRange(q) ? { createdAt: this.dateRange(q) } : {}),
        ...(q.status ? { status: q.status as any } : {}),
        ...(q.categoryId ? { commandDetails: { some: { product: { categoryId: q.categoryId } } } } : {}),
        ...(q.search?.trim() ? { adresseLivraison: this.ci(q.search) } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        commandDetails: {
          include: {
            product: { select: { productName: true, ref: true } },
            client: { select: { firstName: true, lastName: true, phoneNumber: true } },
            coClient: { select: { firstName: true, lastName: true, phoneNumber: true } },
          },
        },
      },
    });
    this.sheet(
      wb,
      name,
      [
        { header: "Date", key: "createdAt", date: true, width: 18 },
        { header: "Client", key: "client", width: 24 },
        { header: "Téléphone", key: "phone" },
        { header: "Produits", key: "products", width: 44 },
        { header: "Qté", key: "productsNumber", width: 7 },
        { header: "Prix de vente", key: "PrixVente", money: true },
        { header: "Prix d'achat", key: "PrixAchat", money: true },
        { header: "Bénéfice", key: "profit", money: true },
        { header: "Statut", key: "status", width: 16 },
        { header: "Livraison", key: "dateLivraison", date: true, width: 18 },
        { header: "Adresse", key: "adresseLivraison", width: 36 },
      ],
      rows.map((c) => {
        const who = c.commandDetails[0]?.client ?? c.commandDetails[0]?.coClient;
        return {
          ...c,
          client: who ? `${who.firstName} ${who.lastName}` : "",
          phone: who?.phoneNumber ?? "",
          products: c.commandDetails.map((d) => `${d.product?.ref ?? ""} ${d.product?.productName ?? ""}`.trim()).join(", "),
          profit: (c.PrixVente ?? 0) - (c.PrixAchat ?? 0),
        };
      }),
      BRAND_VIOLET,
    );
  }

  private async depositRequests(wb: ExcelJS.Workbook, q: ExportQuery) {
    const s = this.ci(q.search);
    const rows = await this.prisma.depositRequest.findMany({
      where: {
        ...(this.dateRange(q) ? { createdAt: this.dateRange(q) } : {}),
        ...(q.status ? { status: q.status as any } : {}),
        ...(s ? { OR: [{ fullName: s }, { phoneNumber: s }, { contractNumber: s }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { items: true, _count: { select: { products: true } } },
    });
    this.sheet(
      wb,
      "Demandes de dépôt",
      [
        { header: "Contrat", key: "contractNumber", width: 16 },
        { header: "Nom", key: "fullName", width: 26 },
        { header: "Téléphone", key: "phoneNumber" },
        { header: "Statut", key: "status" },
        { header: "Prix proposé", key: "proposedPrice", money: true },
        { header: "Articles", key: "count" },
        { header: "Détail articles", key: "items", width: 50 },
        { header: "Durée (mois)", key: "durationMonths" },
        { header: "Message", key: "message", width: 36 },
        { header: "Créée le", key: "createdAt", date: true, width: 18 },
      ],
      rows.map((r) => ({
        ...r,
        count: r.items.length || r._count.products,
        items: r.items.map((i) => `${i.productName} (${i.proposedPrice} TND)`).join(", "),
      })),
    );
  }

  private async users(wb: ExcelJS.Workbook, q: ExportQuery) {
    const s = this.ci(q.search);
    const rows = await this.prisma.user.findMany({
      where: {
        ...(q.status ? { role: q.status as any } : {}),
        ...(s ? { OR: [{ email: s }, { username: s }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { email: true, username: true, role: true, isVerified: true, createdAt: true },
    });
    this.sheet(
      wb,
      "Utilisateurs",
      [
        { header: "Email", key: "email", width: 32 },
        { header: "Nom d'utilisateur", key: "username", width: 22 },
        { header: "Rôle", key: "role" },
        { header: "Vérifié", key: "verified" },
        { header: "Créé le", key: "createdAt", date: true, width: 18 },
      ],
      rows.map((u) => ({ ...u, verified: u.isVerified ? "Oui" : "Non" })),
    );
  }

  private async newsletter(wb: ExcelJS.Workbook, q: ExportQuery) {
    const rows = await this.prisma.newsletterSubscriber.findMany({
      where: { ...(q.search?.trim() ? { email: this.ci(q.search) } : {}), ...(this.dateRange(q) ? { createdAt: this.dateRange(q) } : {}) },
      orderBy: { createdAt: "desc" },
    });
    this.sheet(
      wb,
      "Newsletter",
      [
        { header: "Email", key: "email", width: 36 },
        { header: "Inscrit le", key: "createdAt", date: true, width: 18 },
      ],
      rows,
    );
  }

  private async feedbacks(wb: ExcelJS.Workbook, q: ExportQuery) {
    const rows = await this.prisma.clientFeedback.findMany({
      where: q.search?.trim() ? { OR: [{ clientName: this.ci(q.search) }, { description: this.ci(q.search) }] } : {},
      orderBy: { sortOrder: "asc" },
    });
    this.sheet(
      wb,
      "Avis clients",
      [
        { header: "Client", key: "clientName", width: 24 },
        { header: "Note", key: "rating", width: 8 },
        { header: "Avis", key: "description", width: 60 },
        { header: "Publié", key: "published" },
        { header: "Créé le", key: "createdAt", date: true, width: 18 },
      ],
      rows.map((f) => ({ ...f, published: f.isPublished ? "Oui" : "Non" })),
    );
  }
}
