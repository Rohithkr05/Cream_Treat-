'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IndianRupee,
  ShoppingBag,
  UtensilsCrossed,
  Calculator,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { AnalyticsDateFilter } from '@/components/analytics/AnalyticsDateFilter';
import { AnalyticsMetricCard } from '@/components/analytics/AnalyticsMetricCard';
import { SalesChart } from '@/components/analytics/SalesChart';
import { OrderStatusOverview } from '@/components/analytics/OrderStatusOverview';
import { TopSellingItems } from '@/components/analytics/TopSellingItems';
import { LeastSellingItems } from '@/components/analytics/LeastSellingItems';
import { CategoryPerformance } from '@/components/analytics/CategoryPerformance';
import { PeakHoursChart } from '@/components/analytics/PeakHoursChart';
import { RecentSalesTable } from '@/components/analytics/RecentSalesTable';
import {
  adminGetProfile,
  adminLogout,
  fetchAnalyticsCategories,
  fetchAnalyticsLeastSellingItems,
  fetchAnalyticsOrderStatus,
  fetchAnalyticsOverview,
  fetchAnalyticsPeakHours,
  fetchAnalyticsRecentOrders,
  fetchAnalyticsSales,
  fetchAnalyticsTopItems,
  getAdminToken,
  getStoredAdminUser,
} from '@/lib/api';
import { formatRupees, getPresetDateRange } from '@/lib/analytics-utils';
import { AdminUser } from '@/types/admin';
import {
  AnalyticsCategoriesResponse,
  AnalyticsLeastSellingResponse,
  AnalyticsOrderStatusResponse,
  AnalyticsOverviewResponse,
  AnalyticsPeakHoursResponse,
  AnalyticsRecentOrdersResponse,
  AnalyticsSalesResponse,
  AnalyticsTopItemsResponse,
  DateFilterPreset,
  SalesInterval,
} from '@/types/analytics';

interface SectionState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function createInitialSection<T>(): SectionState<T> {
  return { data: null, loading: true, error: null };
}

