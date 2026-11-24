'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  adminGetProfile,
  adminLogout,
  fetchAdminOrders,
  formatCurrency,
  getAdminToken,
  getStoredAdminUser,
  updateAdminOrderStatus,
  generateAdminInvoice,
} from '@/lib/api';
import {
  createOrderSocket,
  OrderCreatedSocketEvent,
  OrderStatusUpdatedSocketEvent,
  SocketConnectionState,
} from '@/lib/socket';
import { AdminOrder, AdminOrdersPagination, AdminUser } from '@/types/admin';
import { OrderStatus } from '@/types/menu';
import { AdminLayout } from '@/components/AdminLayout';
import { TableInvoiceModal } from '@/components/TableInvoiceModal';
import {
  UtensilsCrossed,
  RefreshCw,
  ChefHat,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Hash,
  Check,
  Printer,
} from 'lucide-react';

const STATUS_FILTERS: { label: string; value: OrderStatus | 'ALL' }[] = [
  { label: 'All Orders', value: 'ALL' },
  { label: 'New', value: 'NEW' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

function getStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'NEW':
      return {
        label: 'New Order',
        className: 'bg-[#FDF6E2] text-[#8C5D00] border-[#E8D194]',
        dot: 'bg-[#B8860B]',
      };
    case 'ACCEPTED':
      return {
        label: 'Accepted',
        className: 'bg-[#EEF4FB] text-[#2B5480] border-[#C3D8EF]',
        dot: 'bg-[#3B72A8]',
      };
    case 'PREPARING':
      return {
        label: 'In Kitchen',
        className: 'bg-[#F0EFF8] text-[#4E447A] border-[#D1CEE8]',
        dot: 'bg-[#6B5DA8]',
      };
    case 'READY':
      return {
        label: 'Ready to Serve',
        className: 'bg-[#EEF6EF] text-[#2B6633] border-[#BADBBE]',
        dot: 'bg-[#3B8E47]',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        className: 'bg-[#EFE6DC]/50 text-[#6A0019]/75 border-[#6A0019]/20',
        dot: 'bg-[#6A0019]/40',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        className: 'bg-[#FDF0ED] text-[#9E3524] border-[#F2C2B8]',
        dot: 'bg-[#B83E2A]',
      };
    default:
      return {
        label: status,
        className: 'bg-[#EFE6DC]/40 text-[#2C1810]/70 border-[#6A0019]/15',
        dot: 'bg-[#2C1810]/40',
      };
  }
}

function formatRelativeTime(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const orderTime = new Date(dateStr).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - orderTime) / 1000);

    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
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

