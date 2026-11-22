import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AnalyticsService } from './analytics.service.js';
import {
  AnalyticsDateRangeDto,
  AnalyticsPaginationQueryDto,
  AnalyticsSalesQueryDto,
} from './dto/analytics-query.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getOverview(query);
  }

  @Get('sales')
  async getSalesTrend(@Query() query: AnalyticsSalesQueryDto) {
    return this.analyticsService.getSalesTrend(query);
  }

  @Get('top-items')
  async getTopItems(@Query() query: AnalyticsPaginationQueryDto) {
    return this.analyticsService.getTopItems(query);
  }

  @Get('least-selling-items')
  async getLeastSellingItems(@Query() query: AnalyticsPaginationQueryDto) {
    return this.analyticsService.getLeastSellingItems(query);
  }

  @Get('categories')
  async getCategoryPerformance(@Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getCategoryPerformance(query);
  }

  @Get('order-status')
  async getOrderStatusOverview(@Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getOrderStatusOverview(query);
  }

  @Get('peak-hours')
  async getPeakHours(@Query() query: AnalyticsDateRangeDto) {
    return this.analyticsService.getPeakHours(query);
  }

  @Get('recent-orders')
  async getRecentOrders(@Query() query: AnalyticsPaginationQueryDto) {
    return this.analyticsService.getRecentOrders(query);
  }
}

