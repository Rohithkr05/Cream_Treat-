'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminGetProfile,
  fetchAdminOrderById,
  formatCurrency,
  getAdminToken,
  updateAdminOrderStatus,
} from '@/lib/api';
import {
  createOrderSocket,
  OrderStatusUpdatedSocketEvent,
} from '@/lib/socket';
import { AdminOrder } from '@/types/admin';
import { OrderStatus } from '@/types/menu';

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
        label: 'Ready for Pickup / Table',
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

function formatOrderDateTime(isoString?: string) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleString([], {
      hour: 'numeric',
      minute: '2-digit',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

function AdminOrderDetailSkeleton() {
  return (
    <main className="min-h-screen bg-stone-100 p-4 sm:p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 space-y-4 animate-pulse">
        <div className="w-24 h-4 bg-stone-200 rounded" />
        <div className="w-48 h-7 bg-stone-200 rounded" />
        <div className="space-y-3 pt-4 border-t border-stone-100">
          <div className="w-full h-12 bg-stone-100 rounded-xl" />
          <div className="w-full h-12 bg-stone-100 rounded-xl" />
        </div>
      </div>
    </main>
  );
}

function AdminOrderDetailContent() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingTarget, setUpdatingTarget] = useState<OrderStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'conflict';
    text: string;
  } | null>(null);

  // Dialog state for confirmation modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetStatus: OrderStatus;
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive: boolean;
  }>({
    isOpen: false,
    targetStatus: 'COMPLETED',
    title: '',
    message: '',
    confirmLabel: '',
    isDestructive: false,
  });

  const loadOrder = async (isSilent = false) => {
    const token = getAdminToken();
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    try {
      await adminGetProfile(token);
    } catch {
      router.replace('/admin/login');
      return;
    }

    if (!orderId) {
      setErrorMessage('Invalid order reference.');
      setIsLoading(false);
      return;
    }

    if (!isSilent) setIsLoading(true);

    try {
      const data = await fetchAdminOrderById(orderId, token);
      setOrder(data);
      setErrorMessage(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'Unauthorized') {
          router.replace('/admin/login');
          return;
        }
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to load order details.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, router]);

  // Real-time updates via Socket.IO for currently open order
  useEffect(() => {
    if (!orderId) return;

    const token = getAdminToken();
    if (!token) return;

    const socket = createOrderSocket(token);

    socket.on(
      'order.status.updated',
      (event: OrderStatusUpdatedSocketEvent) => {
        if (event.id === orderId) {
          setOrder((prev) => {
            if (!prev) return prev;

            // Guard against stale events
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
              ...(event.items ? { items: event.items } : {}),
              ...(event.total !== undefined ? { total: event.total } : {}),
              ...(event.subtotal !== undefined
                ? { subtotal: event.subtotal }
                : {}),
              ...(event.tableNumber !== undefined
                ? { tableNumber: event.tableNumber }
                : {}),
            };
          });
        }
      },
    );

    // Refresh latest state from REST API on socket reconnect
    socket.on('reconnect', () => {
      loadOrder(true);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Execute transition with atomic backend request
  const executeStatusTransition = async (newStatus: OrderStatus) => {
    if (!order || isUpdating) return;

    setIsUpdating(true);
    setUpdatingTarget(newStatus);
    setFeedbackMessage(null);

    try {
      const updated = await updateAdminOrderStatus(order.id, newStatus);
      setOrder(updated);
      setFeedbackMessage({
        type: 'success',
        text: `Order status moved to ${newStatus}.`,
      });
      // Clear success message after 4s
      setTimeout(() => setFeedbackMessage(null), 4000);
    } catch (err: unknown) {
      const isConflict =
        (err as { status?: number }).status === 409 ||
        (err instanceof Error &&
          (err.message.includes('already') ||
            err.message.includes('concurrently') ||
            err.message.includes('Invalid order status transition')));

      if (isConflict) {
        setFeedbackMessage({
          type: 'conflict',
          text:
            'This order was updated by another administrator. Refreshing the latest status...',
        });
        // Reload latest order from database
        await loadOrder(true);
      } else if (err instanceof Error) {
        if (err.message === 'Unauthorized') {
          router.replace('/admin/login');
          return;
        }
        setFeedbackMessage({
          type: 'conflict',
          text: err.message || 'Unable to update status.',
        });
      } else {
        setFeedbackMessage({
          type: 'conflict',
          text: 'Unable to update status. Please try again.',
        });
      }
    } finally {
      setIsUpdating(false);
      setUpdatingTarget(null);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    }
  };

  const handleActionClick = (targetStatus: OrderStatus) => {
    if (!order) return;

    if (targetStatus === 'CANCELLED') {
      setConfirmModal({
        isOpen: true,
        targetStatus: 'CANCELLED',
        title: `Cancel Order ${order.orderNumber}?`,
        message: `Are you sure you want to cancel this order for Table ${order.tableNumber}? This action is terminal and cannot be reversed.`,
        confirmLabel: 'Cancel Order',
        isDestructive: true,
      });
      return;
    }

    if (targetStatus === 'COMPLETED') {
      setConfirmModal({
        isOpen: true,
        targetStatus: 'COMPLETED',
        title: `Complete Order ${order.orderNumber}?`,
        message: `Are you sure you want to mark Order ${order.orderNumber} (Table ${order.tableNumber}) as completed?`,
        confirmLabel: 'Complete Order',
        isDestructive: false,
      });
      return;
    }

    // Direct transition for Accept and Prepare
    executeStatusTransition(targetStatus);
  };

  if (isLoading) {
    return <AdminOrderDetailSkeleton />;
  }

  if (errorMessage || !order) {
    return (
      <main className="min-h-screen bg-stone-100 p-4 sm:p-6 flex items-center justify-center">
        <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-stone-900 mb-1">
            Unable to Load Order
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mb-5">
            {errorMessage || 'Order could not be found.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Link
              href="/admin"
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition"
            >
              ← Back to Orders
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition"
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  const badge = getStatusBadge(order.status);
  const isTerminal = order.status === 'COMPLETED' || order.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      {/* Top Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/admin"
            className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 transition"
          >
            <span>←</span> Back to Orders
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-medium text-stone-500">
              Table {order.tableNumber}
            </span>
            <span className="font-mono text-sm font-bold text-stone-900">
              {order.orderNumber}
            </span>
          </div>
        </div>
      </header>

      {/* Main Order Workspace */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Status Action Banner / Feedback */}
        {feedbackMessage && (
          <div
            role="alert"
            className={`p-4 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-between ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-amber-50 text-amber-900 border-amber-200'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-stone-400 hover:text-stone-700 text-sm ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* ORDER STATUS MANAGEMENT CARD (Phase 11 Core) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-stone-100 pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 block">
                Fulfillment Controls
              </span>
              <h2 className="text-lg font-bold text-stone-900 mt-0.5">
                Order Lifecycle
              </h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.className}`}
            >
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </div>

          {/* Action Trigger Area */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {order.status === 'NEW' && (
              <>
                <button
                  type="button"
                  id="action-accept-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('ACCEPTED')}
                  className="flex-1 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isUpdating && updatingTarget === 'ACCEPTED' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Accepting...</span>
                    </>
                  ) : (
                    'Accept Order'
                  )}
                </button>
                <button
                  type="button"
                  id="action-cancel-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('CANCELLED')}
                  className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition disabled:opacity-60"
                >
                  Cancel Order
                </button>
              </>
            )}

            {order.status === 'ACCEPTED' && (
              <>
                <button
                  type="button"
                  id="action-start-preparing"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('PREPARING')}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isUpdating && updatingTarget === 'PREPARING' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Starting preparation...</span>
                    </>
                  ) : (
                    'Start Preparing'
                  )}
                </button>
                <button
                  type="button"
                  id="action-cancel-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('CANCELLED')}
                  className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition disabled:opacity-60"
                >
                  Cancel Order
                </button>
              </>
            )}

            {order.status === 'PREPARING' && (
              <>
                <button
                  type="button"
                  id="action-mark-ready"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('READY')}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isUpdating && updatingTarget === 'READY' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Marking ready...</span>
                    </>
                  ) : (
                    'Mark Ready'
                  )}
                </button>
                <button
                  type="button"
                  id="action-cancel-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('CANCELLED')}
                  className="py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200 transition disabled:opacity-60"
                >
                  Cancel Order
                </button>
              </>
            )}

            {order.status === 'READY' && (
              <button
                type="button"
                id="action-complete-order"
                disabled={isUpdating}
                onClick={() => handleActionClick('COMPLETED')}
                className="flex-1 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isUpdating && updatingTarget === 'COMPLETED' ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Completing...</span>
                  </>
                ) : (
                  'Complete Order'
                )}
              </button>
            )}

            {order.status === 'COMPLETED' && (
              <div className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-center text-xs text-stone-600 font-medium">
                No further actions available. This order has been successfully fulfilled.
              </div>
            )}

            {order.status === 'CANCELLED' && (
              <div className="w-full p-3.5 bg-red-50 border border-red-200 rounded-xl text-center text-xs text-red-700 font-medium">
                Order cancelled. No further actions available.
              </div>
            )}
          </div>

          {!isTerminal && (
            <p className="text-[11px] text-stone-400 mt-3 text-center sm:text-left">
              Fulfillment actions immediately update the customer live tracking screen via automatic polling.
            </p>
          )}
        </div>

        {/* ORDER SUMMARY & DETAILS CARD */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          {/* Order Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-mono">
                  Order {order.orderNumber}
                </h1>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-900 text-white">
                  Table {order.tableNumber}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1">
                Placed on {formatOrderDateTime(order.createdAt)} • Service Date:{' '}
                <span className="font-mono">{order.orderDate}</span>
              </p>
              {order.updatedAt && order.updatedAt !== order.createdAt && (
                <p className="text-[11px] text-stone-400 mt-0.5">
                  Last updated: {formatOrderDateTime(order.updatedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="py-6 border-b border-stone-100">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-4">
              Ordered Items ({order.items.reduce((s, it) => s + it.quantity, 0)})
            </h2>

            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-100 text-xs sm:text-sm"
                >
                  <div className="pr-4">
                    <p className="font-semibold text-stone-900">{item.name}</p>
                    <p className="text-xs text-stone-500 font-mono mt-0.5">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="font-mono font-bold text-stone-900 text-sm">
                    {formatCurrency(item.itemTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="pt-6 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-stone-600">
              <span>Subtotal</span>
              <span className="font-mono font-medium">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-stone-900 pt-2 border-t border-stone-100">
              <span>Total Bill</span>
              <span className="font-mono text-lg font-extrabold text-stone-900">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* CONFIRMATION DIALOG MODAL (Part 13) */}
      {confirmModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
        >
          <div className="bg-white border border-stone-200 rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-stone-900 mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-stone-600 mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() =>
                  executeStatusTransition(confirmModal.targetStatus)
                }
                className={`px-4 py-2 text-xs font-semibold rounded-xl text-white transition flex items-center gap-1.5 ${
                  confirmModal.isDestructive
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-stone-900 hover:bg-stone-800'
                }`}
              >
                {isUpdating ? 'Updating...' : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrderDetailPage() {
  return (
    <Suspense fallback={<AdminOrderDetailSkeleton />}>
      <AdminOrderDetailContent />
    </Suspense>
  );
}
