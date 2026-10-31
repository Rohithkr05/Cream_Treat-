'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminGetProfile,
  adminLogout,
  fetchAdminOrders,
  formatCurrency,
  getAdminToken,
  getStoredAdminUser,
} from '@/lib/api';
import {
  createOrderSocket,
  OrderCreatedSocketEvent,
  OrderStatusUpdatedSocketEvent,
  SocketConnectionState,
} from '@/lib/socket';
import { AdminOrder, AdminOrdersPagination, AdminUser } from '@/types/admin';
import { OrderStatus } from '@/types/menu';

const STATUS_FILTERS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'NEW':
      return {
        label: 'New Order',
        className: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'ACCEPTED':
      return {
        label: 'Accepted',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
        dot: 'bg-blue-500',
      };
    case 'PREPARING':
      return {
        label: 'Preparing',
        className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dot: 'bg-indigo-500',
      };
    case 'READY':
      return {
        label: 'Ready',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        className: 'bg-stone-100 text-stone-700 border-stone-200',
        dot: 'bg-stone-400',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        className: 'bg-red-50 text-red-800 border-red-200',
        dot: 'bg-red-500',
      };
    default:
      return {
        label: status,
        className: 'bg-stone-100 text-stone-700 border-stone-200',
        dot: 'bg-stone-400',
      };
  }
}

