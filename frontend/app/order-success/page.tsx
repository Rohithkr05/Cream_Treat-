'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Hash,
  RefreshCw,
  Check,
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
    description: 'Your order has been received by the café counter.',
  },
  {
    status: 'ACCEPTED',
    title: 'Order Accepted',
    description: 'The café has accepted your order and is preparing your treats.',
  },
];

const STATUS_ORDER: Record<OrderStatus, number> = {
  NEW: 0,
  ACCEPTED: 1,
  PREPARING: 1,
  READY: 1,
  COMPLETED: 1,
  CANCELLED: -1,
};

function OrderTrackingSkeleton() {
  return (
    <div className="min-h-screen bg-[#FBF7F2] flex flex-col font-body">
      <header className="sticky top-0 z-30 bg-[#6A0019] text-[#EFE6DC] border-b border-[#EFE6DC]/20">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="h-4 w-28 bg-[#EFE6DC]/20 rounded-md animate-pulse" />
          <div className="h-4 w-16 bg-[#EFE6DC]/20 rounded-full animate-pulse" />
        </div>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 pb-20 space-y-4">
        <div className="bg-[#EFE6DC]/40 rounded-3xl p-6 border border-[#6A0019]/15 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#6A0019]/10 animate-pulse mb-4" />
          <div className="h-4 w-24 bg-[#6A0019]/10 rounded animate-pulse mb-2" />
          <div className="h-8 w-36 bg-[#6A0019]/20 rounded animate-pulse mb-3" />
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
        if (!isBackground) {
          const msg =
            err instanceof Error ? err.message : 'Unable to load order status.';
          setErrorMessage(msg);
          if (msg.includes('Invalid') || msg.includes('ObjectId')) {
            setErrorType('invalid');
          } else if (msg.includes('not found') || msg.includes('404')) {
            setErrorType('notFound');
          } else {
            setErrorType('network');
          }
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [orderId],
  );

  // Initial load
  useEffect(() => {
    fetchOrder(false);
  }, [fetchOrder]);

  // Polling fallback
  useEffect(() => {
    if (
      !orderId ||
      errorType === 'missing' ||
      errorType === 'invalid' ||
      errorType === 'notFound' ||
      order?.status === 'COMPLETED' ||
      order?.status === 'CANCELLED'
    ) {
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

    if (order?.status === 'COMPLETED' || order?.status === 'CANCELLED') {
      return;
    }

    const socket = createOrderSocket();

    socket.on('connect', () => {
      socket.emit('subscribe_order', { orderId });
    });

    socket.on('order.status.updated', (event: OrderStatusUpdatedSocketEvent) => {
      if (event.id === orderId) {
        setOrder((prev) => {
          if (!prev) return prev;
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

        if (event.status === 'COMPLETED' || event.status === 'CANCELLED') {
          socket.emit('unsubscribe_order', { orderId });
          socket.disconnect();
        }
      }
    });

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

  const handleManualRefresh = () => {
    if (isRefreshing) return;
    fetchOrder(false);
  };

  if (loading && !order) {
    return <OrderTrackingSkeleton />;
  }

  if (errorType || !order) {
    return (
      <div className="min-h-screen bg-[#FBF7F2] text-[#6A0019] flex flex-col justify-center items-center p-6 text-center font-body">
        <div className="w-16 h-16 rounded-2xl bg-[#EFE6DC] text-[#6A0019] flex items-center justify-center mb-4 border border-[#6A0019]/20 shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-display font-bold">Order Not Found</h2>
        <p className="mt-2 text-xs text-[#6A0019]/75 max-w-xs leading-relaxed">
          {errorMessage || 'Unable to locate your order. Please check with café staff.'}
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => fetchOrder(false)}
            className="px-5 py-2.5 bg-[#6A0019] text-[#EFE6DC] rounded-full text-xs font-display uppercase tracking-wider font-bold cursor-pointer"
          >
            Retry
          </button>
          <Link
            href="/order"
            className="px-5 py-2.5 bg-[#EFE6DC] text-[#6A0019] border border-[#6A0019]/25 rounded-full text-xs font-display uppercase tracking-wider font-bold cursor-pointer"
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
  const menuUrl = order.tableNumber ? `/order?table=${order.tableNumber}` : '/order';

  return (
    <div className="min-h-screen bg-[#FBF7F2] text-[#6A0019] flex flex-col font-body selection:bg-[#6A0019] selection:text-[#EFE6DC]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#6A0019] text-[#EFE6DC] border-b border-[#EFE6DC]/20 shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#EFE6DC]/30 p-0.5 bg-[#EFE6DC]">
              <Image
                src="/images/cream-treat-logo.jpg"
                alt="Cream Treat Logo"
                fill
                sizes="28px"
                className="object-cover rounded-full"
              />
            </div>
            <span className="font-display font-extrabold text-sm tracking-wider uppercase text-[#EFE6DC]">
              Cream Treat
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-1.5 rounded-full hover:bg-white/10 text-[#EFE6DC] transition-colors cursor-pointer"
              title="Refresh order status"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
            <span className="text-[10px] font-display uppercase tracking-widest font-bold px-2.5 py-0.5 rounded-full bg-[#EFE6DC] text-[#6A0019]">
              {order.status}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 pb-20 space-y-4">
        {/* Order Placed Medallion Card */}
        <div className="bg-[#EFE6DC]/40 rounded-3xl p-6 border border-[#6A0019]/20 text-center flex flex-col items-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#6A0019] text-[#EFE6DC] flex items-center justify-center mb-3 shadow-xs">
            <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
          </div>

          <span className="text-[10px] font-display uppercase tracking-[0.25em] font-bold text-[#6A0019]/70">
            Order Placed
          </span>

          <h1 className="text-3xl font-display font-extrabold text-[#6A0019] tracking-tight mt-1">
            {order.displayOrderNumber || order.orderNumber}
          </h1>

          <div className="mt-3 flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#6A0019] text-[#EFE6DC] rounded-full text-xs font-bold font-body shadow-xs">
              <Hash className="w-3.5 h-3.5" />
              <span>Table {order.tableNumber}</span>
            </div>
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#EFE6DC] text-[#6A0019] rounded-full text-xs font-semibold border border-[#6A0019]/25">
              <span>Pay after dining</span>
            </div>
          </div>
        </div>

        {/* Visual Timeline */}
        <div className="bg-[#EFE6DC]/30 rounded-2xl p-5 border border-[#6A0019]/15 space-y-4">
          <div className="flex items-center justify-between border-b border-[#6A0019]/15 pb-2">
            <h2 className="font-display text-xs font-bold text-[#6A0019] uppercase tracking-wider">
              Preparation Progress
            </h2>
            {!isCompleted && !isCancelled && (
              <span className="flex items-center gap-1.5 text-[10px] text-[#6A0019]/70 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6A0019] animate-pulse" />
                Live Updates Active
              </span>
            )}
          </div>

          {isCancelled ? (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs font-body">
              <p className="font-bold">Order Cancelled</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Your order has been cancelled. Please speak with café staff if needed.
              </p>
            </div>
          ) : (
            <div className="py-2 space-y-0">
              {ORDER_TIMELINE.map((step, idx) => {
                const stepIndex = STATUS_ORDER[step.status];
                const isPast = stepIndex < currentStatusIndex;
                const isCurrent = stepIndex === currentStatusIndex;
                const isLast = idx === ORDER_TIMELINE.length - 1;

                return (
                  <div key={step.status} className="relative flex items-start gap-3.5">
                    {!isLast && (
                      <div
                        className={`absolute left-[13px] top-[26px] w-[2px] h-[calc(100%-10px)] transition-colors ${
                          isPast ? 'bg-[#6A0019]' : 'bg-[#6A0019]/20'
                        }`}
                        aria-hidden="true"
                      />
                    )}

                    <div className="relative z-10 shrink-0 mt-0.5">
                      {isPast ? (
                        <div className="w-7 h-7 rounded-full bg-[#6A0019] text-[#EFE6DC] flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : isCurrent ? (
                        <div className="relative flex items-center justify-center">
                          <span className="absolute w-7 h-7 rounded-full bg-[#6A0019]/30 animate-ping" />
                          <div className="w-7 h-7 rounded-full bg-[#6A0019] text-[#EFE6DC] flex items-center justify-center shadow-sm font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-[#EFE6DC]" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#EFE6DC] border border-[#6A0019]/30 text-[#6A0019]/40 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-[#6A0019]/30" />
                        </div>
                      )}
                    </div>

                    <div className={`flex-1 pb-6 ${isLast ? 'pb-1' : ''}`}>
                      <div className="flex items-center gap-2">
                        <p
                          className={`text-xs ${
                            isCurrent
                              ? 'font-display font-bold text-[#6A0019] text-sm'
                              : isPast
                                ? 'font-body font-semibold text-[#6A0019]'
                                : 'font-body font-normal text-[#6A0019]/40'
                          }`}
                        >
                          {step.title}
                        </p>
                        {isCurrent && (
                          <span className="text-[9px] font-display uppercase tracking-widest font-bold text-[#6A0019] bg-[#6A0019]/10 px-2 py-0.5 rounded-full border border-[#6A0019]/20">
                            Current
                          </span>
                        )}
                      </div>

                      {isCurrent && (
                        <div className="mt-1.5 p-2.5 bg-[#FBF7F2] border border-[#6A0019]/15 rounded-xl text-xs text-[#6A0019]/80 font-body leading-relaxed">
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

        {/* Order Breakdown */}
        <div className="bg-[#EFE6DC]/30 rounded-2xl p-5 border border-[#6A0019]/15 space-y-3.5">
          <h2 className="font-display text-xs font-bold text-[#6A0019] uppercase tracking-wider border-b border-[#6A0019]/15 pb-2">
            Items in This Order
          </h2>

          <div className="divide-y divide-[#6A0019]/10">
            {order.items.map((item, idx) => (
              <div
                key={`${item.foodItemId}-${idx}`}
                className="py-2.5 flex items-start justify-between gap-3 text-xs"
              >
                <div className="flex-1">
                  <p className="font-body font-semibold text-[#6A0019]">{item.name}</p>
                  <p className="text-[11px] text-[#6A0019]/60 mt-0.5 font-body">
                    {item.quantity} × {formatCurrency(item.unitPrice)}
                  </p>
                </div>
                <div className="font-body font-bold text-[#6A0019] tabular-nums text-sm">
                  {formatCurrency(item.itemTotal)}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-[#6A0019]/15 flex justify-between items-baseline">
            <span className="font-display text-xs uppercase tracking-widest font-bold text-[#6A0019]">
              Total
            </span>
            <span className="font-body text-xl font-bold text-[#6A0019] tabular-nums">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>

        {/* Back to Menu Action */}
        <div className="pt-2">
          <Link
            href={menuUrl}
            className="w-full py-3.5 px-5 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] rounded-full text-xs font-display uppercase tracking-[0.2em] font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
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
