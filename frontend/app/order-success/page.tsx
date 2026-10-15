'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  UtensilsCrossed,
  ArrowRight,
  AlertCircle,
  Hash,
  RefreshCw,
  Check,
  RotateCcw,
} from 'lucide-react';
import { getOrder, formatCurrency } from '@/lib/api';
import {
  createOrderSocket,
  OrderStatusUpdatedSocketEvent,
} from '@/lib/socket';
import { CustomerOrder, OrderStatus } from '@/types/menu';

interface StatusStepConfig {
  status: OrderStatus;
  title: string;
  description: string;
}

const ORDER_TIMELINE: StatusStepConfig[] = [
  {
    status: 'NEW',
    title: 'Order Received',
    description: 'Your order has been received.',
  },
  {
    status: 'ACCEPTED',
    title: 'Order Accepted',
    description: 'The shop has accepted your order.',
  },
  {
    status: 'PREPARING',
    title: 'Preparing Your Order',
    description: 'Your order is being prepared.',
  },
  {
    status: 'READY',
    title: 'Order Ready',
    description: 'Your order is ready.',
  },
  {
    status: 'COMPLETED',
    title: 'Order Completed',
    description: 'Your order has been completed. Thank you!',
  },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 3,
  COMPLETED: 4,
  CANCELLED: -1,
};

function OrderTrackingSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-stone-200 animate-pulse" />
            <div className="h-4 w-24 bg-stone-200 rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-stone-200 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 pb-20 space-y-4">
        {/* Top Header Card Skeleton */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-2xs text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 animate-pulse mb-4" />
          <div className="h-3 w-20 bg-stone-200 rounded animate-pulse mb-2" />
          <div className="h-8 w-32 bg-stone-200 rounded animate-pulse mb-3" />
          <div className="h-6 w-24 bg-stone-100 rounded-full animate-pulse" />
        </div>

        {/* Timeline Skeleton */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs space-y-4">
          <div className="h-3 w-28 bg-stone-200 rounded animate-pulse" />
          <div className="space-y-4 py-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-stone-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 bg-stone-200 rounded animate-pulse" />
                  <div className="h-2.5 w-44 bg-stone-100 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Items Skeleton */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs space-y-3">
          <div className="h-3 w-24 bg-stone-200 rounded animate-pulse" />
          <div className="divide-y divide-stone-100">
            {[1, 2].map((i) => (
              <div key={i} className="py-2.5 flex justify-between">
                <div className="space-y-1">
                  <div className="h-3 w-28 bg-stone-200 rounded animate-pulse" />
                  <div className="h-2.5 w-16 bg-stone-100 rounded animate-pulse" />
                </div>
                <div className="h-3 w-12 bg-stone-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<
    'missing' | 'invalid' | 'notFound' | 'network' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch customer order
  const fetchOrder = useCallback(
    async (isBackground = false) => {
      if (!orderId) {
        setErrorType('missing');
        setLoading(false);
        return;
      }

      if (!isBackground) {
        setIsRefreshing(true);
      }

      try {
        const data = await getOrder(orderId);
        setOrder(data);
        setErrorType(null);
        setErrorMessage(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        // Only surface full-page error if we have no prior order data loaded
        if (!isBackground || !order) {
          if (msg.includes('Invalid order reference')) {
            setErrorType('invalid');
            setErrorMessage('The order reference provided is invalid.');
          } else if (msg.includes("couldn't find this order")) {
            setErrorType('notFound');
            setErrorMessage("We couldn't find this order.");
          } else {
            setErrorType('network');
            setErrorMessage('Unable to load your order right now.');
          }
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [orderId, order],
  );

  // Initial fetch on mount
  useEffect(() => {
    fetchOrder(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Periodic polling every 5 seconds until COMPLETED or unmounted
  useEffect(() => {
    // Do not poll if missing or permanent not found / invalid error
    if (
      !orderId ||
      errorType === 'missing' ||
      errorType === 'invalid' ||
      errorType === 'notFound'
    ) {
      return;
    }

    // Stop polling if order has reached COMPLETED or CANCELLED status
    if (order?.status === 'COMPLETED' || order?.status === 'CANCELLED') {
      return;
    }

    const intervalId = setInterval(() => {
      fetchOrder(true);
    }, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [orderId, order?.status, errorType, fetchOrder]);

  // Real-time status updates via Socket.IO
  useEffect(() => {
    if (
      !orderId ||
      errorType === 'missing' ||
      errorType === 'invalid' ||
      errorType === 'notFound'
    ) {
      return;
    }

    // Stop real-time connection once order reaches terminal state
    if (order?.status === 'COMPLETED' || order?.status === 'CANCELLED') {
      return;
    }

    const socket = createOrderSocket(); // Customer client (unauthenticated)

    socket.on('connect', () => {
      socket.emit('subscribe_order', { orderId });
    });

    socket.on(
      'order.status.updated',
      (event: OrderStatusUpdatedSocketEvent) => {
        if (event.id === orderId) {
          setOrder((prev) => {
            if (!prev) return prev;

            // Guard against stale event
            if (
              prev.updatedAt &&
              event.updatedAt &&
              new Date(event.updatedAt) < new Date(prev.updatedAt)
            ) {
              return prev;
            }

            return {
              ...prev,
              status: event.status,
              updatedAt: event.updatedAt,
            };
          });

          // Disconnect on terminal state
          if (
            event.status === 'COMPLETED' ||
            event.status === 'CANCELLED'
          ) {
            socket.emit('unsubscribe_order', { orderId });
            socket.disconnect();
          }
        }
      },
    );

    // Reconcile latest state from REST API on reconnect
    socket.on('reconnect', () => {
      fetchOrder(true);
      socket.emit('subscribe_order', { orderId });
    });

    return () => {
      socket.emit('unsubscribe_order', { orderId });
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [errorType, fetchOrder, order?.status, orderId]);

  // Manual refresh click handler
  const handleManualRefresh = () => {
    if (isRefreshing) return;
    fetchOrder(false);
  };

  // Loading skeleton state
  if (loading && !order) {
    return <OrderTrackingSkeleton />;
  }

  // Error States
  if (errorType || !order) {
    let heading = 'Order not found';
    let subtext = 'Please check your order link.';

    if (errorType === 'invalid') {
      heading = 'Invalid order reference';
      subtext = 'The order link or reference provided is not valid.';
    } else if (errorType === 'notFound') {
      heading = "We couldn't find this order.";
      subtext = 'Please check your order link or contact restaurant staff.';
    } else if (errorType === 'network') {
      heading = 'Unable to load your order right now.';
      subtext = errorMessage || 'Please check your internet connection and try again.';
    }

    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80 flex items-center justify-center mb-4 shadow-2xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-stone-900 tracking-tight">
          {heading}
        </h2>
        <p className="mt-1.5 text-xs text-stone-500 max-w-xs leading-relaxed">
          {subtext}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
          {errorType === 'network' && (
            <button
              type="button"
              onClick={() => fetchOrder(false)}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          )}
          <Link
            href="/order"
            className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center"
          >
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  const currentStatusIndex = STATUS_ORDER[order.status] ?? 0;
  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';
  const menuUrl = order.tableNumber
    ? `/order?table=${order.tableNumber}`
    : '/order';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-stone-900 tracking-tight">
              Cream Treat
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 active:scale-95 rounded-lg transition-all disabled:opacity-50"
              title="Refresh order status"
              aria-label="Refresh order status"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`}
              />
            </button>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                isCompleted
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : isCancelled
                    ? 'text-rose-700 bg-rose-50 border-rose-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 pb-20 space-y-4">
        {/* Top Header Card: Order # and Table */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-2xs text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-3 shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <span className="text-[11px] font-bold tracking-widest text-emerald-600 uppercase">
            Order Placed
          </span>

          <h1 className="text-3xl font-black text-stone-900 tracking-tight mt-1">
            {order.displayOrderNumber || order.orderNumber}
          </h1>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1 bg-stone-100 rounded-full text-xs font-bold text-stone-800 border border-stone-200/60">
            <Hash className="w-3.5 h-3.5 text-amber-600" />
            <span>Table {order.tableNumber}</span>
          </div>

          {/* Quick Refresh Status Action */}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-lg transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`}
            />
            <span>{isRefreshing ? 'Updating...' : 'Refresh Status'}</span>
          </button>
        </div>

        {/* ORDER STATUS - Visual Timeline */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
              Order Status
            </h2>
            {!isCompleted && !isCancelled && (
              <span className="flex items-center gap-1.5 text-[10px] text-stone-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Updates Active
              </span>
            )}
          </div>

          {isCancelled ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs">
              <p className="font-bold">Order Cancelled</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Your order has been cancelled. Please contact the shop if you need assistance.
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-0">
              {ORDER_TIMELINE.map((step, idx) => {
                const stepIndex = STATUS_ORDER[step.status];
                const isPast = stepIndex < currentStatusIndex;
                const isCurrent = stepIndex === currentStatusIndex;
                const isFuture = stepIndex > currentStatusIndex;
                const isLast = idx === ORDER_TIMELINE.length - 1;

                return (
                  <div key={step.status} className="relative flex items-start gap-3.5">
                    {/* Vertical connecting line */}
                    {!isLast && (
                      <div
                        className={`absolute left-[13px] top-[26px] w-[2px] h-[calc(100%-10px)] transition-colors ${
                          isPast ? 'bg-emerald-500' : 'bg-stone-200'
                        }`}
                        aria-hidden="true"
                      />
                    )}

                    {/* Step Node Icon / Indicator */}
                    <div className="relative z-10 shrink-0 mt-0.5">
                      {isPast ? (
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="relative flex items-center justify-center">
                          <span className="absolute w-7 h-7 rounded-full bg-amber-400/40 animate-ping" />
                          <div className="w-7 h-7 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-sm font-bold text-xs">
                            <span className="w-2.5 h-2.5 rounded-full bg-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-stone-100 border border-stone-300 text-stone-400 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-stone-300" />
                        </div>
                      )}
                    </div>

                    {/* Step Content */}
                    <div className={`flex-1 pb-6 ${isLast ? 'pb-1' : ''}`}>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs ${
                            isCurrent
                              ? 'font-black text-amber-900 text-sm'
                              : isPast
                                ? 'font-bold text-stone-800'
                                : 'font-medium text-stone-400'
                          }`}
                        >
                          {step.title}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>

                      {/* Explanation for current state */}
                      {isCurrent && (
                        <div className="mt-1.5 p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 font-medium leading-relaxed">
                          {step.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* YOUR ORDER - Items Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-2xs space-y-3.5">
          <h2 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
            Your Order
          </h2>

          <div className="divide-y divide-stone-100">
            {order.items.map((item, idx) => (
              <div
                key={`${item.foodItemId}-${idx}`}
                className="py-2.5 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex-1">
                  <p className="font-bold text-stone-900">{item.name}</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <div className="font-bold text-stone-900 text-sm">
                  {formatCurrency(item.itemTotal)}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="pt-3 border-t border-stone-100 space-y-1.5">
            <div className="flex justify-between text-xs text-stone-600">
              <span>Subtotal</span>
              <span className="font-semibold text-stone-900">
                {formatCurrency(order.subtotal)}
              </span>
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-stone-100">
              <span className="text-sm font-bold text-stone-900">Total</span>
              <span className="text-xl font-black text-stone-900">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Action: Back to Menu */}
        <div className="pt-2">
          <Link
            href={menuUrl}
            className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>Back to Menu</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<OrderTrackingSkeleton />}>
      <OrderSuccessContent />
    </Suspense>
  );
}
