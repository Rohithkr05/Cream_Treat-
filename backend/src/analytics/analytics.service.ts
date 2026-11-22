import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../orders/schemas/order.schema.js';
import {
  FoodItem,
  FoodItemDocument,
} from '../menu/schemas/food-item.schema.js';
import {
  Category,
  CategoryDocument,
} from '../menu/schemas/category.schema.js';
import {
  AnalyticsDateRangeDto,
  AnalyticsPaginationQueryDto,
  AnalyticsSalesQueryDto,
  SalesInterval,
} from './dto/analytics-query.dto.js';

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';
const MAX_RANGE_DAYS = 1095;
const MS_PER_DAY = 86_400_000;

export interface ResolvedDateRange {
  startDate: string;
  endDate: string;
  timezone: string;
  daysCount: number;
  startUtc: Date;
  endExclusiveUtc: Date;
  prevStartDate: string;
  prevEndDate: string;
  prevStartUtc: Date;
  prevEndExclusiveUtc: Date;
}

export interface OverviewMetricComparison {
  value: number;
  previousValue: number;
  changePercent: number | null;
  hasComparison: boolean;
  trend: 'up' | 'down' | 'flat' | 'unavailable';
}

export function getKolkataDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function parseStrictIsoDate(value: string): {
  year: number;
  month: number;
  day: number;
} {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(
      `Invalid date format "${value}". Expected YYYY-MM-DD.`,
    );
  }
  const [yStr, mStr, dStr] = value.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(probe.getTime()) ||
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    throw new BadRequestException(`Invalid calendar date "${value}".`);
  }
  return { year, month, day };
}

export function shiftIsoDate(dateStr: string, offsetDays: number): string {
  const { year, month, day } = parseStrictIsoDate(dateStr);
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return shifted.toISOString().slice(0, 10);
}

export function getIsoWeekInfo(dateStr: string): {
  key: string;
  mondayDate: string;
  sundayDate: string;
} {
  const { year, month, day } = parseStrictIsoDate(dateStr);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dayNum = d.getUTCDay() || 7;
  const thursday = new Date(Date.UTC(year, month - 1, day + (4 - dayNum)));
  const isoYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNo = Math.ceil(
    ((thursday.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7,
  );
  const monday = new Date(Date.UTC(year, month - 1, day - (dayNum - 1)));
  const sunday = new Date(Date.UTC(year, month - 1, day + (7 - dayNum)));

  return {
    key: `${isoYear}-W${String(weekNo).padStart(2, '0')}`,
    mondayDate: monday.toISOString().slice(0, 10),
    sundayDate: sunday.toISOString().slice(0, 10),
  };
}

function formatShortDateLabel(isoDate: string): string {
  const dt = new Date(`${isoDate}T00:00:00.000+05:30`);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: 'short',
  }).format(dt);
}

function formatMonthLabel(yearMonth: string): string {
  const dt = new Date(`${yearMonth}-01T00:00:00.000+05:30`);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: BUSINESS_TIMEZONE,
    month: 'short',
    year: 'numeric',
  }).format(dt);
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

