import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { StatsQueryDto } from './dto/stats-query.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('stats')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Get all KPIs' })
  async getKPIs(@Query() query: StatsQueryDto) {
    return this.statsService.getKPIs(query);
  }

  @Get('products-by-category')
  @ApiOperation({ summary: 'Get products distribution by category' })
  async getProductsByCategory(@Query() query: StatsQueryDto) {
    return this.statsService.getProductsByCategory(query);
  }

  @Get('commands-by-status')
  @ApiOperation({ summary: 'Get commands distribution by status' })
  async getCommandsByStatus(@Query() query: StatsQueryDto) {
    return this.statsService.getCommandsByStatus(query);
  }

  @Get('monthly-revenue')
  @ApiOperation({ summary: 'Get monthly revenue trend' })
  async getMonthlyRevenue(@Query() query: StatsQueryDto) {
    return this.statsService.getMonthlyRevenue(query);
  }

  @Get('monthly-profit')
  @ApiOperation({ summary: 'Get monthly profit trend' })
  async getMonthlyProfit(@Query() query: StatsQueryDto) {
    return this.statsService.getMonthlyProfit(query);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Get top selling products' })
  async getTopProducts(@Query() query: StatsQueryDto & { limit?: number }) {
    return this.statsService.getTopProducts(query, query.limit || 10);
  }

  @Get('revenue-breakdown')
  @ApiOperation({ summary: 'Get revenue breakdown (total, buying, depot)' })
  async getRevenueBreakdown(@Query() query: StatsQueryDto) {
    return this.statsService.getRevenueBreakdown(query);
  }

  @Get('monthly-sold-products')
  @ApiOperation({ summary: 'Get monthly sold products count for current year' })
  async getMonthlySoldProducts(@Query() query: StatsQueryDto) {
    return this.statsService.getMonthlySoldProducts(query);
  }

  @Get('depot-vs-buying')
  @ApiOperation({ summary: 'Get depot vs buying products count' })
  async getDepotVsBuyingProducts(@Query() query: StatsQueryDto) {
    return this.statsService.getDepotVsBuyingProducts(query);
  }

  @Get('command-locations')
  @ApiOperation({ summary: 'Get command locations for map markers' })
  async getCommandLocations(@Query() query: StatsQueryDto) {
    return this.statsService.getCommandLocations(query);
  }

  @Get('total-surcharge')
  @ApiOperation({ summary: 'Get total surcharge amount' })
  async getTotalSurcharge(@Query() query: StatsQueryDto) {
    return this.statsService.getTotalSurcharge(query);
  }