export default function AdminAnalyticsPage() {
  const router = useRouter();

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Date range & chart/table controls
  const [preset, setPreset] = useState<DateFilterPreset>('last7days');
  const [dateRange, setDateRange] = useState(() =>
    getPresetDateRange('last7days'),
  );
  const [salesInterval, setSalesInterval] = useState<SalesInterval>('day');
  const [topItemsLimit, setTopItemsLimit] = useState<number>(5);
  const [topItemsPage, setTopItemsPage] = useState<number>(1);
  const [leastItemsLimit, setLeastItemsLimit] = useState<number>(5);
  const [leastItemsPage, setLeastItemsPage] = useState<number>(1);
  const [recentOrdersPage, setRecentOrdersPage] = useState<number>(1);

  // Per-section states
  const [overview, setOverview] = useState<
    SectionState<AnalyticsOverviewResponse>
  >(() => createInitialSection());
  const [sales, setSales] = useState<SectionState<AnalyticsSalesResponse>>(() =>
    createInitialSection(),
  );
  const [topItems, setTopItems] = useState<
    SectionState<AnalyticsTopItemsResponse>
  >(() => createInitialSection());
  const [leastItems, setLeastItems] = useState<
    SectionState<AnalyticsLeastSellingResponse>
  >(() => createInitialSection());
  const [categories, setCategories] = useState<
    SectionState<AnalyticsCategoriesResponse>
  >(() => createInitialSection());
  const [orderStatus, setOrderStatus] = useState<
    SectionState<AnalyticsOrderStatusResponse>
  >(() => createInitialSection());
  const [peakHours, setPeakHours] = useState<
    SectionState<AnalyticsPeakHoursResponse>
  >(() => createInitialSection());
  const [recentOrders, setRecentOrders] = useState<
    SectionState<AnalyticsRecentOrdersResponse>
  >(() => createInitialSection());

  const handleUnauthorized = useCallback(() => {
    router.replace('/admin/login');
  }, [router]);

  const toErrorMessage = useCallback(
    (reason: unknown): string => {
      if (reason instanceof Error) {
        if (reason.message === 'Unauthorized') {
          handleUnauthorized();
          return 'Session expired.';
        }
        return reason.message;
      }
      return 'Unable to load analytics data.';
    },
    [handleUnauthorized],
  );

  // Verify Admin Session on Mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const token = getAdminToken();
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const cached = getStoredAdminUser();
      if (cached && isMounted) {
        setAdmin(cached);
      }

      try {
        const verifiedUser = await adminGetProfile(token);
        if (isMounted) {
          setAdmin(verifiedUser);
          setIsAuthChecking(false);
        }
      } catch {
        if (isMounted) {
          router.replace('/admin/login');
        }
      }
    }

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const fetchAllSections = useCallback(
    async (opts: {
      startDate: string;
      endDate: string;
      interval: SalesInterval;
      topLimit: number;
      topPage: number;
      leastLimit: number;
      leastPage: number;
      recentPage: number;
    }) => {
      const rangeParams = {
        startDate: opts.startDate,
        endDate: opts.endDate,
      };

      const results = await Promise.allSettled([
        fetchAnalyticsOverview(rangeParams),
        fetchAnalyticsSales({ ...rangeParams, interval: opts.interval }),
        fetchAnalyticsTopItems({
          ...rangeParams,
          page: opts.topPage,
          limit: opts.topLimit,
        }),
        fetchAnalyticsLeastSellingItems({
          ...rangeParams,
          page: opts.leastPage,
          limit: opts.leastLimit,
        }),
        fetchAnalyticsCategories(rangeParams),
        fetchAnalyticsOrderStatus(rangeParams),
        fetchAnalyticsPeakHours(rangeParams),
        fetchAnalyticsRecentOrders({
          ...rangeParams,
          page: opts.recentPage,
          limit: 10,
        }),
      ]);

      const [
        overviewRes,
        salesRes,
        topRes,
        leastRes,
        categoriesRes,
        statusRes,
        peakRes,
        recentRes,
      ] = results;

      setOverview(
        overviewRes.status === 'fulfilled'
          ? { data: overviewRes.value, loading: false, error: null }
          : { data: null, loading: false, error: toErrorMessage(overviewRes.reason) },
      );
      setSales(
        salesRes.status === 'fulfilled'
          ? { data: salesRes.value, loading: false, error: null }
          : { data: null, loading: false, error: toErrorMessage(salesRes.reason) },
      );
      setTopItems(
        topRes.status === 'fulfilled'
          ? { data: topRes.value, loading: false, error: null }
          : { data: null, loading: false, error: toErrorMessage(topRes.reason) },
      );
      setLeastItems(
        leastRes.status === 'fulfilled'
          ? { data: leastRes.value, loading: false, error: null }
          : { data: null, loading: false, error: toErrorMessage(leastRes.reason) },
      );
      setCategories(
        categoriesRes.status === 'fulfilled'
          ? { data: categoriesRes.value, loading: false, error: null }
          : {
              data: null,
              loading: false,
              error: toErrorMessage(categoriesRes.reason),
            },
      );
      setOrderStatus(
        statusRes.status === 'fulfilled'
          ? { data: statusRes.value, loading: false, error: null }
          : { data: null, loading: false, error: toErrorMessage(statusRes.reason) },
      );
      setPeakHours(
        peakRes.status === 'fulfilled'
          ? { data: peakRes.value, loading: false, error: null }
          : { data: null, loading: false, error: toErrorMessage(peakRes.reason) },
      );
      setRecentOrders(
        recentRes.status === 'fulfilled'
          ? { data: recentRes.value, loading: false, error: null }
          : { data: null, loading: false, error: toErrorMessage(recentRes.reason) },
      );
    },
    [toErrorMessage],
  );

  // Initial load once admin session is verified
  useEffect(() => {
    if (isAuthChecking) return;

    let active = true;
    async function loadInitial() {
      if (!active) return;
      await fetchAllSections({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        interval: salesInterval,
        topLimit: topItemsLimit,
        topPage: topItemsPage,
        leastLimit: leastItemsLimit,
        leastPage: leastItemsPage,
        recentPage: recentOrdersPage,
      });
    }

    void loadInitial();
    return () => {
      active = false;
    };
    // Initial load when auth verification completes; filter handlers trigger subsequent reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthChecking]);

  const markAllLoading = () => {
    setOverview((prev) => ({ ...prev, loading: true, error: null }));
    setSales((prev) => ({ ...prev, loading: true, error: null }));
    setTopItems((prev) => ({ ...prev, loading: true, error: null }));
    setLeastItems((prev) => ({ ...prev, loading: true, error: null }));
    setCategories((prev) => ({ ...prev, loading: true, error: null }));
    setOrderStatus((prev) => ({ ...prev, loading: true, error: null }));
    setPeakHours((prev) => ({ ...prev, loading: true, error: null }));
    setRecentOrders((prev) => ({ ...prev, loading: true, error: null }));
  };

  const applyNewRange = async (
    nextRange: { startDate: string; endDate: string },
    nextPreset: DateFilterPreset,
  ) => {
    setPreset(nextPreset);
    setDateRange(nextRange);
    setTopItemsPage(1);
    setLeastItemsPage(1);
    setRecentOrdersPage(1);
    markAllLoading();
    await fetchAllSections({
      startDate: nextRange.startDate,
      endDate: nextRange.endDate,
      interval: salesInterval,
      topLimit: topItemsLimit,
      topPage: 1,
      leastLimit: leastItemsLimit,
      leastPage: 1,
      recentPage: 1,
    });
  };

  const handleSelectPreset = (
    selected: Exclude<DateFilterPreset, 'custom'>,
  ) => {
    const nextRange = getPresetDateRange(selected);
    void applyNewRange(nextRange, selected);
  };

  const handleApplyCustomRange = (startDate: string, endDate: string) => {
    void applyNewRange({ startDate, endDate }, 'custom');
  };

  const handleRefresh = async () => {
    if (isRefreshing || isAuthChecking) return;
    setIsRefreshing(true);
    markAllLoading();
    try {
      await fetchAllSections({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        interval: salesInterval,
        topLimit: topItemsLimit,
        topPage: topItemsPage,
        leastLimit: leastItemsLimit,
        leastPage: leastItemsPage,
        recentPage: recentOrdersPage,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSalesIntervalChange = async (interval: SalesInterval) => {
    setSalesInterval(interval);
    setSales((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchAnalyticsSales({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        interval,
      });
      setSales({ data, loading: false, error: null });
    } catch (err) {
      setSales({ data: null, loading: false, error: toErrorMessage(err) });
    }
  };

  const handleTopItemsUpdate = async (limit: number, page: number) => {
    setTopItemsLimit(limit);
    setTopItemsPage(page);
    setTopItems((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchAnalyticsTopItems({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit,
        page,
      });
      setTopItems({ data, loading: false, error: null });
    } catch (err) {
      setTopItems({ data: null, loading: false, error: toErrorMessage(err) });
    }
  };

  const handleLeastItemsUpdate = async (limit: number, page: number) => {
    setLeastItemsLimit(limit);
    setLeastItemsPage(page);
    setLeastItems((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchAnalyticsLeastSellingItems({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit,
        page,
      });
      setLeastItems({ data, loading: false, error: null });
    } catch (err) {
      setLeastItems({ data: null, loading: false, error: toErrorMessage(err) });
    }
  };

  const handleRecentOrdersPage = async (page: number) => {
    setRecentOrdersPage(page);
    setRecentOrders((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetchAnalyticsRecentOrders({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        page,
        limit: 10,
      });
      setRecentOrders({ data, loading: false, error: null });
    } catch (err) {
      setRecentOrders({
        data: null,
        loading: false,
        error: toErrorMessage(err),
      });
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await adminLogout();
    } finally {
      router.replace('/admin/login');
    }
  };

  if (isAuthChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FBF7F2] p-4 font-body">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-[#6A0019] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs uppercase tracking-widest text-[#2C1810]/70 font-semibold">
            Verifying Admin Session...
          </p>
        </div>
      </main>
    );
  }

  const metrics = overview.data?.metrics;

  return (
    <AdminLayout
      activeNav="analytics"
      title="Analytics & Sales"
      subtitle="Completed sales performance, item rankings, category mix, and peak hours."
      admin={admin}
      onRefresh={() => void handleRefresh()}
      isRefreshing={isRefreshing}
      onLogout={() => void handleLogout()}
      isLoggingOut={isLoggingOut}
      headerActions={
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#6A0019]/20 text-[#6A0019] text-xs font-semibold hover:bg-[#EFE6DC]/30 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-2xs"
          title="Refresh Analytics"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Top Date Filters */}
        <AnalyticsDateFilter
          preset={preset}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          previousStartDate={overview.data?.range.previousStartDate}
          previousEndDate={overview.data?.range.previousEndDate}
          onSelectPreset={handleSelectPreset}
          onApplyCustomRange={handleApplyCustomRange}
        />

        {/* Overview Error Banner */}
        {overview.error && (
          <div
            role="alert"
            className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{overview.error}</span>
          </div>
        )}

        {/* Row 1: Overview Metric Cards */}
        <section aria-label="Overview Metrics" className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            <AnalyticsMetricCard
              label="Total Sales Revenue"
              subtitle="Completed orders only"
              formattedValue={formatRupees(metrics?.totalSalesRevenue.value ?? 0)}
              comparison={metrics?.totalSalesRevenue}
              formatPreviousValue={formatRupees}
              icon={IndianRupee}
              isLoading={overview.loading}
            />

            <AnalyticsMetricCard
              label="Total Orders"
              subtitle="All statuses created in range"
              formattedValue={String(metrics?.totalOrders.value ?? 0)}
              comparison={metrics?.totalOrders}
              icon={ShoppingBag}
              isLoading={overview.loading}
            />

            <AnalyticsMetricCard
              label="Total Food Items Sold"
              subtitle="Completed order quantities"
              formattedValue={String(metrics?.totalFoodItemsSold.value ?? 0)}
              comparison={metrics?.totalFoodItemsSold}
              icon={UtensilsCrossed}
              isLoading={overview.loading}
            />

            <AnalyticsMetricCard
              label="Average Order Value"
              subtitle="Revenue / completed orders"
              formattedValue={formatRupees(metrics?.averageOrderValue.value ?? 0)}
              comparison={metrics?.averageOrderValue}
              formatPreviousValue={formatRupees}
              icon={Calculator}
              isLoading={overview.loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <AnalyticsMetricCard
              label="Completed Orders"
              subtitle="Fulfilled orders included in revenue"
              formattedValue={String(metrics?.completedOrders.value ?? 0)}
              comparison={metrics?.completedOrders}
              icon={CheckCircle2}
              tone="emerald"
              isLoading={overview.loading}
            />

            <AnalyticsMetricCard
              label="Cancelled Orders"
              subtitle="Excluded from completed revenue"
              formattedValue={String(metrics?.cancelledOrders.value ?? 0)}
              comparison={metrics?.cancelledOrders}
              icon={XCircle}
              tone="rose"
              invertTrendColors
              isLoading={overview.loading}
            />
          </div>
        </section>

        {/* Row 2: Sales Overview Chart & Order Status Overview */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2">
            <SalesChart
              data={sales.data}
              interval={salesInterval}
              onIntervalChange={(next) => void handleSalesIntervalChange(next)}
              isLoading={sales.loading}
              error={sales.error}
            />
          </div>

          <div className="xl:col-span-1">
            <OrderStatusOverview
              data={orderStatus.data}
              isLoading={orderStatus.loading}
              error={orderStatus.error}
            />
          </div>
        </div>

        {/* Row 3: Top Selling Items & Least Selling Items */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <TopSellingItems
            data={topItems.data}
            limit={topItemsLimit}
            page={topItemsPage}
            onLimitChange={(nextLimit) =>
              void handleTopItemsUpdate(nextLimit, 1)
            }
            onPageChange={(nextPage) =>
              void handleTopItemsUpdate(topItemsLimit, nextPage)
            }
            isLoading={topItems.loading}
            error={topItems.error}
          />

          <LeastSellingItems
            data={leastItems.data}
            limit={leastItemsLimit}
            page={leastItemsPage}
            onLimitChange={(nextLimit) =>
              void handleLeastItemsUpdate(nextLimit, 1)
            }
            onPageChange={(nextPage) =>
              void handleLeastItemsUpdate(leastItemsLimit, nextPage)
            }
            isLoading={leastItems.loading}
            error={leastItems.error}
          />
        </div>

        {/* Row 4: Category Performance & Peak Ordering Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <CategoryPerformance
            data={categories.data}
            isLoading={categories.loading}
            error={categories.error}
          />

          <PeakHoursChart
            data={peakHours.data}
            isLoading={peakHours.loading}
            error={peakHours.error}
          />
        </div>

        {/* Bottom: Recent Sales Activity */}
        <RecentSalesTable
          data={recentOrders.data}
          page={recentOrdersPage}
          onPageChange={(nextPage) => void handleRecentOrdersPage(nextPage)}
          isLoading={recentOrders.loading}
          error={recentOrders.error}
        />
      </div>
    </AdminLayout>
  );
}

