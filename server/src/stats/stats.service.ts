import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface StatsQueryDto {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  period?: "month" | "year" | "all";
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

    // 5. Total Revenue (sum of PrixVente from commands)
    const revenueResult = await this.prisma.command.aggregate({
      where: where.command,
      _sum: {
        PrixVente: true,
      },
    });
    const totalRevenue = revenueResult._sum.PrixVente || 0;

    // 6. Total Purchase Cost (sum of PrixAchat from commands)
    const purchaseResult = await this.prisma.command.aggregate({
      where: where.command,
      _sum: {
        PrixAchat: true,
      },
    });
    const totalPurchaseCost = purchaseResult._sum.PrixAchat || 0;

    // 7. Total Profit (Revenue - Purchase costs)
    const totalProfit = totalRevenue - totalPurchaseCost;

    // 8. Delivered Commands Count
    const deliveredCommands = await this.prisma.command.count({
      where: {
        ...where.command,
        status: "DELIVERED",
      },
    });

    // 9. Profit Commands Count
    const profitCommands = await this.prisma.command.count({
      where: {
        ...where.command,
        status: "GOT_PROFIT",
      },
    });

    // 10. Average Order Value
    const avgOrderValue = totalCommands > 0 ? totalRevenue / totalCommands : 0;

    return {
      totalProducts,
      totalCommands,
      totalClients,
      totalCoClients,
      totalRevenue,
      totalPurchaseCost,
      totalProfit,
      deliveredCommands,
      profitCommands,
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
        command: where.command,
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
      .sort((a, b) => b.totalValue - a.totalValue) // Sort by total TND value
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

  async getRevenueBreakdown(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);

    let totalRevenue = 0;
    let buyingRevenue = 0;
    let depotRevenue = 0;

    // Buying revenue: sum of profit (PrixVente - PrixAchat) for non-depot products
    const buyingProducts = await this.prisma.product.findMany({
      where: {
        ...where.product,
        isDepot: false,
      },
      select: {
        PrixVente: true,
        PrixAchat: true,
      },
    });

    buyingProducts.forEach((product) => {
      const prixVente = product.PrixVente || 0;
      const prixAchat = product.PrixAchat || 0;
      const profit = prixVente - prixAchat;
      buyingRevenue += profit;
      totalRevenue += profit;
    });

    // Depot revenue: sum of gain for depot products
    const depotProducts = await this.prisma.product.findMany({
      where: {
        ...where.product,
        isDepot: true,
      },
      select: {
        gain: true,
      },
    });

    depotProducts.forEach((product) => {
      const gain = product.gain || 0;
      depotRevenue += gain;
      totalRevenue += gain;
    });

    return {
      totalRevenue,
      buyingRevenue,
      depotRevenue,
    };
  }

  async getMonthlySoldProducts(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);
    const dateFilter = this.buildDateFilter(query);

    // Get current year
    const now = new Date();
    const currentYear = now.getFullYear();

    // Get all commands for current year
    const commands = await this.prisma.command.findMany({
      where: {
        ...where.command,
        createdAt: {
          gte: new Date(currentYear, 0, 1),
          lte: now,
        },
      },
      select: {
        productsNumber: true,
        createdAt: true,
      },
    });

    // Initialize 12 months with 0
    const monthlyData: { [key: string]: number } = {};
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${currentYear}-${month < 10 ? "0" : ""}${month}`;
      monthlyData[monthKey] = 0;
    }

    // Count sold products per month
    commands.forEach((cmd) => {
      const date = new Date(cmd.createdAt);
      const month = date.getMonth() + 1;
      const monthKey = `${date.getFullYear()}-${month < 10 ? "0" : ""}${month}`;
      if (monthlyData[monthKey] !== undefined) {
        monthlyData[monthKey] += cmd.productsNumber;
      }
    });

    return Object.entries(monthlyData)
      .map(([month, count]) => ({
        month,
        count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
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

  async getCommandLocations(query: StatsQueryDto) {
    const where = this.buildWhereClause(query);

    const commands = await this.prisma.command.findMany({
      where: where.command,
      select: {
        id: true,
        adresseLivraison: true,
        createdAt: true,
        PrixVente: true,
        commandDetails: {
          include: {
            client: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            coClient: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Return commands with addresses (for geocoding on frontend)
    return commands
      .filter(
        (cmd) => cmd.adresseLivraison && cmd.adresseLivraison.trim() !== "",
      )
      .map((cmd) => ({
        id: cmd.id,
        address: cmd.adresseLivraison,
        revenue: cmd.PrixVente,
        date: cmd.createdAt,
        client: cmd.commandDetails[0]?.client
          ? `${cmd.commandDetails[0].client.firstName} ${cmd.commandDetails[0].client.lastName}`
          : cmd.commandDetails[0]?.coClient
            ? `${cmd.commandDetails[0].coClient.firstName} ${cmd.commandDetails[0].coClient.lastName}`
            : "N/A",
      }));
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