function formatOrderTime(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Orders State
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<AdminOrdersPagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [todayDate, setTodayDate] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] =
    useState<SocketConnectionState>('polling-fallback');

  // Initialize service date in useEffect on client mount
  useEffect(() => {
    const today = getTodayDateString();
    setTodayDate(today);
    setFilterDate(today);
  }, []);

  // Summary counts for today's orders
  const [summary, setSummary] = useState({
    todayTotal: 0,
    newCount: 0,
    preparingCount: 0,
    readyCount: 0,
    completedCount: 0,
  });

  // Verify Admin Session on mount
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

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Load orders & summary metrics from backend
  const loadOrdersData = useCallback(
    async (showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoadingOrders(true);
      }
      setErrorMessage(null);

      try {
        const queryParams = {
          page: pagination.page,
          limit: 20,
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          date: filterDate || undefined,
        };

        const res = await fetchAdminOrders(queryParams);
        setOrders(res.data);
        setPagination(res.pagination);

        // Fetch today's orders metrics (for summary cards) if date is today
        const todayStr = getTodayDateString();
        const summaryRes = await fetchAdminOrders({
          date: todayStr,
          limit: 50,
        });

        const todayItems = summaryRes.data;
        setSummary({
          todayTotal: summaryRes.pagination.total,
          newCount: todayItems.filter((o) => o.status === 'NEW').length,
          preparingCount: todayItems.filter((o) => o.status === 'PREPARING').length,
          readyCount: todayItems.filter((o) => o.status === 'READY').length,
          completedCount: todayItems.filter((o) => o.status === 'COMPLETED').length,
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message === 'Unauthorized') {
            router.replace('/admin/login');
            return;
          }
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Unable to load orders.');
        }
      } finally {
        setIsLoadingOrders(false);
        setIsRefreshing(false);
      }
    },
    [filterDate, pagination.page, router, selectedStatus],
  );

  // Trigger load on filter or page changes
  useEffect(() => {
    if (!isAuthChecking) {
      loadOrdersData();
    }
  }, [isAuthChecking, loadOrdersData]);

  // Light auto-refresh interval: 10s conservative polling on active dashboard as fallback
  useEffect(() => {
    if (isAuthChecking) return;

    const intervalId = setInterval(() => {
      // Background silent refresh
      loadOrdersData(false);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isAuthChecking, loadOrdersData]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (isAuthChecking) return;

    const token = getAdminToken();
    if (!token) return;

    const socket = createOrderSocket(token);

    socket.on('connect', () => {
      setSocketStatus('connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('reconnecting');
    });

    socket.on('connect_error', () => {
      setSocketStatus('polling-fallback');
    });

    // Reconcile with REST API on reconnection
    socket.on('reconnect', () => {
      setSocketStatus('connected');
      loadOrdersData(false);
    });

    // Listen for new orders created by customers
    socket.on('order.created', (newOrder: OrderCreatedSocketEvent) => {
      // 1. Avoid duplicate orders if already present in state
      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) {
          return prev;
        }

        // 2. Check if new order satisfies the active filters
        if (filterDate && newOrder.orderDate !== filterDate) {
          return prev;
        }

        if (selectedStatus !== 'ALL' && newOrder.status !== selectedStatus) {
          return prev;
        }

        const mappedOrder: AdminOrder = {
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          orderDate: newOrder.orderDate,
          tableNumber: newOrder.tableNumber,
          items: newOrder.items,
          subtotal: newOrder.subtotal,
          total: newOrder.total,
          status: newOrder.status,
          createdAt: newOrder.createdAt,
          updatedAt: newOrder.updatedAt,
        };

        return [mappedOrder, ...prev];
      });

      // Update pagination total if order satisfied filter
      const matchesFilter =
        (!filterDate || newOrder.orderDate === filterDate) &&
        (selectedStatus === 'ALL' || newOrder.status === selectedStatus);

      if (matchesFilter) {
        setPagination((prev) => ({
          ...prev,
          total: prev.total + 1,
        }));
      }

      // Update summary counts if order is today's
      const todayStr = getTodayDateString();
      if (newOrder.orderDate === todayStr) {
        setSummary((prev) => ({
          ...prev,
          todayTotal: prev.todayTotal + 1,
          newCount: prev.newCount + 1,
        }));
      }
    });

    // Listen for status updates changed by another administrator
    socket.on(
      'order.status.updated',
      (updatedOrder: OrderStatusUpdatedSocketEvent) => {
        setOrders((prev) => {
          const existingIndex = prev.findIndex((o) => o.id === updatedOrder.id);
          if (existingIndex === -1) {
            return prev;
          }

          const existing = prev[existingIndex];

          // Guard against stale events
          if (
            existing.updatedAt &&
            updatedOrder.updatedAt &&
            new Date(updatedOrder.updatedAt) < new Date(existing.updatedAt)
          ) {
            return prev;
          }

          // If current status filter is active and status moved away, remove from list
          if (
            selectedStatus !== 'ALL' &&
            updatedOrder.status !== selectedStatus
          ) {
            return prev.filter((o) => o.id !== updatedOrder.id);
          }

          // Update order in place
          const next = [...prev];
          next[existingIndex] = {
            ...existing,
            status: updatedOrder.status,
            updatedAt: updatedOrder.updatedAt,
            ...(updatedOrder.tableNumber !== undefined
              ? { tableNumber: updatedOrder.tableNumber }
              : {}),
            ...(updatedOrder.total !== undefined
              ? { total: updatedOrder.total }
              : {}),
            ...(updatedOrder.items ? { items: updatedOrder.items } : {}),
          };
          return next;
        });

        // Silently refresh summary counts for today's orders
        const todayStr = getTodayDateString();
        fetchAdminOrders({ date: todayStr, limit: 50 })
          .then((summaryRes) => {
            const todayItems = summaryRes.data;
            setSummary({
              todayTotal: summaryRes.pagination.total,
              newCount: todayItems.filter((o) => o.status === 'NEW').length,
              preparingCount: todayItems.filter(
                (o) => o.status === 'PREPARING',
              ).length,
              readyCount: todayItems.filter((o) => o.status === 'READY')
                .length,
              completedCount: todayItems.filter(
                (o) => o.status === 'COMPLETED',
              ).length,
            });
          })
          .catch(() => {});
      },
    );

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [filterDate, isAuthChecking, loadOrdersData, selectedStatus]);

  const handleManualRefresh = () => {
    if (isRefreshing || isLoadingOrders) return;
    loadOrdersData(true);
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
      <main className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-600">Verifying session...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h1 className="font-bold tracking-tight text-base sm:text-lg text-stone-900 uppercase">
                CREAM TREAT
              </h1>
              <p className="text-[11px] font-medium text-stone-500 -mt-1 hidden sm:block">
                Admin Dashboard
              </p>
            </div>
          </div>

          {/* Simple Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-medium text-stone-600">
            <span className="px-3 py-1 bg-white text-stone-900 rounded-lg shadow-xs font-semibold">
              Dashboard
            </span>
            <span className="px-3 py-1 text-stone-500 hover:text-stone-900 cursor-default">
              Orders
            </span>
            <Link
              href="/admin/menu"
              className="px-3 py-1 text-stone-600 hover:text-stone-900 hover:bg-white/60 rounded-lg transition-colors font-medium"
            >
              Menu
            </Link>
            <Link
              href="/admin/qr"
              className="px-3 py-1 text-stone-600 hover:text-stone-900 hover:bg-white/60 rounded-lg transition-colors font-medium"
            >
              QR Codes
            </Link>
          </nav>

          {/* Right Action Profile & Refresh */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Subtle Connection Status Indicator */}
            <div
              id="socket-connection-indicator"
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                socketStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : socketStatus === 'reconnecting'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-stone-100 text-stone-600 border-stone-200'
              }`}
              title={
                socketStatus === 'connected'
                  ? 'Real-time WebSocket connected'
                  : socketStatus === 'reconnecting'
                    ? 'Reconnecting to real-time server...'
                    : 'Using background polling fallback'
              }
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  socketStatus === 'connected'
                    ? 'bg-emerald-500 animate-pulse'
                    : socketStatus === 'reconnecting'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-stone-400'
                }`}
              />
              <span>
                {socketStatus === 'connected'
                  ? 'Connected'
                  : socketStatus === 'reconnecting'
                    ? 'Reconnecting'
                    : 'Polling fallback'}
              </span>
            </div>

            <button
              type="button"
              id="admin-refresh-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing || isLoadingOrders}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
              title="Refresh order queue"
            >
              <span
                className={`inline-block ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
              >
                ↻
              </span>
              <span className="hidden sm:inline">
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </span>
            </button>

            <div className="hidden lg:block text-right">
              <p className="text-xs font-semibold text-stone-900">
                {admin?.name || 'Administrator'}
              </p>
              <p className="text-[11px] text-stone-500">{admin?.email}</p>
            </div>

            <button
              type="button"
              id="admin-logout-btn"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-3 py-1.5 text-xs font-semibold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition disabled:opacity-50"
            >
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">
              Incoming Orders
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Live customer table orders sorted newest first.
            </p>
          </div>

          {/* Date Selector Filter */}
          <div className="flex items-center gap-2">
            <label htmlFor="order-date-filter" className="text-xs font-medium text-stone-600">
              Service Date:
            </label>
            <input
              id="order-date-filter"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-800 shadow-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
            />
            {todayDate && filterDate !== todayDate && (
              <button
                type="button"
                onClick={() => setFilterDate(todayDate)}
                className="text-xs text-stone-500 hover:text-stone-900 underline underline-offset-2"
              >
                Today
              </button>
            )}
          </div>
        </div>

        {/* Real Summary Cards (Part 12) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
              Today&apos;s Orders
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-stone-900 mt-1 block">
              {summary.todayTotal}
            </span>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block flex items-center justify-between">
              <span>New</span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-amber-900 mt-1 block">
              {summary.newCount}
            </span>
          </div>

          <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block flex items-center justify-between">
              <span>Preparing</span>
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-indigo-900 mt-1 block">
              {summary.preparingCount}
            </span>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block flex items-center justify-between">
              <span>Ready</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-2xl sm:text-3xl font-bold text-emerald-900 mt-1 block">
              {summary.readyCount}
            </span>
          </div>
        </div>

        {/* Status Filter Bar (Part 13) */}
        <div className="bg-white border border-stone-200 rounded-xl p-2 mb-6 shadow-xs flex items-center gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((filter) => {
            const isActive = selectedStatus === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                id={`filter-${filter.value.toLowerCase()}`}
                onClick={() => setSelectedStatus(filter.value)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Error State Banner (Part 22) */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-4"
          >
            <div className="text-xs sm:text-sm text-red-800">
              <strong className="font-semibold">Error: </strong>
              {errorMessage}
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="px-3 py-1 bg-red-800 text-white text-xs font-medium rounded-lg hover:bg-red-900 transition shrink-0"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading Skeleton (Part 20) */}
        {isLoadingOrders ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border border-stone-200 rounded-xl p-4 animate-pulse flex items-center justify-between"
              >
                <div className="space-y-2">
                  <div className="w-24 h-4 bg-stone-200 rounded" />
                  <div className="w-36 h-3 bg-stone-100 rounded" />
                </div>
                <div className="w-20 h-6 bg-stone-200 rounded-lg" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          /* Empty State (Part 21) */
          <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-3 text-stone-400 text-lg">
              🍽️
            </div>
            <h3 className="font-semibold text-stone-900 text-base">
              No orders found
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-1 max-w-sm mx-auto">
              {selectedStatus !== 'ALL'
                ? 'No orders currently match the selected status filter.'
                : filterDate && todayDate && filterDate === todayDate
                ? 'No orders have been placed today.'
                : `No orders recorded for ${filterDate || 'selected date'}.`}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleManualRefresh}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-xl hover:bg-stone-800 transition"
              >
                Refresh Orders
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card View (Part 14) */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {orders.map((order) => {
                const badge = getStatusBadge(order.status);
                const totalItemCount = order.items.reduce(
                  (sum, it) => sum + it.quantity,
                  0,
                );

                return (
                  <div
                    key={order.id}
                    className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-base text-stone-900">
                          {order.orderNumber}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                          Table {order.tableNumber}
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </div>

                    {/* Ordered items preview */}
                    <div className="my-2.5 border-y border-stone-100 py-2 text-xs text-stone-600 space-y-1">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="truncate pr-2">
                            {item.name} × {item.quantity}
                          </span>
                          <span className="font-mono text-stone-500">
                            {formatCurrency(item.itemTotal)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="text-[11px] text-stone-400 italic">
                          +{order.items.length - 3} more items ({totalItemCount} total)
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-xs text-stone-500">Total: </span>
                        <span className="font-bold text-stone-900 font-mono text-sm">
                          {formatCurrency(order.total)}
                        </span>
                        <span className="text-[11px] text-stone-400 ml-2">
                          {formatOrderTime(order.createdAt)}
                        </span>
                      </div>

                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="text-xs font-semibold text-stone-900 hover:text-amber-800 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 transition"
                      >
                        View Order →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (Part 15) */}
            <div className="hidden md:block bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Order</th>
                    <th className="py-3 px-4">Table</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Total</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                  {orders.map((order) => {
                    const badge = getStatusBadge(order.status);
                    const totalItemCount = order.items.reduce(
                      (sum, it) => sum + it.quantity,
                      0,
                    );

                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-stone-50/70 transition"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                          {order.orderNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-stone-800">
                          Table {order.tableNumber}
                        </td>
                        <td className="py-3.5 px-4 text-stone-600 max-w-xs">
                          <span className="font-medium text-stone-900">
                            {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
                          </span>
                          <span className="text-stone-400 mx-1.5">•</span>
                          <span className="truncate">
                            {order.items.map((i) => `${i.name} (${i.quantity})`).join(', ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-stone-500">
                          {formatOrderTime(order.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="inline-block px-3 py-1.5 text-xs font-semibold text-stone-800 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition"
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 text-xs text-stone-500">
                <span>
                  Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                    }
                    className="px-3 py-1 bg-white border border-stone-300 rounded-lg disabled:opacity-50 hover:bg-stone-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                    }
                    className="px-3 py-1 bg-white border border-stone-300 rounded-lg disabled:opacity-50 hover:bg-stone-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
