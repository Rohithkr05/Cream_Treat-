import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import {
  AnalyticsService,
  BUSINESS_TIMEZONE,
  getIsoWeekInfo,
  getKolkataDateString,
  shiftIsoDate,
} from './analytics.service.js';
import { Order, OrderStatus } from '../orders/schemas/order.schema.js';
import { FoodItem } from '../menu/schemas/food-item.schema.js';
import { Category } from '../menu/schemas/category.schema.js';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  const mockOrderModel = {
    aggregate: vi.fn(),
  };

  const mockFoodItemModel = {
    find: vi.fn(),
  };

  const mockCategoryModel = {};

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getModelToken(Order.name), useValue: mockOrderModel },
        { provide: getModelToken(FoodItem.name), useValue: mockFoodItemModel },
        { provide: getModelToken(Category.name), useValue: mockCategoryModel },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('Asia/Kolkata Date Resolution & Validation', () => {
    it('computes exact Asia/Kolkata midnight UTC boundaries for single-day and multi-day ranges', () => {
      const range = service.resolveDateRange('2026-11-10', '2026-11-11');

      expect(range.timezone).toBe(BUSINESS_TIMEZONE);
      expect(range.daysCount).toBe(2);
      // 2026-11-10 00:00:00 IST == 2026-11-09 18:30:00Z
      expect(range.startUtc.toISOString()).toBe('2026-11-09T18:30:00.000Z');
      // 2026-11-12 00:00:00 IST == 2026-11-11 18:30:00Z (exclusive upper bound)
      expect(range.endExclusiveUtc.toISOString()).toBe('2026-11-11T18:30:00.000Z');
      // Equivalent previous 2-day period: 2026-11-08 to 2026-11-09 IST
      expect(range.prevStartDate).toBe('2026-11-08');
      expect(range.prevEndDate).toBe('2026-11-09');
      expect(range.prevStartUtc.toISOString()).toBe('2026-11-07T18:30:00.000Z');
      expect(range.prevEndExclusiveUtc.toISOString()).toBe(
        '2026-11-09T18:30:00.000Z',
      );
    });

    it('maps UTC instants around midnight to the correct Asia/Kolkata service date', () => {
      // 2026-11-10 18:45:00Z == 2026-11-11 00:15:00 IST
      const earlyMorningIst = new Date('2026-11-10T18:45:00.000Z');
      expect(getKolkataDateString(earlyMorningIst)).toBe('2026-11-11');

      // 2026-11-10 18:20:00Z == 2026-11-10 23:50:00 IST
      const lateNightIst = new Date('2026-11-10T18:20:00.000Z');
      expect(getKolkataDateString(lateNightIst)).toBe('2026-11-10');
    });

    it('defaults omitted dates to Last 7 days in Asia/Kolkata and single startDate to 1 day', () => {
      const refNow = new Date('2026-11-10T19:00:00.000Z'); // 2026-11-11 00:30 IST
      const defaultRange = service.resolveDateRange(undefined, undefined, refNow);
      expect(defaultRange.startDate).toBe('2026-11-05');
      expect(defaultRange.endDate).toBe('2026-11-11');
      expect(defaultRange.daysCount).toBe(7);

      const singleDay = service.resolveDateRange('2026-11-11');
      expect(singleDay.startDate).toBe('2026-11-11');
      expect(singleDay.endDate).toBe('2026-11-11');
      expect(singleDay.daysCount).toBe(1);
    });

    it('rejects invalid date formats, impossible calendar dates, reversed ranges, and endDate without startDate', () => {
      expect(() => service.resolveDateRange('11-11-2026', '12-11-2026')).toThrow(
        BadRequestException,
      );
      expect(() => service.resolveDateRange('2026-02-30', '2026-03-01')).toThrow(
        BadRequestException,
      );
      expect(() => service.resolveDateRange('2026-11-15', '2026-11-10')).toThrow(
        BadRequestException,
      );
      expect(() => service.resolveDateRange(undefined, '2026-11-10')).toThrow(
        BadRequestException,
      );
      expect(() =>
        service.resolveDateRange('2020-01-01', shiftIsoDate('2020-01-01', 1200)),
      ).toThrow(BadRequestException);
    });

    it('computes ISO week keys consistently across year boundaries', () => {
      expect(getIsoWeekInfo('2025-12-31').key).toBe('2026-W01');
      expect(getIsoWeekInfo('2026-11-11')).toEqual({
        key: '2026-W46',
        mondayDate: '2026-11-09',
        sundayDate: '2026-11-15',
      });
    });
  });

  describe('getOverview', () => {
    it('calculates COMPLETED-only revenue/items/AOV, includes all statuses in totalOrders, and compares against previous period', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            current: [
              {
                totalOrders: 10,
                completedOrders: 6,
                cancelledOrders: 2,
                completedRevenue: 150000, // ₹1,500 in paise
                totalItemsSold: 18,
              },
            ],
            previous: [
              {
                totalOrders: 8,
                completedOrders: 5,
                cancelledOrders: 1,
                completedRevenue: 100000, // ₹1,000 in paise
                totalItemsSold: 12,
              },
            ],
          },
        ]),
      });

      const result = await service.getOverview({
        startDate: '2026-11-05',
        endDate: '2026-11-11',
      });

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      // First $match scans prevStartUtc..endExclusiveUtc for single round-trip
      expect(pipeline[0].$match.createdAt.$gte.toISOString()).toBe(
        '2026-10-28T18:30:00.000Z',
      );
      expect(pipeline[0].$match.createdAt.$lt.toISOString()).toBe(
        '2026-11-11T18:30:00.000Z',
      );

      // Verify COMPLETED-only guards inside current facet pipeline
      const projectStage = JSON.stringify(pipeline[1].$facet.current[1]);
      const groupStage = JSON.stringify(pipeline[1].$facet.current[2]);
      expect(projectStage).toContain(OrderStatus.COMPLETED);
      expect(groupStage).toContain(OrderStatus.COMPLETED);
      expect(groupStage).toContain(OrderStatus.CANCELLED);

      expect(result.hasPreviousPeriodData).toBe(true);
      expect(result.metrics.totalSalesRevenue).toEqual({
        value: 150000,
        previousValue: 100000,
        changePercent: 50,
        hasComparison: true,
        trend: 'up',
      });
      expect(result.metrics.totalOrders).toEqual({
        value: 10,
        previousValue: 8,
        changePercent: 25,
        hasComparison: true,
        trend: 'up',
      });
      expect(result.metrics.totalFoodItemsSold).toEqual({
        value: 18,
        previousValue: 12,
        changePercent: 50,
        hasComparison: true,
        trend: 'up',
      });
      // AOV: 150000 / 6 = 25000 vs 100000 / 5 = 20000 -> +25%
      expect(result.metrics.averageOrderValue).toEqual({
        value: 25000,
        previousValue: 20000,
        changePercent: 25,
        hasComparison: true,
        trend: 'up',
      });
      expect(result.metrics.completedOrders.value).toBe(6);
      expect(result.metrics.cancelledOrders).toEqual({
        value: 2,
        previousValue: 1,
        changePercent: 100,
        hasComparison: true,
        trend: 'up',
      });
    });

    it('returns zeros and unavailable comparisons (no fabricated % changes) on empty database or missing previous baseline', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([{ current: [], previous: [] }]),
      });

      const emptyRes = await service.getOverview({
        startDate: '2026-11-11',
        endDate: '2026-11-11',
      });

      expect(emptyRes.hasPreviousPeriodData).toBe(false);
      expect(emptyRes.metrics.totalSalesRevenue).toEqual({
        value: 0,
        previousValue: 0,
        changePercent: null,
        hasComparison: false,
        trend: 'unavailable',
      });
      expect(emptyRes.metrics.averageOrderValue.value).toBe(0);
      expect(emptyRes.metrics.totalOrders.value).toBe(0);
      expect(emptyRes.metrics.completedOrders.value).toBe(0);
      expect(emptyRes.metrics.cancelledOrders.value).toBe(0);
      expect(emptyRes.metrics.totalFoodItemsSold.value).toBe(0);
    });

    it('returns AOV = 0 when there are orders (e.g. cancelled/new) but zero COMPLETED orders', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            current: [
              {
                totalOrders: 4,
                completedOrders: 0,
                cancelledOrders: 3,
                completedRevenue: 0,
                totalItemsSold: 0,
              },
            ],
            previous: [],
          },
        ]),
      });

      const res = await service.getOverview({
        startDate: '2026-11-11',
        endDate: '2026-11-11',
      });

      expect(res.metrics.totalOrders.value).toBe(4);
      expect(res.metrics.cancelledOrders.value).toBe(3);
      expect(res.metrics.totalSalesRevenue.value).toBe(0);
      expect(res.metrics.averageOrderValue.value).toBe(0);
      expect(res.metrics.averageOrderValue.hasComparison).toBe(false);
    });
  });

  describe('getSalesTrend', () => {
    it('groups daily sales using Asia/Kolkata timezone and zero-fills missing calendar days', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            _id: '2026-11-09',
            revenue: 32000,
            orders: 2,
            completedOrders: 2,
            cancelledOrders: 0,
          },
          {
            _id: '2026-11-11',
            revenue: 48000,
            orders: 4,
            completedOrders: 3,
            cancelledOrders: 1,
          },
        ]),
      });

      const res = await service.getSalesTrend({
        startDate: '2026-11-09',
        endDate: '2026-11-11',
        interval: 'day',
      });

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[1].$group._id.$dateToString).toEqual({
        format: '%Y-%m-%d',
        date: '$createdAt',
        timezone: 'Asia/Kolkata',
      });

      expect(res.series).toHaveLength(3);
      expect(res.series[0]).toMatchObject({
        bucket: '2026-11-09',
        revenue: 32000,
        orders: 2,
      });
      expect(res.series[1]).toMatchObject({
        bucket: '2026-11-10',
        revenue: 0,
        orders: 0,
      });
      expect(res.series[2]).toMatchObject({
        bucket: '2026-11-11',
        revenue: 48000,
        orders: 4,
      });
      expect(res.totals).toEqual({ revenue: 80000, orders: 6 });
    });

    it('supports weekly (%G-W%V) and monthly (%Y-%m) grouping', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });

      const weekly = await service.getSalesTrend({
        startDate: '2026-11-02',
        endDate: '2026-11-15',
        interval: 'week',
      });
      expect(
        mockOrderModel.aggregate.mock.calls[0][0][1].$group._id.$dateToString
          .format,
      ).toBe('%G-W%V');
      expect(weekly.series.map((s) => s.bucket)).toEqual([
        '2026-W45',
        '2026-W46',
      ]);

      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });
      const monthly = await service.getSalesTrend({
        startDate: '2026-10-15',
        endDate: '2026-11-15',
        period: 'month',
      });
      expect(
        mockOrderModel.aggregate.mock.calls[1][0][1].$group._id.$dateToString
          .format,
      ).toBe('%Y-%m');
      expect(monthly.series.map((s) => s.bucket)).toEqual([
        '2026-10',
        '2026-11',
      ]);
    });
  });

  describe('getTopItems', () => {
    it('ranks completed items using historical snapshots and computes percentage share accurately', async () => {
      const id1 = new Types.ObjectId().toString();
      const id2 = new Types.ObjectId().toString();

      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            summary: [
              {
                totalQuantitySold: 10,
                totalItemRevenue: 200000,
                uniqueItemCount: 2,
              },
            ],
            items: [
              {
                foodItemId: id1,
                name: 'Death by Chocolate',
                imageUrl: '/menu/death-by-chocolate.jpg',
                isAvailable: true,
                catalogExists: true,
                quantitySold: 6,
                revenue: 147000,
              },
              {
                foodItemId: id2,
                name: 'Mint Mojito',
                imageUrl: '/menu/mint-mojito.jpg',
                isAvailable: true,
                catalogExists: true,
                quantitySold: 4,
                revenue: 53000,
              },
            ],
          },
        ]),
      });

      const res = await service.getTopItems({
        startDate: '2026-11-01',
        endDate: '2026-11-11',
        page: 1,
        limit: 5,
      });

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.status).toBe(OrderStatus.COMPLETED);
      expect(pipeline[1].$unwind).toBe('$items');
      expect(pipeline[2].$group._id.name).toBe('$items.nameSnapshot');

      expect(res.items).toHaveLength(2);
      expect(res.items[0]).toMatchObject({
        rank: 1,
        name: 'Death by Chocolate',
        quantitySold: 6,
        revenue: 147000,
        percentageContribution: 73.5,
        quantitySharePercent: 60,
      });
      expect(res.items[1].percentageContribution).toBe(26.5);
    });

    it('handles empty top-items result cleanly', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([{ summary: [], items: [] }]),
      });

      const res = await service.getTopItems({
        startDate: '2026-11-11',
        endDate: '2026-11-11',
      });

      expect(res.items).toEqual([]);
      expect(res.summary).toEqual({
        totalQuantitySold: 0,
        totalItemRevenue: 0,
        uniqueItemCount: 0,
      });
      expect(res.pagination.total).toBe(0);
    });
  });

  describe('getLeastSellingItems', () => {
    it('ranks low-sales and active zero-sales items while isolating currently unavailable zero-sales items and excluding items created after endDate', async () => {
      const idActiveZero = new Types.ObjectId();
      const idLowSale = new Types.ObjectId();
      const idUnavailable = new Types.ObjectId();
      const idDeletedWithSales = new Types.ObjectId();

      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            _id: idLowSale,
            quantitySold: 2,
            revenue: 22000,
            nameSnapshot: 'Blue Lime Mojito',
          },
          {
            _id: idDeletedWithSales,
            quantitySold: 1,
            revenue: 9000,
            nameSnapshot: 'Retired Special Shake',
          },
        ]),
      });

      const leanExec = vi.fn().mockResolvedValue([
        {
          _id: idActiveZero,
          name: 'Sweet Lassi',
          imageUrl: '',
          isAvailable: true,
          createdAt: new Date('2026-10-01T00:00:00Z'),
          categoryId: { name: 'Mojito', isActive: true },
        },
        {
          _id: idLowSale,
          name: 'Blue Lime Mojito',
          imageUrl: '/menu/blue-lime-mojito.jpg',
          isAvailable: true,
          createdAt: new Date('2026-10-01T00:00:00Z'),
          categoryId: { name: 'Mojito', isActive: true },
        },
        {
          _id: idUnavailable,
          name: 'Seasonal Strawberry',
          imageUrl: '',
          isAvailable: false,
          createdAt: new Date('2026-10-01T00:00:00Z'),
          categoryId: { name: 'Mojito', isActive: true },
        },
      ]);
      const lean = vi.fn().mockReturnValue({ exec: leanExec });
      const populate = vi.fn().mockReturnValue({ lean });
      mockFoodItemModel.find.mockReturnValue({ populate });

      const res = await service.getLeastSellingItems({
        startDate: '2026-11-01',
        endDate: '2026-11-10',
        page: 1,
        limit: 10,
      });

      // Verify FoodItem query excludes items created after endExclusiveUtc
      const findFilter = mockFoodItemModel.find.mock.calls[0][0];
      expect(findFilter.$or[0].createdAt.$lt.toISOString()).toBe(
        '2026-11-10T18:30:00.000Z',
      );

      expect(res.items.map((i) => i.name)).toEqual([
        'Sweet Lassi',
        'Retired Special Shake',
        'Blue Lime Mojito',
      ]);
      expect(res.items[0].salesStatus).toBe('ZERO_SALES');
      expect(res.items[1].catalogDeleted).toBe(true);
      expect(res.unavailableItems).toHaveLength(1);
      expect(res.unavailableItems[0].name).toBe('Seasonal Strawberry');
      expect(res.summary).toEqual({
        rankedItemCount: 3,
        zeroSalesCount: 1,
        unavailableCount: 1,
      });
    });
  });

  describe('getCategoryPerformance', () => {
    it('uses snapshot attribution first, isolates unattributed items explicitly, and reports attribution metadata', async () => {
      const catId1 = new Types.ObjectId().toString();
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            _id: { categoryId: catId1, categoryName: 'Sundae' },
            itemsSold: 10,
            revenue: 200000,
            snapshotItemCount: 4,
            catalogFallbackItemCount: 2,
            unattributedItemCount: 0,
          },
          {
            _id: { categoryId: null, categoryName: 'Uncategorized / Historical' },
            itemsSold: 2,
            revenue: 50000,
            snapshotItemCount: 0,
            catalogFallbackItemCount: 0,
            unattributedItemCount: 1,
          },
        ]),
      });

      const res = await service.getCategoryPerformance({
        startDate: '2026-11-01',
        endDate: '2026-11-11',
      });

      const pipeline = mockOrderModel.aggregate.mock.calls[0][0];
      expect(pipeline[0].$match.status).toBe(OrderStatus.COMPLETED);
      expect(JSON.stringify(pipeline)).toContain('categoryNameSnapshot');

      expect(res.categories).toHaveLength(2);
      expect(res.categories[0]).toMatchObject({
        categoryName: 'Sundae',
        itemsSold: 10,
        revenue: 200000,
        percentageContribution: 80,
        isUnattributedBucket: false,
      });
      expect(res.categories[1]).toMatchObject({
        categoryName: 'Uncategorized / Historical',
        isUnattributedBucket: true,
        percentageContribution: 20,
      });
      expect(res.attributionSummary).toEqual({
        snapshotLineCount: 4,
        catalogFallbackLineCount: 2,
        unattributedLineCount: 1,
        hasLegacyCatalogFallback: true,
        hasUnattributedItems: true,
      });
    });
  });

  describe('getOrderStatusOverview', () => {
    it('returns all 6 lifecycle statuses including zero-count statuses', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          { _id: OrderStatus.NEW, count: 2, totalAmount: 24000 },
          { _id: OrderStatus.COMPLETED, count: 6, totalAmount: 96000 },
          { _id: OrderStatus.CANCELLED, count: 2, totalAmount: 20000 },
        ]),
      });

      const res = await service.getOrderStatusOverview({
        startDate: '2026-11-11',
        endDate: '2026-11-11',
      });

      expect(res.totalOrders).toBe(10);
      expect(res.statuses).toHaveLength(6);
      expect(res.statuses.map((s) => s.status)).toEqual([
        OrderStatus.NEW,
        OrderStatus.ACCEPTED,
        OrderStatus.PREPARING,
        OrderStatus.READY,
        OrderStatus.COMPLETED,
        OrderStatus.CANCELLED,
      ]);
      expect(res.statuses[1]).toEqual({
        status: OrderStatus.ACCEPTED,
        count: 0,
        totalAmount: 0,
        percentage: 0,
      });
      expect(res.statuses[4]).toEqual({
        status: OrderStatus.COMPLETED,
        count: 6,
        totalAmount: 96000,
        percentage: 60,
      });
    });
  });

  describe('getPeakHours', () => {
    it('aggregates hourly volume and completed revenue in Asia/Kolkata across all 24 hours and identifies busiest hour', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          { _id: 13, orders: 5, completedOrders: 4, revenue: 72000 },
          { _id: 19, orders: 9, completedOrders: 7, revenue: 154000 },
        ]),
      });

      const res = await service.getPeakHours({
        startDate: '2026-11-05',
        endDate: '2026-11-11',
      });

      const projectStage = mockOrderModel.aggregate.mock.calls[0][0][1].$project;
      expect(projectStage.istHour.$hour).toEqual({
        date: '$createdAt',
        timezone: 'Asia/Kolkata',
      });

      expect(res.hours).toHaveLength(24);
      expect(res.hours[19]).toEqual({
        hour: 19,
        label: '7 PM',
        hourRange: '19:00–19:59',
        orders: 9,
        completedOrders: 7,
        revenue: 154000,
      });
      expect(res.busiestHourByOrders?.hour).toBe(19);
      expect(res.busiestHourByRevenue?.hour).toBe(19);
    });

    it('returns null busiestHourByOrders and busiestHourByRevenue on empty dataset', async () => {
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([]),
      });

      const res = await service.getPeakHours({
        startDate: '2026-11-11',
        endDate: '2026-11-11',
      });

      expect(res.hours).toHaveLength(24);
      expect(res.busiestHourByOrders).toBeNull();
      expect(res.busiestHourByRevenue).toBeNull();
    });
  });

  describe('getRecentOrders', () => {
    it('returns paginated recent orders sorted newest first with calculated item counts', async () => {
      const oid = new Types.ObjectId().toString();
      mockOrderModel.aggregate.mockReturnValue({
        exec: vi.fn().mockResolvedValue([
          {
            meta: [{ total: 1 }],
            data: [
              {
                id: oid,
                orderNumber: '#007',
                orderDate: '2026-11-11',
                tableNumber: 4,
                status: OrderStatus.COMPLETED,
                total: 36000,
                createdAt: new Date('2026-11-11T10:30:00.000Z'),
                itemCount: 3,
              },
            ],
          },
        ]),
      });

      const res = await service.getRecentOrders({
        startDate: '2026-11-11',
        endDate: '2026-11-11',
        page: 1,
        limit: 10,
      });

      expect(res.data).toHaveLength(1);
      expect(res.data[0]).toEqual({
        id: oid,
        orderNumber: '#007',
        orderDate: '2026-11-11',
        tableNumber: 4,
        status: OrderStatus.COMPLETED,
        total: 36000,
        createdAt: '2026-11-11T10:30:00.000Z',
        itemCount: 3,
      });
      expect(res.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });
  });
});

