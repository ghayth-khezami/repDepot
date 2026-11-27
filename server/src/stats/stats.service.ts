import { addMonths, productSplit } from "../depot/depot.service";
import { WALK_IN_EMAIL } from "../command/command.service";

/** Shop position (Google Maps « Bébé dépôt by Mme Khezami »). Override with SHOP_LAT / SHOP_LNG. */
const SHOP_POSITION = {
  lat: Number(process.env.SHOP_LAT) || 36.8086383,
  lng: Number(process.env.SHOP_LNG) || 10.076949,
};
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface StatsQueryDto {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  period?: "month" | "year" | "all";
  year?: number;
  page?: number;
  limit?: number;
}

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getKPIs(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);
    const dateFilter = this.buildDateFilter(query);

    // 1. Total Products
    const totalProducts = await this.prisma.product.count({
      where: where.product,
    });

    // 2. Total Commands
    const totalCommands = await this.prisma.command.count({
      where: where.command,
    });

    // 3. Total Clients
    const totalClients = await this.prisma.client.count({
      where: where.client,
    });

    // 4. Total Co-Clients
    const totalCoClients = await this.prisma.coClient.count({
      where: where.coClient,
    });

    // 5–7. Revenue / cost / profit from delivered commands only
    const deliveredWhere = { ...where.command, status: "DELIVERED" as const };

    const revenueResult = await this.prisma.command.aggregate({
      where: deliveredWhere,
      _sum: { PrixVente: true },
    });
    const totalRevenue = revenueResult._sum.PrixVente || 0;

    const purchaseResult = await this.prisma.command.aggregate({
      where: deliveredWhere,
      _sum: { PrixAchat: true },
    });
    const totalPurchaseCost = purchaseResult._sum.PrixAchat || 0;
    const totalProfit = totalRevenue - totalPurchaseCost;

    const deliveredCommands = await this.prisma.command.count({
      where: deliveredWhere,
    });

    const avgOrderValue =
      deliveredCommands > 0 ? totalRevenue / deliveredCommands : 0;

    return {
      totalProducts,
      totalCommands,
      totalClients,
      totalCoClients,
      totalRevenue,
      totalPurchaseCost,
      totalProfit,
      deliveredCommands,
      avgOrderValue,
    };
  }

  async getProductsByCategory(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);
    const products = await this.prisma.product.groupBy({
      by: ["categoryId"],
      where: where.product,
      _count: {
        id: true,
      },
    });

    const categories = await this.prisma.category.findMany({
      where: where.category,
    });

    return products.map((item) => {
      const category = categories.find((c) => c.id === item.categoryId);
      return {
        categoryId: item.categoryId,
        categoryName: category?.categoryName || "Unknown",
        count: item._count.id,
      };
    });
  }

  async getCommandsByStatus(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);
    const commands = await this.prisma.command.groupBy({
      by: ["status"],
      where: where.command,
      _count: {
        id: true,
      },
    });

    return commands.map((item) => ({
      status: item.status,
      count: item._count.id,
    }));
  }

  async getMonthlyRevenue(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);
    const commands = await this.prisma.command.findMany({
      where: where.command,
      select: {
        PrixVente: true,
        createdAt: true,
      },
    });

    const monthlyData: { [key: string]: number } = {};
    commands.forEach((cmd) => {
      const date = new Date(cmd.createdAt);
      const month = date.getMonth() + 1;
      const monthKey = `${date.getFullYear()}-${month < 10 ? "0" : ""}${month}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + cmd.PrixVente;
    });

    return Object.entries(monthlyData)
      .map(([month, revenue]) => ({
        month,
        revenue,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getMonthlyProfit(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);
    const commands = await this.prisma.command.findMany({
      where: where.command,
      select: {
        PrixVente: true,
        PrixAchat: true,
        createdAt: true,
      },
    });

    const monthlyData: { [key: string]: { revenue: number; cost: number } } =
      {};
    commands.forEach((cmd) => {
      const date = new Date(cmd.createdAt);
      const month = date.getMonth() + 1;
      const monthKey = `${date.getFullYear()}-${month < 10 ? "0" : ""}${month}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { revenue: 0, cost: 0 };
      }
      monthlyData[monthKey].revenue += cmd.PrixVente;
      monthlyData[monthKey].cost += cmd.PrixAchat;
    });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        profit: data.revenue - data.cost,
        revenue: data.revenue,
        cost: data.cost,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async getTopProducts(query: StatsQueryDto, limit = 10) {
    const where = this.buildWhereClause(query);
    const commandDetails = await this.prisma.commandDetail.findMany({
      where: {
        command: { ...where.command, status: "DELIVERED" },
      },
      include: {
        product: {
          include: {
            category: true,
            photos: {
              take: 1,
              orderBy: {
                createdAt: "asc",
              },
            },
          },
        },
      },
    });

    const productData: {
      [key: string]: { product: any; count: number; totalValue: number };
    } = {};
    commandDetails.forEach((detail) => {
      const productId = detail.productId;
      if (!productData[productId]) {
        productData[productId] = {
          product: detail.product,
          count: 0,
          totalValue: 0,
        };
      }
      productData[productId].count += 1;
      productData[productId].totalValue += detail.product.PrixVente || 0;
    });

    return Object.values(productData)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        productId: item.product.id,
        productName: item.product.productName,
        categoryName: item.product.category?.categoryName || "N/A",
        count: item.count,
        totalValue: item.totalValue,
        PrixVente: item.product.PrixVente,
        photo: item.product.photos?.[0]?.photoDoc || null,
      }));
  }

  async getTotalSurcharge(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);

    // Get all products with their surcharge
    const products = await this.prisma.product.findMany({
      where: where.product,
      select: {
        surcharge: true,
      },
    });

    const totalSurcharge = products.reduce((sum, product) => {
      return sum + (product.surcharge || 0);
    }, 0);

    return {
      totalSurcharge,
    };
  }

  private buildWhereClause(query: StatsQueryDto) {
    const productWhere: any = {};
    const commandWhere: any = {};
    const clientWhere: any = {};
    const coClientWhere: any = {};
    const categoryWhere: any = {};

    if (query.categoryId) {
      productWhere.categoryId = query.categoryId;
      commandWhere.commandDetails = { some: { product: { categoryId: query.categoryId } } };
    }

    const dateFilter = this.buildDateFilter(query);
    if (dateFilter) {
      commandWhere.createdAt = dateFilter;
      // Products and clients created in the period
      productWhere.createdAt = dateFilter;
      clientWhere.createdAt = dateFilter;
      coClientWhere.createdAt = dateFilter;
    }

    return {
      product: productWhere,
      command: commandWhere,
      client: clientWhere,
      coClient: coClientWhere,
      category: categoryWhere,
    };
  }

  /**
   * Revenue of the period, from the articles SOLD in it (soldAt) — orders, in-shop sales and dépôt
   * articles marked « Vendu » all count.
   *  - commission: the shop's share of dépôt sales
   *  - achatSales: sale price of the shop's own (non-dépôt) articles
   *  - depotRevenue ("Revenu de Dépôt") = commission + achatSales
   *  - buyingRevenue = margin on own articles (sale − purchase); totalRevenue = commission + margin
   */
  async getRevenueBreakdown(query: StatsQueryDto) {
    const date = this.buildDateFilter(query);
    const sold = await this.prisma.product.findMany({
      where: {
        status: "VENDU",
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        ...(date ? { soldAt: date } : {}),
      },
      select: { isDepot: true, PrixVente: true, PrixAchat: true, depotPercentage: true, shopAmountMillimes: true, depositorAmountMillimes: true },
    });

    let commission = 0;
    let achatSales = 0;
    let buyingRevenue = 0;
    for (const p of sold) {
      if (p.isDepot) {
        commission += productSplit(p).shopMillimes / 1000;
      } else {
        achatSales += p.PrixVente || 0;
        buyingRevenue += (p.PrixVente || 0) - (p.PrixAchat || 0);
      }
    }
    const round = (n: number) => Math.round(n * 1000) / 1000;
    return {
      totalRevenue: round(commission + buyingRevenue),
      buyingRevenue: round(buyingRevenue),
      depotRevenue: round(commission + achatSales),
      commission: round(commission),
      achatSales: round(achatSales),
    };
  }

  async getLastDeliveredCommand(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);
    const command = await this.prisma.command.findFirst({
      where: { ...where.command, status: "DELIVERED" },
      orderBy: [{ dateLivraison: "desc" }, { updatedAt: "desc" }],
      include: {
        commandDetails: {
          include: {
            product: {
              include: {
                photos: { take: 1, orderBy: { createdAt: "asc" } },
              },
            },
            client: {
              select: { firstName: true, lastName: true, phoneNumber: true },
            },
          },
        },
      },
    });
    if (!command) return null;
    return {
      id: command.id,
      adresseLivraison: command.adresseLivraison,
      PrixVente: command.PrixVente,
      productsNumber: command.productsNumber,
      dateLivraison: command.dateLivraison,
      createdAt: command.createdAt,
      client: command.commandDetails[0]?.client
        ? `${command.commandDetails[0].client.firstName} ${command.commandDetails[0].client.lastName}`
        : null,
      products: command.commandDetails.map((d) => ({
        id: d.product.id,
        productName: d.product.productName,
        photo: d.product.photos?.[0]?.photoDoc ?? null,
        PrixVente: d.product.PrixVente,
      })),
    };
  }

  async getSoldProducts(query: StatsQueryDto, limit = 20) {
    const where = this.buildWhereClause(query);
    const commandDetails = await this.prisma.commandDetail.findMany({
      where: {
        command: { ...where.command, status: "DELIVERED" },
      },
      include: {
        product: {
          include: {
            photos: { take: 1, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });

    const productData: {
      [key: string]: { product: any; count: number };
    } = {};

    commandDetails.forEach((detail) => {
      const productId = detail.productId;
      if (!productData[productId]) {
        productData[productId] = { product: detail.product, count: 0 };
      }
      productData[productId].count += 1;
    });

    const products = Object.values(productData)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map((item) => ({
        productId: item.product.id,
        productName: item.product.productName,
        count: item.count,
        PrixVente: item.product.PrixVente,
        photo: item.product.photos?.[0]?.photoDoc ?? null,
      }));

    const totalSold = commandDetails.length;

    return { totalSold, products };
  }

  /**
   * Articles sold per month of a calendar year (`year`, default: current year).
   * Counts products by `soldAt` so both delivered orders and dépôt articles marked « Vendu »
   * in the backoffice are included (orders alone missed every in-shop dépôt sale).
   */
  async getMonthlySoldProducts(query: StatsQueryDto) {
    const currentYear = query.year ?? new Date().getFullYear();
    const sold = await this.prisma.product.findMany({
      where: {
        status: "VENDU",
        ...(query.categoryId ? { categoryId: query.categoryId } : {}),
        soldAt: { gte: new Date(currentYear, 0, 1), lt: new Date(currentYear + 1, 0, 1) },
      },
      select: { soldAt: true },
    });

    const counts = Array.from({ length: 12 }, () => 0);
    for (const p of sold) if (p.soldAt) counts[p.soldAt.getMonth()] += 1;
    return counts.map((count, i) => ({ month: `${currentYear}-${String(i + 1).padStart(2, "0")}`, count }));
  }

  async getDepotVsBuyingProducts(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);

    const depotCount = await this.prisma.product.count({
      where: {
        ...where.product,
        isDepot: true,
      },
    });

    const buyingCount = await this.prisma.product.count({
      where: {
        ...where.product,
        isDepot: false,
      },
    });

    return {
      depot: depotCount,
      buying: buyingCount,
      total: depotCount + buyingCount,
    };
  }

  /**
   * Order map points, one page at a time (`page`, `limit` ≤ 100) so the dashboard can load a big history
   * progressively. `pending` = not delivered yet (pulses on the map); `surPlace` = in-shop sale.
   */
  async getCommandLocations(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);
    const limit = Math.min(query.limit ?? 50, 100);
    const page = query.page ?? 1;
    const filter = { ...where.command, adresseLivraison: { not: "" } };
    const [total, commands] = await Promise.all([
      this.prisma.command.count({ where: filter }),
      this.prisma.command.findMany({
        where: filter,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          adresseLivraison: true,
          createdAt: true,
          PrixVente: true,
          status: true,
          commandDetails: {
            take: 1,
            select: {
              client: { select: { firstName: true, lastName: true, email: true } },
              coClient: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);
    const data = commands.map((cmd) => {
      const d = cmd.commandDetails[0];
      const surPlace = d?.client?.email === WALK_IN_EMAIL;
      return {
        id: cmd.id,
        address: surPlace ? cmd.adresseLivraison.replace(/^Achat sur place — /, "") : cmd.adresseLivraison,
        revenue: cmd.PrixVente,
        date: cmd.createdAt,
        status: cmd.status,
        pending: cmd.status === "NOT_DELIVERED" || cmd.status === "ACCEPTED",
        surPlace,
        // In-shop sale: exactly on the shop's Google Maps pin.
        ...(surPlace ? SHOP_POSITION : {}),
        client: surPlace
          ? "Achat sur place"
          : d?.client
            ? `${d.client.firstName} ${d.client.lastName}`
            : d?.coClient
              ? `${d.coClient.firstName} ${d.coClient.lastName}`
              : "N/A",
      };
    });
    return { data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  /** Dépôt-vente KPIs for the dashboard (period = contract / sale dates). */
  async getDepotKpis(query: StatsQueryDto) {
    const date = this.buildDateFilter(query);
    const cat = query.categoryId ? { categoryId: query.categoryId } : {};
    const [onSale, soldInPeriod, toPay, contracts, newDeposants, depotItemsInPeriod] = await Promise.all([
      this.prisma.product.aggregate({ where: { isDepot: true, status: "EN_VENTE", ...cat }, _count: { id: true }, _sum: { PrixVente: true } }),
      this.prisma.product.findMany({
        where: { isDepot: true, status: "VENDU", ...cat, ...(date ? { soldAt: date } : {}) },
        select: { shopAmountMillimes: true, PrixVente: true, depotPercentage: true },
      }),
      this.prisma.product.aggregate({
        where: { isDepot: true, status: "VENDU", payoutStatus: { not: "PAYE" }, ...cat },
        _count: { id: true },
        _sum: { depositorAmountMillimes: true },
      }),
      this.prisma.depositRequest.count({ where: { contractNumber: { not: null }, ...(date ? { createdAt: date } : {}) } }),
      this.prisma.coClient.count({ where: date ? { createdAt: date } : {} }),
      this.prisma.product.count({ where: { isDepot: true, ...cat, ...(date ? { createdAt: date } : {}) } }),
    ]);
    const commissionMillimes = soldInPeriod.reduce(
      (t, p) => t + (p.shopAmountMillimes ?? Math.round(((p.PrixVente || 0) * (p.depotPercentage || 0)) / 100 * 1000)),
      0,
    );
    const sold = soldInPeriod.length;
    return {
      onSaleCount: onSale._count.id,
      onSaleValue: onSale._sum.PrixVente ?? 0,
      toPayCount: toPay._count.id,
      toPayAmount: (toPay._sum.depositorAmountMillimes ?? 0) / 1000,
      soldCount: sold,
      commissionAmount: commissionMillimes / 1000,
      sellThroughRate: sold + onSale._count.id > 0 ? (sold / (sold + onSale._count.id)) * 100 : 0,
      depositedInPeriod: depotItemsInPeriod,
      contracts,
      newDeposants,
    };
  }

  /** Map of completed dépôts: one marker per contract, at the déposant's address. */
  /**
   * Dépôt map points, paginated like getCommandLocations. Alerts per contract:
   *  - `ending`: contract ends within 14 days (or is over) and still has articles on sale → red
   *  - `unpaid`: has articles sold but the déposant not paid yet → yellow
   */
  async getDepotLocations(query: StatsQueryDto) {
    const date = this.buildDateFilter(query);
    const limit = Math.min(query.limit ?? 50, 100);
    const page = query.page ?? 1;
    const where = {
      contractNumber: { not: null },
      coClient: { OR: [{ lat: { not: null } }, { address: { not: "" } }] },
      ...(date ? { createdAt: date } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.depositRequest.count({ where }),
      this.prisma.depositRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          contractNumber: true,
          createdAt: true,
          durationMonths: true,
          proposedPrice: true,
          coClient: { select: { id: true, firstName: true, lastName: true, address: true, lat: true, lng: true, number: true, gender: true } },
          products: { select: { status: true, payoutStatus: true, PrixVente: true } },
        },
      }),
    ]);
    const soon = Date.now() + 14 * 86_400_000;
    const data = rows
      .filter((r) => r.coClient)
      .map((r) => {
        const expiresAt = addMonths(r.createdAt, r.durationMonths ?? 3);
        const onSale = r.products.filter((p) => p.status === "EN_VENTE").length;
        const unpaid = r.products.some((p) => p.status === "VENDU" && p.payoutStatus !== "PAYE");
        return {
          id: r.id,
          contractNumber: r.contractNumber,
          date: r.createdAt,
          expiresAt,
          value: r.products.reduce((t, p) => t + p.PrixVente, 0) || r.proposedPrice,
          items: r.products.length,
          deposantId: r.coClient!.id,
          deposant: `${r.coClient!.firstName} ${r.coClient!.lastName}`,
          number: r.coClient!.number,
          gender: r.coClient!.gender,
          address: r.coClient!.address ?? "",
          lat: r.coClient!.lat,
          lng: r.coClient!.lng,
          ending: onSale > 0 && expiresAt.getTime() <= soon,
          unpaid,
        };
      });
    return { data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  private buildDateFilter(query: StatsQueryDto) {
    if (!query.period && !query.startDate) {
      return undefined;
    }

    if (query.startDate && query.endDate) {
      return {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const now = new Date();
    if (query.period === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        gte: startOfMonth,
        lte: now,
      };
    }

    if (query.period === "year") {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return {
        gte: startOfYear,
        lte: now,
      };
    }

    return undefined;
  }
}
