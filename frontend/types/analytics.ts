import { OrderStatus } from './menu';

export type SalesInterval = 'day' | 'week' | 'month';

export type DateFilterPreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'custom';

export interface AnalyticsRangeMeta {
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
  daysCount: number;
  timezone: string;
}

export interface AnalyticsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface OverviewMetricComparison {
  value: number;
  previousValue: number;
  changePercent: number | null;
  hasComparison: boolean;
  trend: 'up' | 'down' | 'flat' | 'unavailable';
}

export interface AnalyticsOverviewResponse {
  range: AnalyticsRangeMeta;
  hasPreviousPeriodData: boolean;
  metrics: {
    totalSalesRevenue: OverviewMetricComparison;
    totalOrders: OverviewMetricComparison;
    totalFoodItemsSold: OverviewMetricComparison;
    averageOrderValue: OverviewMetricComparison;
    completedOrders: OverviewMetricComparison;
    cancelledOrders: OverviewMetricComparison;
  };
}

export interface SalesTrendPoint {
  bucket: string;
  label: string;
  revenue: number;
  orders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface AnalyticsSalesResponse {
  range: AnalyticsRangeMeta;
  interval: SalesInterval;
  totals: {
    revenue: number;
    orders: number;
  };
  series: SalesTrendPoint[];
}

export interface TopSellingItemRow {
  rank: number;
  foodItemId: string | null;
  name: string;
  imageUrl: string;
  isAvailable: boolean | null;
  catalogExists: boolean;
  quantitySold: number;
  revenue: number;
  percentageContribution: number;
  quantitySharePercent: number;
}

export interface AnalyticsTopItemsResponse {
  range: AnalyticsRangeMeta;
  summary: {
    totalQuantitySold: number;
    totalItemRevenue: number;
    uniqueItemCount: number;
  };
  items: TopSellingItemRow[];
  pagination: AnalyticsPagination;
}

export interface LeastSellingItemRow {
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
}

export interface UnavailableItemRow {
  foodItemId: string;
  name: string;
  categoryName: string;
  imageUrl: string;
  quantitySold: number;
  revenue: number;
  itemAvailable: boolean;
  categoryActive: boolean;
}

export interface AnalyticsLeastSellingResponse {
  range: AnalyticsRangeMeta;
  summary: {
    rankedItemCount: number;
    zeroSalesCount: number;
    unavailableCount: number;
  };
  items: LeastSellingItemRow[];
  unavailableItems: UnavailableItemRow[];
  pagination: AnalyticsPagination;
  limitationNote: string;
}

export interface CategoryPerformanceRow {
  categoryId: string | null;
  categoryName: string;
  itemsSold: number;
  revenue: number;
  percentageContribution: number;
  quantitySharePercent: number;
  isUnattributedBucket: boolean;
}

export interface AnalyticsCategoriesResponse {
  range: AnalyticsRangeMeta;
  summary: {
    totalRevenue: number;
    totalItemsSold: number;
    categoryCount: number;
  };
  attributionSummary: {
    snapshotLineCount: number;
    catalogFallbackLineCount: number;
    unattributedLineCount: number;
    hasLegacyCatalogFallback: boolean;
    hasUnattributedItems: boolean;
  };
  categories: CategoryPerformanceRow[];
}

export interface OrderStatusBreakdownRow {
  status: OrderStatus;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface AnalyticsOrderStatusResponse {
  range: AnalyticsRangeMeta;
  totalOrders: number;
  definitionNote: string;
  statuses: OrderStatusBreakdownRow[];
}

export interface PeakHourRow {
  hour: number;
  label: string;
  hourRange: string;
  orders: number;
  completedOrders: number;
  revenue: number;
}

export interface AnalyticsPeakHoursResponse {
  range: AnalyticsRangeMeta;
  busiestHourByOrders: PeakHourRow | null;
  busiestHourByRevenue: PeakHourRow | null;
  hours: PeakHourRow[];
}

export interface RecentSalesOrderRow {
  id: string;
  orderNumber: string;
  orderDate: string;
  tableNumber: number;
  status: OrderStatus;
  total: number;
  createdAt: string;
  itemCount: number;
}

export interface AnalyticsRecentOrdersResponse {
  range: AnalyticsRangeMeta;
  data: RecentSalesOrderRow[];
  pagination: AnalyticsPagination;
}