function buildComparison(
  current: number,
  previous: number,
  hasPreviousPeriodOrders: boolean,
): OverviewMetricComparison {
  if (!hasPreviousPeriodOrders || previous <= 0) {
    return {
      value: current,
      previousValue: previous,
      changePercent: null,
      hasComparison: false,
      trend: 'unavailable',
    };
  }

  const rawPercent = ((current - previous) / previous) * 100;
  const changePercent = Number(rawPercent.toFixed(1));
  const trend: OverviewMetricComparison['trend'] =
    changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat';

  return {
    value: current,
    previousValue: previous,
    changePercent,
    hasComparison: true,
    trend,
  };
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(FoodItem.name)
    private readonly foodItemModel: Model<FoodItemDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  resolveDateRange(
    startDate?: string,
    endDate?: string,
    referenceNow: Date = new Date(),
  ): ResolvedDateRange {
    if (!startDate && endDate) {
      throw new BadRequestException(
        'startDate is required when endDate is specified.',
      );
    }

    let resolvedStart = startDate;
    let resolvedEnd = endDate;

    if (!resolvedStart && !resolvedEnd) {
      const todayIst = getKolkataDateString(referenceNow);
      resolvedStart = shiftIsoDate(todayIst, -6);
      resolvedEnd = todayIst;
    } else if (resolvedStart && !resolvedEnd) {
      resolvedEnd = resolvedStart;
    }

    const startParsed = parseStrictIsoDate(resolvedStart!);
    const endParsed = parseStrictIsoDate(resolvedEnd!);

    const startUtcDayMs = Date.UTC(
      startParsed.year,
      startParsed.month - 1,
      startParsed.day,
    );
    const endUtcDayMs = Date.UTC(
      endParsed.year,
      endParsed.month - 1,
      endParsed.day,
    );

    if (startUtcDayMs > endUtcDayMs) {
      throw new BadRequestException(
        'startDate cannot be later than endDate.',
      );
    }

    const daysCount = Math.round((endUtcDayMs - startUtcDayMs) / MS_PER_DAY) + 1;
    if (daysCount > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_RANGE_DAYS} days.`,
      );
    }

    const startUtc = new Date(`${resolvedStart}T00:00:00.000+05:30`);
    const endExclusiveIso = shiftIsoDate(resolvedEnd!, 1);
    const endExclusiveUtc = new Date(`${endExclusiveIso}T00:00:00.000+05:30`);

    const prevStartDate = shiftIsoDate(resolvedStart!, -daysCount);
    const prevEndDate = shiftIsoDate(resolvedStart!, -1);
    const prevStartUtc = new Date(`${prevStartDate}T00:00:00.000+05:30`);

    return {
      startDate: resolvedStart!,
      endDate: resolvedEnd!,
      timezone: BUSINESS_TIMEZONE,
      daysCount,
      startUtc,
      endExclusiveUtc,
      prevStartDate,
      prevEndDate,
      prevStartUtc,
      prevEndExclusiveUtc: startUtc,
    };
  }

  private formatRangeMetadata(range: ResolvedDateRange) {
    return {
      startDate: range.startDate,
      endDate: range.endDate,
      previousStartDate: range.prevStartDate,
      previousEndDate: range.prevEndDate,
      daysCount: range.daysCount,
      timezone: range.timezone,
    };
  }

  async getOverview(query: AnalyticsDateRangeDto) {
    const range = this.resolveDateRange(query.startDate, query.endDate);

    const buildPeriodStages = (from: Date, toExclusive: Date) => [
      {
        $match: {
          createdAt: { $gte: from, $lt: toExclusive },
        },
      },
      {
        $project: {
          status: 1,
          total: { $ifNull: ['$total', 0] },
          completedItemQty: {
            $cond: [
              { $eq: ['$status', OrderStatus.COMPLETED] },
              {
                $reduce: {
                  input: { $ifNull: ['$items', []] },
                  initialValue: 0,
                  in: {
                    $add: ['$$value', { $ifNull: ['$$this.quantity', 0] }],
                  },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.COMPLETED] }, 1, 0],
            },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0],
            },
          },
          completedRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', OrderStatus.COMPLETED] },
                '$total',
                0,
              ],
            },
          },
          totalItemsSold: { $sum: '$completedItemQty' },
        },
      },
    ];

    const aggregated = await this.orderModel
      .aggregate([
        {
          $match: {
            createdAt: { $gte: range.prevStartUtc, $lt: range.endExclusiveUtc },
          },
        },
        {
          $facet: {
            current: buildPeriodStages(range.startUtc, range.endExclusiveUtc),
            previous: buildPeriodStages(
              range.prevStartUtc,
              range.prevEndExclusiveUtc,
            ),
          },
        },
      ])
      .exec();

    const raw = aggregated?.[0] ?? {};
    const cur = raw.current?.[0] ?? {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      completedRevenue: 0,
      totalItemsSold: 0,
    };
    const prev = raw.previous?.[0] ?? {
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      completedRevenue: 0,
      totalItemsSold: 0,
    };

    const currentAov =
      cur.completedOrders > 0
        ? Math.round(cur.completedRevenue / cur.completedOrders)
        : 0;
    const previousAov =
      prev.completedOrders > 0
        ? Math.round(prev.completedRevenue / prev.completedOrders)
        : 0;

    const hasPreviousPeriodData = prev.totalOrders > 0;

    return {
      range: this.formatRangeMetadata(range),
      hasPreviousPeriodData,
      metrics: {
        totalSalesRevenue: buildComparison(
          cur.completedRevenue,
          prev.completedRevenue,
          prev.completedOrders > 0,
        ),
        totalOrders: buildComparison(
          cur.totalOrders,
          prev.totalOrders,
          hasPreviousPeriodData,
        ),
        totalFoodItemsSold: buildComparison(
          cur.totalItemsSold,
          prev.totalItemsSold,
          prev.completedOrders > 0,
        ),
        averageOrderValue: buildComparison(
          currentAov,
          previousAov,
          prev.completedOrders > 0,
        ),
        completedOrders: buildComparison(
          cur.completedOrders,
          prev.completedOrders,
          hasPreviousPeriodData,
        ),
        cancelledOrders: buildComparison(
          cur.cancelledOrders,
          prev.cancelledOrders,
          hasPreviousPeriodData,
        ),
      },
    };
  }

  async getSalesTrend(query: AnalyticsSalesQueryDto) {
    const range = this.resolveDateRange(query.startDate, query.endDate);
    const interval: SalesInterval = query.interval ?? query.period ?? 'day';

    const dateFormat =
      interval === 'month'
        ? '%Y-%m'
        : interval === 'week'
          ? '%G-W%V'
          : '%Y-%m-%d';

    const rows = await this.orderModel
      .aggregate<{
        _id: string;
        revenue: number;
        orders: number;
        completedOrders: number;
        cancelledOrders: number;
      }>([
        {
          $match: {
            createdAt: { $gte: range.startUtc, $lt: range.endExclusiveUtc },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: '$createdAt',
                timezone: BUSINESS_TIMEZONE,
              },
            },
            revenue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', OrderStatus.COMPLETED] },
                  { $ifNull: ['$total', 0] },
                  0,
                ],
              },
            },
            orders: { $sum: 1 },
            completedOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', OrderStatus.COMPLETED] }, 1, 0],
              },
            },
            cancelledOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const byBucket = new Map(rows.map((r) => [r._id, r]));
    const series: Array<{
      bucket: string;
      label: string;
      revenue: number;
      orders: number;
      completedOrders: number;
      cancelledOrders: number;
    }> = [];

    if (interval === 'day') {
      for (let i = 0; i < range.daysCount; i++) {
        const bucket = shiftIsoDate(range.startDate, i);
        const entry = byBucket.get(bucket);
        series.push({
          bucket,
          label: formatShortDateLabel(bucket),
          revenue: entry?.revenue ?? 0,
          orders: entry?.orders ?? 0,
          completedOrders: entry?.completedOrders ?? 0,
          cancelledOrders: entry?.cancelledOrders ?? 0,
        });
      }
    } else if (interval === 'week') {
      const seenWeeks = new Map<
        string,
        { mondayDate: string; sundayDate: string }
      >();
      for (let i = 0; i < range.daysCount; i++) {
        const dayStr = shiftIsoDate(range.startDate, i);
        const weekInfo = getIsoWeekInfo(dayStr);
        if (!seenWeeks.has(weekInfo.key)) {
          seenWeeks.set(weekInfo.key, {
            mondayDate: weekInfo.mondayDate,
            sundayDate: weekInfo.sundayDate,
          });
        }
      }
      for (const [key, bounds] of seenWeeks.entries()) {
        const entry = byBucket.get(key);
        series.push({
          bucket: key,
          label: `${formatShortDateLabel(bounds.mondayDate)} – ${formatShortDateLabel(bounds.sundayDate)}`,
          revenue: entry?.revenue ?? 0,
          orders: entry?.orders ?? 0,
          completedOrders: entry?.completedOrders ?? 0,
          cancelledOrders: entry?.cancelledOrders ?? 0,
        });
      }
    } else {
      const seenMonths = new Set<string>();
      for (let i = 0; i < range.daysCount; i++) {
        seenMonths.add(shiftIsoDate(range.startDate, i).slice(0, 7));
      }
      for (const monthKey of seenMonths) {
        const entry = byBucket.get(monthKey);
        series.push({
          bucket: monthKey,
          label: formatMonthLabel(monthKey),
          revenue: entry?.revenue ?? 0,
          orders: entry?.orders ?? 0,
          completedOrders: entry?.completedOrders ?? 0,
          cancelledOrders: entry?.cancelledOrders ?? 0,
        });
      }
    }

    const totalRevenue = series.reduce((sum, s) => sum + s.revenue, 0);
    const totalOrders = series.reduce((sum, s) => sum + s.orders, 0);

    return {
      range: this.formatRangeMetadata(range),
      interval,
      totals: {
        revenue: totalRevenue,
        orders: totalOrders,
      },
      series,
    };
  }

  async getTopItems(query: AnalyticsPaginationQueryDto) {
    const range = this.resolveDateRange(query.startDate, query.endDate);
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const skip = (page - 1) * limit;

    const aggregated = await this.orderModel
      .aggregate([
        {
          $match: {
            createdAt: { $gte: range.startUtc, $lt: range.endExclusiveUtc },
            status: OrderStatus.COMPLETED,
          },
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: {
              foodItemId: '$items.foodItemId',
              name: '$items.nameSnapshot',
            },
            quantitySold: { $sum: { $ifNull: ['$items.quantity', 0] } },
            revenue: { $sum: { $ifNull: ['$items.itemTotal', 0] } },
            categoryNameSnapshot: { $last: '$items.categoryNameSnapshot' },
          },
        },
        {
          $sort: {
            quantitySold: -1,
            revenue: -1,
            '_id.name': 1,
          },
        },
        {
          $facet: {
            summary: [
              {
                $group: {
                  _id: null,
                  totalQuantitySold: { $sum: '$quantitySold' },
                  totalItemRevenue: { $sum: '$revenue' },
                  uniqueItemCount: { $sum: 1 },
                },
              },
            ],
            items: [
              { $skip: skip },
              { $limit: limit },
              {
                $lookup: {
                  from: 'fooditems',
                  localField: '_id.foodItemId',
                  foreignField: '_id',
                  as: 'catalogItem',
                },
              },
              {
                $unwind: {
                  path: '$catalogItem',
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $project: {
                  _id: 0,
                  foodItemId: {
                    $cond: [
                      { $ne: ['$_id.foodItemId', null] },
                      { $toString: '$_id.foodItemId' },
                      null,
                    ],
                  },
                  name: '$_id.name',
                  imageUrl: { $ifNull: ['$catalogItem.imageUrl', ''] },
                  isAvailable: {
                    $cond: [
                      { $ifNull: ['$catalogItem._id', false] },
                      '$catalogItem.isAvailable',
                      null,
                    ],
                  },
                  catalogExists: {
                    $cond: [{ $ifNull: ['$catalogItem._id', false] }, true, false],
                  },
                  quantitySold: 1,
                  revenue: 1,
                },
              },
            ],
          },
        },
      ])
      .exec();

    const raw = aggregated?.[0] ?? {};
    const summaryRow = raw.summary?.[0] ?? {
      totalQuantitySold: 0,
      totalItemRevenue: 0,
      uniqueItemCount: 0,
    };

    const total = summaryRow.uniqueItemCount || 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const items = (raw.items ?? []).map(
      (
        item: {
          foodItemId: string | null;
          name: string;
          imageUrl: string;
          isAvailable: boolean | null;
          catalogExists: boolean;
          quantitySold: number;
          revenue: number;
        },
        index: number,
      ) => ({
        ...item,
        rank: skip + index + 1,
        percentageContribution:
          summaryRow.totalItemRevenue > 0
            ? Number(
                ((item.revenue / summaryRow.totalItemRevenue) * 100).toFixed(1),
              )
            : 0,
        quantitySharePercent:
          summaryRow.totalQuantitySold > 0
            ? Number(
                (
                  (item.quantitySold / summaryRow.totalQuantitySold) *
                  100
                ).toFixed(1),
              )
            : 0,
      }),
    );

    return {
      range: this.formatRangeMetadata(range),
      summary: {
        totalQuantitySold: summaryRow.totalQuantitySold,
        totalItemRevenue: summaryRow.totalItemRevenue,
        uniqueItemCount: total,
      },
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getLeastSellingItems(query: AnalyticsPaginationQueryDto) {
    const range = this.resolveDateRange(query.startDate, query.endDate);
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const skip = (page - 1) * limit;

    const [soldAgg, catalogItems] = await Promise.all([
      this.orderModel
        .aggregate<{
          _id: unknown;
          quantitySold: number;
          revenue: number;
          nameSnapshot: string;
        }>([
          {
            $match: {
              createdAt: { $gte: range.startUtc, $lt: range.endExclusiveUtc },
              status: OrderStatus.COMPLETED,
            },
          },
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.foodItemId',
              quantitySold: { $sum: { $ifNull: ['$items.quantity', 0] } },
              revenue: { $sum: { $ifNull: ['$items.itemTotal', 0] } },
              nameSnapshot: { $last: '$items.nameSnapshot' },
            },
          },
        ])
        .exec(),
      this.foodItemModel
        .find({
          $or: [
            { createdAt: { $lt: range.endExclusiveUtc } },
            { createdAt: { $exists: false } },
          ],
        })
        .populate('categoryId', 'name isActive')
        .lean()
        .exec(),
    ]);

    const soldByFoodId = new Map<
      string,
      { quantitySold: number; revenue: number; nameSnapshot: string }
    >();
    for (const row of soldAgg) {
      if (row._id) {
        soldByFoodId.set(String(row._id), {
          quantitySold: row.quantitySold,
          revenue: row.revenue,
          nameSnapshot: row.nameSnapshot,
        });
      }
    }

    const activeRankedItems: Array<{
      foodItemId: string;
      name: string;
      categoryName: string;
      imageUrl: string;
      quantitySold: number;
      revenue: number;
      salesStatus: 'ZERO_SALES' | 'LOW_SALES';
      currentlyAvailable: boolean;
      catalogDeleted: boolean;
      createdAfterRangeStart: boolean;
    }> = [];

    const unavailableItems: Array<{
      foodItemId: string;
      name: string;
      categoryName: string;
      imageUrl: string;
      quantitySold: number;
      revenue: number;
      itemAvailable: boolean;
      categoryActive: boolean;
    }> = [];

    const seenFoodIds = new Set<string>();

    for (const item of catalogItems as Array<{
      _id: unknown;
      name: string;
      imageUrl?: string;
      isAvailable?: boolean;
      createdAt?: Date;
      categoryId?:
        | { _id?: unknown; name?: string; isActive?: boolean }
        | unknown;
    }>) {
      const idStr = String(item._id);
      seenFoodIds.add(idStr);

      const categoryObj =
        item.categoryId &&
        typeof item.categoryId === 'object' &&
        'name' in item.categoryId
          ? (item.categoryId as { name?: string; isActive?: boolean })
          : null;

      const categoryName = categoryObj?.name || 'Uncategorized';
      const categoryActive = categoryObj ? categoryObj.isActive !== false : true;
      const itemAvailable = item.isAvailable !== false;
      const isCurrentlyAvailable = itemAvailable && categoryActive;

      const sold = soldByFoodId.get(idStr);
      const quantitySold = sold?.quantitySold ?? 0;
      const revenue = sold?.revenue ?? 0;
      const createdAfterRangeStart =
        item.createdAt instanceof Date
          ? item.createdAt.getTime() > range.startUtc.getTime()
          : false;

      if (quantitySold === 0 && !isCurrentlyAvailable) {
        unavailableItems.push({
          foodItemId: idStr,
          name: item.name,
          categoryName,
          imageUrl: item.imageUrl || '',
          quantitySold: 0,
          revenue: 0,
          itemAvailable,
          categoryActive,
        });
        continue;
      }

      activeRankedItems.push({
        foodItemId: idStr,
        name: item.name,
        categoryName,
        imageUrl: item.imageUrl || '',
        quantitySold,
        revenue,
        salesStatus: quantitySold === 0 ? 'ZERO_SALES' : 'LOW_SALES',
        currentlyAvailable: isCurrentlyAvailable,
        catalogDeleted: false,
        createdAfterRangeStart,
      });
    }

    for (const [idStr, sold] of soldByFoodId.entries()) {
      if (!seenFoodIds.has(idStr) && sold.quantitySold > 0) {
        activeRankedItems.push({
          foodItemId: idStr,
          name: sold.nameSnapshot,
          categoryName: 'Historical / Removed',
          imageUrl: '',
          quantitySold: sold.quantitySold,
          revenue: sold.revenue,
          salesStatus: 'LOW_SALES',
          currentlyAvailable: false,
          catalogDeleted: true,
          createdAfterRangeStart: false,
        });
      }
    }

    activeRankedItems.sort(
      (a, b) =>
        a.quantitySold - b.quantitySold ||
        a.revenue - b.revenue ||
        a.name.localeCompare(b.name),
    );
    unavailableItems.sort((a, b) => a.name.localeCompare(b.name));

    const total = activeRankedItems.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const paginatedItems = activeRankedItems.slice(skip, skip + limit);

    return {
      range: this.formatRangeMetadata(range),
      summary: {
        rankedItemCount: total,
        zeroSalesCount: activeRankedItems.filter(
          (item) => item.quantitySold === 0,
        ).length,
        unavailableCount: unavailableItems.length,
      },
      items: paginatedItems,
      unavailableItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      limitationNote:
        'Historical availability state changes are not versioned in FoodItem documents. Items with zero completed sales that are currently unavailable or belong to an inactive category are separated from active zero-sales items, and items created after the selected end date are excluded.',
    };
  }

  async getCategoryPerformance(query: AnalyticsDateRangeDto) {
    const range = this.resolveDateRange(query.startDate, query.endDate);

    const rows = await this.orderModel
      .aggregate<{
        _id: { categoryId: string | null; categoryName: string };
        itemsSold: number;
        revenue: number;
        snapshotItemCount: number;
        catalogFallbackItemCount: number;
        unattributedItemCount: number;
      }>([
        {
          $match: {
            createdAt: { $gte: range.startUtc, $lt: range.endExclusiveUtc },
            status: OrderStatus.COMPLETED,
          },
        },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'fooditems',
            localField: 'items.foodItemId',
            foreignField: '_id',
            as: 'foodDoc',
          },
        },
        {
          $unwind: {
            path: '$foodDoc',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'foodDoc.categoryId',
            foreignField: '_id',
            as: 'catDoc',
          },
        },
        {
          $unwind: {
            path: '$catDoc',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: {
            hasSnapshot: {
              $and: [
                { $ne: [{ $ifNull: ['$items.categoryNameSnapshot', ''] }, ''] },
              ],
            },
            hasCatalogCategory: {
              $and: [
                { $ifNull: ['$foodDoc._id', false] },
                { $ifNull: ['$catDoc._id', false] },
                { $ne: [{ $ifNull: ['$catDoc.name', ''] }, ''] },
              ],
            },
          },
        },
        {
          $addFields: {
            resolvedCategoryId: {
              $cond: [
                '$hasSnapshot',
                {
                  $cond: [
                    { $ne: ['$items.categoryIdSnapshot', null] },
                    { $toString: '$items.categoryIdSnapshot' },
                    null,
                  ],
                },
                {
                  $cond: [
                    '$hasCatalogCategory',
                    { $toString: '$catDoc._id' },
                    null,
                  ],
                },
              ],
            },
            resolvedCategoryName: {
              $cond: [
                '$hasSnapshot',
                '$items.categoryNameSnapshot',
                {
                  $cond: [
                    '$hasCatalogCategory',
                    '$catDoc.name',
                    'Uncategorized / Historical',
                  ],
                },
              ],
            },
            attributionSource: {
              $cond: [
                '$hasSnapshot',
                'snapshot',
                {
                  $cond: [
                    '$hasCatalogCategory',
                    'catalog_lookup',
                    'unattributed',
                  ],
                },
              ],
            },
          },
        },
        {
          $group: {
            _id: {
              categoryId: '$resolvedCategoryId',
              categoryName: '$resolvedCategoryName',
            },
            itemsSold: { $sum: { $ifNull: ['$items.quantity', 0] } },
            revenue: { $sum: { $ifNull: ['$items.itemTotal', 0] } },
            snapshotItemCount: {
              $sum: {
                $cond: [{ $eq: ['$attributionSource', 'snapshot'] }, 1, 0],
              },
            },
            catalogFallbackItemCount: {
              $sum: {
                $cond: [{ $eq: ['$attributionSource', 'catalog_lookup'] }, 1, 0],
              },
            },
            unattributedItemCount: {
              $sum: {
                $cond: [{ $eq: ['$attributionSource', 'unattributed'] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: {
            revenue: -1,
            itemsSold: -1,
            '_id.categoryName': 1,
          },
        },
      ])
      .exec();

    const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
    const totalItemsSold = rows.reduce((sum, r) => sum + r.itemsSold, 0);

    let snapshotLineCount = 0;
    let catalogFallbackLineCount = 0;
    let unattributedLineCount = 0;

    const categories = rows.map((row) => {
      snapshotLineCount += row.snapshotItemCount;
      catalogFallbackLineCount += row.catalogFallbackItemCount;
      unattributedLineCount += row.unattributedItemCount;

      return {
        categoryId: row._id.categoryId,
        categoryName: row._id.categoryName,
        itemsSold: row.itemsSold,
        revenue: row.revenue,
        percentageContribution:
          totalRevenue > 0
            ? Number(((row.revenue / totalRevenue) * 100).toFixed(1))
            : 0,
        quantitySharePercent:
          totalItemsSold > 0
            ? Number(((row.itemsSold / totalItemsSold) * 100).toFixed(1))
            : 0,
        isUnattributedBucket: row._id.categoryName === 'Uncategorized / Historical',
      };
    });

    return {
      range: this.formatRangeMetadata(range),
      summary: {
        totalRevenue,
        totalItemsSold,
        categoryCount: categories.length,
      },
      attributionSummary: {
        snapshotLineCount,
        catalogFallbackLineCount,
        unattributedLineCount,
        hasLegacyCatalogFallback: catalogFallbackLineCount > 0,
        hasUnattributedItems: unattributedLineCount > 0,
      },
      categories,
    };
  }

  async getOrderStatusOverview(query: AnalyticsDateRangeDto) {
    const range = this.resolveDateRange(query.startDate, query.endDate);

    const rows = await this.orderModel
      .aggregate<{
        _id: OrderStatus;
        count: number;
        totalAmount: number;
      }>([
        {
          $match: {
            createdAt: { $gte: range.startUtc, $lt: range.endExclusiveUtc },
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: { $ifNull: ['$total', 0] } },
          },
        },
      ])
      .exec();

    const byStatus = new Map(rows.map((r) => [r._id, r]));
    const totalOrders = rows.reduce((sum, r) => sum + r.count, 0);

    const orderedStatuses: OrderStatus[] = [
      OrderStatus.NEW,
      OrderStatus.ACCEPTED,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
    ];

    const breakdown = orderedStatuses.map((status) => {
      const found = byStatus.get(status);
      const count = found?.count ?? 0;
      const totalAmount = found?.totalAmount ?? 0;
      return {
        status,
        count,
        totalAmount,
        percentage:
          totalOrders > 0
            ? Number(((count / totalOrders) * 100).toFixed(1))
            : 0,
      };
    });

    return {
      range: this.formatRangeMetadata(range),
      totalOrders,
      definitionNote:
        'Operational status counts reflect the current status of all orders created within the selected period.',
      statuses: breakdown,
    };
  }

  async getPeakHours(query: AnalyticsDateRangeDto) {
    const range = this.resolveDateRange(query.startDate, query.endDate);

    const rows = await this.orderModel
      .aggregate<{
        _id: number;
        orders: number;
        completedOrders: number;
        revenue: number;
      }>([
        {
          $match: {
            createdAt: { $gte: range.startUtc, $lt: range.endExclusiveUtc },
          },
        },
        {
          $project: {
            istHour: {
              $hour: {
                date: '$createdAt',
                timezone: BUSINESS_TIMEZONE,
              },
            },
            status: 1,
            total: { $ifNull: ['$total', 0] },
          },
        },
        {
          $group: {
            _id: '$istHour',
            orders: { $sum: 1 },
            completedOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', OrderStatus.COMPLETED] }, 1, 0],
              },
            },
            revenue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', OrderStatus.COMPLETED] },
                  '$total',
                  0,
                ],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const byHour = new Map(rows.map((r) => [r._id, r]));

    const hours = Array.from({ length: 24 }, (_, hour) => {
      const entry = byHour.get(hour);
      const padded = String(hour).padStart(2, '0');
      return {
        hour,
        label: formatHourLabel(hour),
        hourRange: `${padded}:00–${padded}:59`,
        orders: entry?.orders ?? 0,
        completedOrders: entry?.completedOrders ?? 0,
        revenue: entry?.revenue ?? 0,
      };
    });

    const totalOrders = hours.reduce((sum, h) => sum + h.orders, 0);
    const totalRevenue = hours.reduce((sum, h) => sum + h.revenue, 0);

    let busiestHourByOrders: (typeof hours)[number] | null = null;
    let busiestHourByRevenue: (typeof hours)[number] | null = null;

    if (totalOrders > 0) {
      busiestHourByOrders = hours.reduce((best, curr) =>
        curr.orders > best.orders ? curr : best,
      );
    }

    if (totalRevenue > 0) {
      busiestHourByRevenue = hours.reduce((best, curr) =>
        curr.revenue > best.revenue ? curr : best,
      );
    }

    return {
      range: this.formatRangeMetadata(range),
      busiestHourByOrders,
      busiestHourByRevenue,
      hours,
    };
  }

  async getRecentOrders(query: AnalyticsPaginationQueryDto) {
    const range = this.resolveDateRange(query.startDate, query.endDate);
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit =
      query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 10;
    const skip = (page - 1) * limit;

    const aggregated = await this.orderModel
      .aggregate([
        {
          $match: {
            createdAt: { $gte: range.startUtc, $lt: range.endExclusiveUtc },
          },
        },
        {
          $facet: {
            meta: [{ $count: 'total' }],
            data: [
              { $sort: { createdAt: -1 } },
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  _id: 0,
                  id: { $toString: '$_id' },
                  orderNumber: 1,
                  orderDate: 1,
                  tableNumber: 1,
                  status: 1,
                  total: { $ifNull: ['$total', 0] },
                  createdAt: 1,
                  itemCount: {
                    $reduce: {
                      input: { $ifNull: ['$items', []] },
                      initialValue: 0,
                      in: {
                        $add: ['$$value', { $ifNull: ['$$this.quantity', 0] }],
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      ])
      .exec();

    const raw = aggregated?.[0] ?? {};
    const total = raw.meta?.[0]?.total ?? 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const data = (raw.data ?? []).map(
      (row: {
        id: string;
        orderNumber: string;
        orderDate: string;
        tableNumber: number;
        status: OrderStatus;
        total: number;
        createdAt: Date | string;
        itemCount: number;
      }) => ({
        ...row,
        createdAt:
          row.createdAt instanceof Date
            ? row.createdAt.toISOString()
            : row.createdAt,
      }),
    );

    return {
      range: this.formatRangeMetadata(range),
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }
}

