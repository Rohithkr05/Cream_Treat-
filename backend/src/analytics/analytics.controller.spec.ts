import {
  BadRequestException,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';
import {
  AnalyticsDateRangeDto,
  AnalyticsPaginationQueryDto,
  AnalyticsSalesQueryDto,
} from './dto/analytics-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  const mockAnalyticsService = {
    getOverview: vi.fn(),
    getSalesTrend: vi.fn(),
    getTopItems: vi.fn(),
    getLeastSellingItems: vi.fn(),
    getCategoryPerformance: vi.fn(),
    getOrderStatusOverview: vi.fn(),
    getPeakHours: vi.fn(),
    getRecentOrders: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  it('should mount under admin/analytics and enforce JwtAuthGuard', () => {
    const path = Reflect.getMetadata('path', AnalyticsController);
    expect(path).toBe('admin/analytics');

    const guards = Reflect.getMetadata('__guards__', AnalyticsController);
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
  });

  it('should reject unauthorized and non-ADMIN requests via JwtAuthGuard', () => {
    const guard = new JwtAuthGuard();
    const dummyCtx = {} as ExecutionContext;

    expect(() =>
      guard.handleRequest(null, false, { message: 'No auth token' }, dummyCtx),
    ).toThrow(UnauthorizedException);

    expect(() =>
      guard.handleRequest(
        null,
        { id: '1', email: 'guest@example.com', role: 'CUSTOMER' },
        null,
        dummyCtx,
      ),
    ).toThrow(ForbiddenException);

    const adminUser = {
      id: '670c00000000000000000001',
      email: 'admin@creamtreat.local',
      role: 'ADMIN',
    };
    expect(guard.handleRequest(null, adminUser, null, dummyCtx)).toEqual(
      adminUser,
    );
  });

  it('should delegate all 8 analytics endpoints to AnalyticsService', async () => {
    const baseQuery: AnalyticsDateRangeDto = {
      startDate: '2026-11-01',
      endDate: '2026-11-11',
    };
    const salesQuery: AnalyticsSalesQueryDto = {
      ...baseQuery,
      interval: 'week',
    };
    const pageQuery: AnalyticsPaginationQueryDto = {
      ...baseQuery,
      page: 2,
      limit: 10,
    };

    mockAnalyticsService.getOverview.mockResolvedValue({ ok: 'overview' });
    mockAnalyticsService.getSalesTrend.mockResolvedValue({ ok: 'sales' });
    mockAnalyticsService.getTopItems.mockResolvedValue({ ok: 'top-items' });
    mockAnalyticsService.getLeastSellingItems.mockResolvedValue({
      ok: 'least-items',
    });
    mockAnalyticsService.getCategoryPerformance.mockResolvedValue({
      ok: 'categories',
    });
    mockAnalyticsService.getOrderStatusOverview.mockResolvedValue({
      ok: 'order-status',
    });
    mockAnalyticsService.getPeakHours.mockResolvedValue({ ok: 'peak-hours' });
    mockAnalyticsService.getRecentOrders.mockResolvedValue({
      ok: 'recent-orders',
    });

    expect(await controller.getOverview(baseQuery)).toEqual({ ok: 'overview' });
    expect(await controller.getSalesTrend(salesQuery)).toEqual({ ok: 'sales' });
    expect(await controller.getTopItems(pageQuery)).toEqual({
      ok: 'top-items',
    });
    expect(await controller.getLeastSellingItems(pageQuery)).toEqual({
      ok: 'least-items',
    });
    expect(await controller.getCategoryPerformance(baseQuery)).toEqual({
      ok: 'categories',
    });
    expect(await controller.getOrderStatusOverview(baseQuery)).toEqual({
      ok: 'order-status',
    });
    expect(await controller.getPeakHours(baseQuery)).toEqual({
      ok: 'peak-hours',
    });
    expect(await controller.getRecentOrders(pageQuery)).toEqual({
      ok: 'recent-orders',
    });

    expect(mockAnalyticsService.getOverview).toHaveBeenCalledWith(baseQuery);
    expect(mockAnalyticsService.getSalesTrend).toHaveBeenCalledWith(salesQuery);
    expect(mockAnalyticsService.getTopItems).toHaveBeenCalledWith(pageQuery);
    expect(mockAnalyticsService.getLeastSellingItems).toHaveBeenCalledWith(
      pageQuery,
    );
    expect(mockAnalyticsService.getCategoryPerformance).toHaveBeenCalledWith(
      baseQuery,
    );
    expect(mockAnalyticsService.getOrderStatusOverview).toHaveBeenCalledWith(
      baseQuery,
    );
    expect(mockAnalyticsService.getPeakHours).toHaveBeenCalledWith(baseQuery);
    expect(mockAnalyticsService.getRecentOrders).toHaveBeenCalledWith(
      pageQuery,
    );
  });

  it('should validate analytics query DTOs with ValidationPipe', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    const validSales = await pipe.transform(
      { startDate: '2026-11-01', endDate: '2026-11-11', interval: 'month' },
      { type: 'query', metatype: AnalyticsSalesQueryDto },
    );
    expect(validSales.interval).toBe('month');

    const validPaginated = await pipe.transform(
      { page: '2', limit: '25' },
      { type: 'query', metatype: AnalyticsPaginationQueryDto },
    );
    expect(validPaginated.page).toBe(2);
    expect(validPaginated.limit).toBe(25);

    await expect(
      pipe.transform(
        { startDate: '11-11-2026' },
        { type: 'query', metatype: AnalyticsDateRangeDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { interval: 'yearly' },
        { type: 'query', metatype: AnalyticsSalesQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { limit: '500' },
        { type: 'query', metatype: AnalyticsPaginationQueryDto },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      pipe.transform(
        { unknownParam: 'x' },
        { type: 'query', metatype: AnalyticsDateRangeDto },
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