// Kitchen Audio Chime for incoming orders
function playKitchenChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.7);
  } catch {
    // Audio autoplay restrictions
  }
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
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketConnectionState>('polling-fallback');

  useEffect(() => {
    const today = getTodayDateString();
    setTodayDate(today);
    setFilterDate(today);
  }, []);

  const [summary, setSummary] = useState({
    todayTotal: 0,
    newCount: 0,
    acceptedCount: 0,
    cancelledCount: 0,
    preparingCount: 0,
    readyCount: 0,
    completedCount: 0,
  });

  // Table Invoice Modal state
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<AdminOrder | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    order: AdminOrder | null;
  }>({
    isOpen: false,
    order: null,
  });

  // Verify Admin Session
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

  // Load orders
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

        const todayStr = getTodayDateString();
        const summaryRes = await fetchAdminOrders({
          date: todayStr,
          limit: 50,
        });

        const todayItems = summaryRes.data;
        setSummary({
          todayTotal: summaryRes.pagination.total,
          newCount: todayItems.filter((o) => o.status === 'NEW').length,
          acceptedCount: todayItems.filter((o) => o.status === 'ACCEPTED').length,
          cancelledCount: todayItems.filter((o) => o.status === 'CANCELLED').length,
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

  useEffect(() => {
    if (!isAuthChecking) {
      loadOrdersData();
    }
  }, [isAuthChecking, loadOrdersData]);

  // Background polling fallback every 10s
  useEffect(() => {
    if (isAuthChecking) return;
    const intervalId = setInterval(() => {
      loadOrdersData(false);
    }, 10000);
    return () => clearInterval(intervalId);
  }, [isAuthChecking, loadOrdersData]);

  // Quick 1-Click Status Advance Handler
  const handleQuickStatus = async (
    orderId: string,
    nextStatus: OrderStatus,
    openInvoiceOnComplete = false,
  ) => {
    try {
      setUpdatingOrderId(orderId);
      const updated = await updateAdminOrderStatus(orderId, nextStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)),
      );
      loadOrdersData(false);

      if (nextStatus === 'COMPLETED') {
        const targetOrder = orders.find((o) => o.id === orderId);
        // Automatically persist into GST Invoices & Billing history
        generateAdminInvoice({
          orderId,
          customerName: `Table ${targetOrder?.tableNumber || 1} Guest`,
        }).catch((err) => {
          if (err?.code !== 'INVOICE_ALREADY_EXISTS') {
            console.warn('Auto invoice recording non-blocking error:', err);
          }
        });

        if (openInvoiceOnComplete && targetOrder) {
          setInvoiceModalOrder({ ...targetOrder, status: 'COMPLETED' });
          setIsInvoiceModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to advance order status', err);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleOpenInvoice = (order: AdminOrder) => {
    setInvoiceModalOrder(order);
    setIsInvoiceModalOpen(true);
  };

  const handleCancelClick = (order: AdminOrder) => {
    setCancelModal({
      isOpen: true,
      order,
    });
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal.order) return;
    const orderId = cancelModal.order.id;
    setCancelModal({ isOpen: false, order: null });
    await handleQuickStatus(orderId, 'CANCELLED');
  };

  // Real-time WebSocket Gateway connection
  useEffect(() => {
    if (isAuthChecking) return;

    const socket = createOrderSocket();

    socket.on('connect', () => {
      setSocketStatus('connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('reconnecting');
    });

    socket.on('order.created', (newOrder: OrderCreatedSocketEvent) => {
      playKitchenChime();

      setOrders((prev) => {
        if (prev.some((o) => o.id === newOrder.id)) {
          return prev;
        }

        const mappedOrder: AdminOrder = {
          id: newOrder.id,
          orderNumber: newOrder.orderNumber,
          orderDate: newOrder.orderDate,
          tableNumber: newOrder.tableNumber,
          status: newOrder.status,
          items: newOrder.items || [],
          subtotal: newOrder.subtotal,
          total: newOrder.total,
          createdAt: newOrder.createdAt,
          updatedAt: newOrder.updatedAt,
        };

        return [mappedOrder, ...prev];
      });

      const todayStr = getTodayDateString();
      if (newOrder.orderDate === todayStr) {
        setSummary((prev) => ({
          ...prev,
          todayTotal: prev.todayTotal + 1,
          newCount: prev.newCount + 1,
        }));
      }
    });

    socket.on('order.status.updated', (updatedOrder: OrderStatusUpdatedSocketEvent) => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === updatedOrder.id
            ? {
                ...o,
                status: updatedOrder.status,
                updatedAt: updatedOrder.updatedAt,
              }
            : o,
        ),
      );
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [isAuthChecking]);

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

  return (
    <AdminLayout
      activeNav="orders"
      title="Live Orders"
      subtitle="Incoming table orders and real-time kitchen status progression."
      admin={admin}
      socketStatus={socketStatus}
      onRefresh={handleManualRefresh}
      isRefreshing={isRefreshing}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
      headerActions={
        <button
          type="button"
          onClick={handleManualRefresh}
          disabled={isRefreshing || isLoadingOrders}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#6A0019]/20 text-[#6A0019] text-xs font-semibold hover:bg-[#EFE6DC]/30 active:scale-95 transition disabled:opacity-50 cursor-pointer shadow-2xs"
          title="Refresh Orders"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. Concise Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white border border-[#6A0019]/15 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-xs text-[#2C1810]/70 font-medium">
              <span>Today's Total</span>
              <span className="font-mono text-[10px] uppercase tracking-wider">All</span>
            </div>
            <p className="font-display text-2xl font-bold text-[#6A0019] mt-1 tabular-nums">
              {summary.todayTotal}
            </p>
          </div>

          <div className="bg-[#FDF6E2] border border-[#E8D194] rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-[#8C5D00] text-xs font-bold">
              <span>New Incoming</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B]" />
            </div>
            <p className="font-display text-2xl font-bold text-[#8C5D00] mt-1 tabular-nums">
              {summary.newCount}
            </p>
          </div>

          <div className="bg-[#EEF4FB] border border-[#C3D8EF] rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-[#2B5480] text-xs font-bold">
              <span>Accepted (In Prep)</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B72A8]" />
            </div>
            <p className="font-display text-2xl font-bold text-[#2B5480] mt-1 tabular-nums">
              {summary.acceptedCount + summary.preparingCount + summary.readyCount}
            </p>
          </div>

          <div className="bg-[#EEF6EF] border border-[#BADBBE] rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between text-[#2B6633] text-xs font-bold">
              <span>Completed</span>
              <CheckCircle2 className="w-4 h-4 text-[#2B6633]" />
            </div>
            <p className="font-display text-2xl font-bold text-[#2B6633] mt-1 tabular-nums">
              {summary.completedCount}
            </p>
          </div>
        </div>

        {/* 2. Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {STATUS_FILTERS.map((filter) => {
            const isSelected = selectedStatus === filter.value;
            let filterCount = 0;
            if (filter.value === 'ALL') filterCount = summary.todayTotal;
            else if (filter.value === 'NEW') filterCount = summary.newCount;
            else if (filter.value === 'ACCEPTED') filterCount = summary.acceptedCount + summary.preparingCount + summary.readyCount;
            else if (filter.value === 'COMPLETED') filterCount = summary.completedCount;
            else if (filter.value === 'CANCELLED') filterCount = summary.cancelledCount;

            return (
              <button
                key={filter.value}
                onClick={() => setSelectedStatus(filter.value)}
                className={`shrink-0 min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#6A0019] text-[#EFE6DC] shadow-xs'
                    : 'bg-white text-[#2C1810]/75 border border-[#6A0019]/15 hover:bg-[#EFE6DC]/30 hover:text-[#6A0019]'
                }`}
              >
                <span>{filter.label}</span>
                {filterCount > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-bold ${
                      isSelected
                        ? 'bg-[#EFE6DC]/20 text-[#EFE6DC]'
                        : 'bg-[#6A0019]/10 text-[#6A0019]'
                    }`}
                  >
                    {filterCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Orders Listing */}
        {isLoadingOrders ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-[#6A0019]/15 rounded-2xl p-5 animate-pulse flex justify-between"
              >
                <div className="space-y-2">
                  <div className="w-28 h-5 bg-[#6A0019]/10 rounded-lg" />
                  <div className="w-44 h-4 bg-[#6A0019]/5 rounded" />
                </div>
                <div className="w-24 h-8 bg-[#6A0019]/10 rounded-xl" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white border border-[#6A0019]/15 rounded-2xl p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-[#EFE6DC]/40 text-[#6A0019] flex items-center justify-center mx-auto mb-3">
              <UtensilsCrossed className="w-6 h-6 stroke-[1.8]" />
            </div>
            <h3 className="font-display font-bold text-[#6A0019] text-base">
              No orders found
            </h3>
            <p className="text-xs text-[#2C1810]/60 mt-1 max-w-sm mx-auto font-body">
              {selectedStatus !== 'ALL'
                ? `There are currently no orders with status "${selectedStatus}".`
                : 'Customer orders placed by scanning dining table QR codes will appear here in real time.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {orders.map((order) => {
              const badge = getStatusBadge(order.status);
              const isUpdatingThis = updatingOrderId === order.id;
              const isNew = order.status === 'NEW';

              return (
                <div
                  key={order.id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 ${
                    isNew
                      ? 'border-[#E8D194] bg-[#FDFBF7] ring-2 ring-[#B8860B]/25'
                      : 'border-[#6A0019]/15 hover:border-[#6A0019]/30'
                  }`}
                >
                  <div>
                    {/* Top Order Row: High-Visibility Table Badge */}
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2.5">
                        {/* Prominent Burgundy Table Badge */}
                        <div className="px-3.5 py-1.5 rounded-xl bg-[#6A0019] text-[#EFE6DC] font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                          <Hash className="w-3.5 h-3.5" />
                          <span>Table {order.tableNumber}</span>
                        </div>

                        <span className="font-mono text-xs font-bold text-[#2C1810]/60">
                          {order.orderNumber}
                        </span>
                      </div>

                      {/* Status Chip */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.className}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    {/* Ordered Items List */}
                    <div className="border-t border-[#6A0019]/10 pt-3 pb-1 space-y-2">
                      {order.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-baseline text-xs font-body"
                        >
                          <span className="font-medium text-[#2C1810] pr-2">
                            <span className="font-bold text-[#6A0019] mr-1.5 font-mono">
                              {it.quantity}×
                            </span>
                            {it.name}
                          </span>
                          <span className="font-mono font-medium text-[#2C1810]/70 tabular-nums shrink-0">
                            {formatCurrency(it.itemTotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Section with 1-Click Status Progression */}
                  <div className="border-t border-[#6A0019]/10 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] text-[#2C1810]/60 uppercase tracking-wider font-semibold">
                        Total:
                      </span>
                      <span className="font-bold text-[#6A0019] font-mono text-base tabular-nums">
                        {formatCurrency(order.total)}
                      </span>
                      <span className="text-[11px] text-[#2C1810]/50 font-body ml-1">
                        · {formatRelativeTime(order.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* NEW -> Accept Order */}
                      {order.status === 'NEW' && (
                        <button
                          type="button"
                          disabled={isUpdatingThis}
                          onClick={() => handleQuickStatus(order.id, 'ACCEPTED')}
                          className="w-full sm:w-auto min-h-[40px] px-4 py-2 bg-[#6A0019] hover:bg-[#520013] active:scale-95 text-[#EFE6DC] font-display text-xs uppercase tracking-wider font-bold rounded-xl transition shadow-2xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          {isUpdatingThis ? (
                            <>
                              <span className="w-3.5 h-3.5 border-2 border-[#EFE6DC] border-t-transparent rounded-full animate-spin" />
                              <span>Accepting...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Accept Order</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* ACCEPTED (or PREPARING/READY) -> 1-Click Complete & Print Bill */}
                      {(order.status === 'ACCEPTED' ||
                        order.status === 'PREPARING' ||
                        order.status === 'READY') && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <button
                            type="button"
                            disabled={isUpdatingThis}
                            onClick={() => handleQuickStatus(order.id, 'COMPLETED', true)}
                            className="min-h-[40px] px-3 sm:px-4 py-2 bg-[#6A0019] hover:bg-[#520013] active:scale-95 text-[#EFE6DC] font-display text-xs uppercase tracking-wider font-bold rounded-xl transition shadow-2xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                            title="Preparation complete: Mark order completed and print invoice"
                          >
                            {isUpdatingThis ? (
                              <>
                                <span className="w-3.5 h-3.5 border-2 border-[#EFE6DC] border-t-transparent rounded-full animate-spin" />
                                <span>Completing...</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>Complete Order</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenInvoice(order)}
                            className="px-3 py-1.5 bg-white hover:bg-[#EFE6DC]/40 border border-[#6A0019]/25 text-[#6A0019] text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                            title="Print bill for Table"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print</span>
                          </button>
                        </div>
                      )}

                      {/* COMPLETED Badge + Print button */}
                      {order.status === 'COMPLETED' && (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold font-body">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Completed</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenInvoice(order)}
                            className="px-3 py-1.5 bg-[#6A0019] hover:bg-[#520013] active:scale-95 text-[#EFE6DC] text-xs font-semibold rounded-xl transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                            title="Print customer invoice for this completed order"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print</span>
                          </button>
                        </div>
                      )}

                      {/* Cancelled Status Badge */}
                      {order.status === 'CANCELLED' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FDF0ED] text-[#9E3524] border border-[#F2C2B8] text-xs font-bold font-body">
                          <span>Cancelled</span>
                        </span>
                      )}

                      {/* Cancel Order Action */}
                      {(order.status === 'NEW' || order.status === 'ACCEPTED' || order.status === 'PREPARING') && (
                        <button
                          type="button"
                          disabled={isUpdatingThis}
                          onClick={() => handleCancelClick(order)}
                          className="px-3 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-rose-200/80 rounded-xl transition cursor-pointer text-center whitespace-nowrap disabled:opacity-50"
                          title="Cancel this order"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Order Confirmation Modal */}
      {cancelModal.isOpen && cancelModal.order && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C1810]/40 backdrop-blur-xs"
        >
          <div className="bg-[#FBF7F2] border border-[#E8DFD8] rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95 font-body">
            <h3 className="text-base font-bold text-[#2C1810] mb-2 font-display">
              Cancel Order #{cancelModal.order.orderNumber}?
            </h3>
            <p className="text-xs text-[#2C1810]/70 mb-6 leading-relaxed">
              Are you sure you want to cancel the order for{' '}
              <span className="font-bold text-[#6A0019]">Table {cancelModal.order.tableNumber}</span>?
              This will mark the order as cancelled on the customer screen.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={Boolean(updatingOrderId)}
                onClick={() => setCancelModal({ isOpen: false, order: null })}
                className="px-4 py-2 text-xs font-semibold text-[#2C1810] bg-white border border-[#E8DFD8] hover:bg-[#EFE6DC]/50 rounded-xl transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={Boolean(updatingOrderId)}
                onClick={handleConfirmCancel}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-700 hover:bg-rose-800 transition cursor-pointer flex items-center gap-1.5"
              >
                {updatingOrderId ? 'Cancelling...' : 'Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Dine-In Invoice / Bill Modal */}
      <TableInvoiceModal
        order={invoiceModalOrder}
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setInvoiceModalOrder(null);
        }}
      />
    </AdminLayout>
  );
}
