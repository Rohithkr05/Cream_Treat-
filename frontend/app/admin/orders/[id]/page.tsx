'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, ReceiptText, Printer, Download, Eye, FilePlus, ChefHat, CheckCircle2 } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  adminGetProfile,
  fetchAdminOrderById,
  formatCurrency,
  getAdminToken,
  updateAdminOrderStatus,
  Invoice,
  fetchAdminInvoiceByOrderId,
  downloadAdminInvoicePdf,
} from '@/lib/api';
import { InvoiceModal } from '@/components/InvoiceModal';
import { GenerateInvoiceModal } from '@/components/GenerateInvoiceModal';
import { GstSettingsModal } from '@/components/GstSettingsModal';
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
        className: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
        dot: 'bg-[#D97706]',
      };
    case 'ACCEPTED':
      return {
        label: 'Accepted',
        className: 'bg-[#DBEAFE] text-[#1E40AF] border-[#BFDBFE]',
        dot: 'bg-[#2563EB]',
      };
    case 'PREPARING':
      return {
        label: 'Preparing',
        className: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]',
        dot: 'bg-[#7C3AED]',
      };
    case 'READY':
      return {
        label: 'Ready for Table',
        className: 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]',
        dot: 'bg-[#059669]',
      };
    case 'COMPLETED':
      return {
        label: 'Completed',
        className: 'bg-[#F5F5F4] text-[#57534E] border-[#E7E5E4]',
        dot: 'bg-[#78716C]',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        className: 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]',
        dot: 'bg-[#DC2626]',
      };
    default:
      return {
        label: status,
        className: 'bg-[#F5F5F4] text-[#57534E] border-[#E7E5E4]',
        dot: 'bg-[#78716C]',
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
    <AdminLayout
      activeNav="orders"
      title="Order Details"
      subtitle="Loading order ticket..."
    >
      <div className="max-w-3xl space-y-6">
        <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 sm:p-8 space-y-4 animate-pulse">
          <div className="w-24 h-4 bg-[#E8DFD8] rounded" />
          <div className="w-48 h-7 bg-[#E8DFD8] rounded" />
          <div className="space-y-3 pt-4 border-t border-[#E8DFD8]">
            <div className="w-full h-12 bg-[#FBF7F2] rounded-xl" />
            <div className="w-full h-12 bg-[#FBF7F2] rounded-xl" />
          </div>
        </div>
      </div>
    </AdminLayout>
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

  // Invoice management states
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [previewDraft, setPreviewDraft] = useState<any>(null);

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

      // Load associated invoice if already generated
      try {
        const inv = await fetchAdminInvoiceByOrderId(orderId, token);
        setInvoice(inv);
      } catch {
        // Non-blocking
      }
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
      <AdminLayout
        activeNav="orders"
        title="Order Details"
        subtitle="Receipt lookup error"
      >
        <div className="max-w-md mx-auto bg-white border border-[#E8DFD8] rounded-2xl p-6 sm:p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#991B1B] flex items-center justify-center mx-auto mb-3 text-lg font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-[#2C1810] mb-1 font-['Syne',sans-serif]">
            Unable to Load Order
          </h2>
          <p className="text-xs sm:text-sm text-[#735A4C] mb-5">
            {errorMessage || 'Order could not be found.'}
          </p>
          <div className="flex gap-2 justify-center">
            <Link
              href="/admin"
              className="px-4 py-2.5 bg-[#EFE6DC] hover:bg-[#E2D5C7] text-[#2C1810] text-xs font-semibold rounded-xl transition"
            >
              ← Back to Live Orders
            </Link>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-semibold rounded-xl transition"
            >
              Retry
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const badge = getStatusBadge(order.status);
  const isTerminal = order.status === 'COMPLETED' || order.status === 'CANCELLED';

  const backAction = (
    <Link
      href="/admin"
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E8DFD8] bg-white hover:bg-[#FBF7F2] text-[#6A0019] text-xs font-semibold transition"
    >
      <span>←</span> Back to Live Orders
    </Link>
  );

  return (
    <AdminLayout
      activeNav="orders"
      title={`Order ${order.orderNumber}`}
      subtitle={`Table ${order.tableNumber} · Placed ${formatOrderDateTime(order.createdAt)}`}
      headerActions={backAction}
    >
      <div className="max-w-3xl space-y-6">
        {/* Status Action Banner / Feedback */}
        {feedbackMessage && (
          <div
            role="alert"
            className={`p-4 rounded-xl text-xs sm:text-sm font-medium border flex items-center justify-between transition-all ${
              feedbackMessage.type === 'success'
                ? 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]'
                : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
            }`}
          >
            <span>{feedbackMessage.text}</span>
            <button
              type="button"
              onClick={() => setFeedbackMessage(null)}
              className="text-[#735A4C] hover:text-[#2C1810] text-sm ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ORDER STATUS MANAGEMENT CARD */}
        <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5 border-b border-[#E8DFD8]/60 pb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#735A4C] block">
                Counter Fulfillment
              </span>
              <h2 className="text-base font-bold text-[#2C1810] mt-0.5 font-['Syne',sans-serif]">
                Order Status Controls
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
                  className="flex-1 py-3 px-4 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUpdating && updatingTarget === 'ACCEPTED' ? (
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
                <button
                  type="button"
                  id="action-cancel-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('CANCELLED')}
                  className="py-3 px-4 bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#991B1B] text-xs font-bold rounded-xl border border-[#FECACA] transition disabled:opacity-60 cursor-pointer"
                >
                  Cancel Order
                </button>
              </>
            )}

            {order.status === 'ACCEPTED' && (
              <>
                <button
                  type="button"
                  id="action-prepare-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('PREPARING')}
                  className="flex-1 py-3 px-4 bg-[#4E447A] hover:bg-[#3C3361] text-[#EFE6DC] text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUpdating && updatingTarget === 'PREPARING' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#EFE6DC] border-t-transparent rounded-full animate-spin" />
                      <span>Sending to Kitchen...</span>
                    </>
                  ) : (
                    <>
                      <ChefHat className="w-4 h-4" />
                      <span>Send to Kitchen (Start Preparing)</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  id="action-cancel-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('CANCELLED')}
                  className="py-3 px-4 bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#991B1B] text-xs font-bold rounded-xl border border-[#FECACA] transition disabled:opacity-60 cursor-pointer"
                >
                  Cancel Order
                </button>
              </>
            )}

            {order.status === 'PREPARING' && (
              <>
                <button
                  type="button"
                  id="action-ready-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('READY')}
                  className="flex-1 py-3 px-4 bg-[#2B6633] hover:bg-[#1E4D25] text-[#EFE6DC] text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUpdating && updatingTarget === 'READY' ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-[#EFE6DC] border-t-transparent rounded-full animate-spin" />
                      <span>Marking Ready...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Mark Ready for Table</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  id="action-cancel-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('CANCELLED')}
                  className="py-3 px-4 bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#991B1B] text-xs font-bold rounded-xl border border-[#FECACA] transition disabled:opacity-60 cursor-pointer"
                >
                  Cancel Order
                </button>
              </>
            )}

            {order.status === 'READY' && (
              <>
                <button
                  type="button"
                  id="action-complete-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('COMPLETED')}
                  className="flex-1 py-3 px-4 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-bold rounded-xl transition shadow-xs disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isUpdating && updatingTarget === 'COMPLETED' ? (
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
                  id="action-cancel-order"
                  disabled={isUpdating}
                  onClick={() => handleActionClick('CANCELLED')}
                  className="py-3 px-4 bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#991B1B] text-xs font-bold rounded-xl border border-[#FECACA] transition disabled:opacity-60 cursor-pointer"
                >
                  Cancel Order
                </button>
              </>
            )}

            {order.status === 'COMPLETED' && (
              <div className="w-full p-3.5 bg-[#EFE6DC]/50 border border-[#6A0019]/20 rounded-xl text-center text-xs text-[#6A0019] font-bold flex items-center justify-center gap-2">
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Order Completed & Served.</span>
              </div>
            )}

            {order.status === 'CANCELLED' && (
              <div className="w-full p-3.5 bg-[#FEE2E2]/60 border border-[#FECACA] rounded-xl text-center text-xs text-[#991B1B] font-medium">
                Order cancelled. No further actions available.
              </div>
            )}
          </div>

          {!isTerminal && (
            <p className="text-[11px] text-[#A8988C] mt-3">
              Status changes immediately sync to the customer table view and live kitchen screen.
            </p>
          )}
        </div>

        {/* ORDER SUMMARY & DETAILS CARD */}
        <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 sm:p-7 shadow-xs">
          {/* Order Header Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E8DFD8]">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-extrabold px-3 py-1 rounded-lg bg-[#6A0019] text-[#EFE6DC] tracking-wider uppercase">
                  TABLE {order.tableNumber}
                </span>
                <span className="text-sm font-bold text-[#735A4C] font-mono">
                  #{order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-[#735A4C] mt-2">
                Placed on {formatOrderDateTime(order.createdAt)} • Service Date:{' '}
                <span className="font-mono">{order.orderDate}</span>
              </p>
              {order.updatedAt && order.updatedAt !== order.createdAt && (
                <p className="text-[11px] text-[#A8988C] mt-0.5">
                  Last updated: {formatOrderDateTime(order.updatedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Items Breakdown */}
          <div className="py-5 border-b border-[#E8DFD8]">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#735A4C] mb-3">
              Ordered Items ({order.items.reduce((s, it) => s + it.quantity, 0)})
            </h2>

            <div className="space-y-2.5">
              {order.items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3.5 bg-[#FBF7F2] rounded-xl border border-[#E8DFD8]/60 text-xs sm:text-sm"
                >
                  <div className="pr-4">
                    <p className="font-semibold text-[#2C1810]">{item.name}</p>
                    <p className="text-xs text-[#735A4C] font-mono mt-0.5 tabular-nums">
                      {item.quantity} × {formatCurrency(item.unitPrice)}
                    </p>
                  </div>
                  <div className="font-mono font-bold text-[#6A0019] text-sm tabular-nums">
                    {formatCurrency(item.itemTotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="pt-5 space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between text-[#735A4C]">
              <span>Subtotal</span>
              <span className="font-mono font-medium tabular-nums">
                {formatCurrency(order.subtotal)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#2C1810] pt-3 border-t border-[#E8DFD8]">
              <span>Total Bill</span>
              <span className="font-mono text-lg font-extrabold text-[#6A0019] tabular-nums">
                {formatCurrency(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* GST TAX INVOICE CARD */}
        <div className="bg-white border border-[#E8DFD8] rounded-2xl p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8DFD8]">
            <div className="flex items-center gap-2.5">
              <ReceiptText className="w-5 h-5 text-[#6A0019]" />
              <div>
                <h3 className="font-display font-bold text-sm tracking-wide uppercase text-[#6A0019]">
                  GST Tax Invoice
                </h3>
                <p className="text-[11px] text-[#735A4C]">
                  Itemized tax invoice with HSN/SAC, CGST &amp; SGST calculations
                </p>
              </div>
            </div>

            {invoice ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {invoice.invoiceNumber}
                </span>
              </div>
            ) : (
              <span className="text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold self-start sm:self-auto">
                Not Invoiced Yet
              </span>
            )}
          </div>

          <div className="pt-4">
            {invoice ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#FBF7F2] rounded-xl border border-[#E8DFD8]/60 text-xs">
                  <div>
                    <span className="text-[#735A4C] block text-[10px] uppercase font-semibold">Taxable Amount</span>
                    <span className="font-mono font-bold text-[#2C1810]">{formatCurrency(invoice.taxableAmount)}</span>
                  </div>
                  <div>
                    <span className="text-[#735A4C] block text-[10px] uppercase font-semibold">Total GST</span>
                    <span className="font-mono font-bold text-[#6A0019]">{formatCurrency(invoice.totalGst)}</span>
                  </div>
                  <div>
                    <span className="text-[#735A4C] block text-[10px] uppercase font-semibold">Grand Total</span>
                    <span className="font-mono font-bold text-[#2C1810]">{formatCurrency(invoice.grandTotal)}</span>
                  </div>
                  <div>
                    <span className="text-[#735A4C] block text-[10px] uppercase font-semibold">Payment</span>
                    <span className="font-semibold text-[#2C1810]">{invoice.paymentMode} ({invoice.paymentStatus})</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <button
                    type="button"
                    id="btn-preview-invoice"
                    onClick={() => {
                      setPreviewDraft(null);
                      setIsViewModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E8DFD8] hover:border-[#6A0019] text-[#2C1810] hover:text-[#6A0019] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview Invoice</span>
                  </button>

                  <button
                    type="button"
                    id="btn-print-invoice"
                    onClick={() => {
                      setPreviewDraft(null);
                      setIsViewModalOpen(true);
                      setTimeout(() => window.print(), 350);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E8DFD8] hover:border-[#6A0019] text-[#2C1810] hover:text-[#6A0019] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Invoice</span>
                  </button>

                  <button
                    type="button"
                    id="btn-download-invoice-pdf"
                    onClick={async () => {
                      try {
                        await downloadAdminInvoicePdf(invoice._id, invoice.invoiceNumber);
                      } catch (err: any) {
                        alert(err.message || 'Failed to download PDF');
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Invoice as PDF</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-[#735A4C] leading-relaxed">
                  Generate a compliant A4 tax invoice for Table {order.tableNumber}. You can enter optional customer details or preview the calculated tax split before issuing.
                </p>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    id="btn-generate-invoice"
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <FilePlus className="w-4 h-4" />
                    <span>Generate Invoice</span>
                  </button>

                  <button
                    type="button"
                    id="btn-preview-draft-invoice"
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E8DFD8] hover:border-[#6A0019] text-[#2C1810] hover:text-[#6A0019] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview Invoice</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INVOICE VIEW / PRINT MODAL */}
      <InvoiceModal
        invoice={previewDraft || invoice}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setPreviewDraft(null);
        }}
        isDraftPreview={Boolean(previewDraft)}
      />

      {/* GENERATE INVOICE MODAL */}
      <GenerateInvoiceModal
        order={order}
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        onInvoiceGenerated={(inv) => {
          setInvoice(inv);
          setIsViewModalOpen(true);
        }}
        onOpenSettings={() => {
          setIsGenerateModalOpen(false);
          setIsSettingsModalOpen(true);
        }}
        onPreview={(draft) => {
          setPreviewDraft(draft);
          setIsViewModalOpen(true);
        }}
      />

      {/* GST SETTINGS MODAL */}
      <GstSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C1810]/40 backdrop-blur-xs"
        >
          <div className="bg-[#FBF7F2] border border-[#E8DFD8] rounded-2xl max-w-sm w-full p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-[#2C1810] mb-2 font-['Syne',sans-serif]">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-[#735A4C] mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() =>
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 text-xs font-semibold text-[#2C1810] bg-white border border-[#E8DFD8] hover:bg-[#EFE6DC]/50 rounded-xl transition"
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
                    ? 'bg-[#991B1B] hover:bg-[#7F1D1D]'
                    : 'bg-[#6A0019] hover:bg-[#520013]'
                }`}
              >
                {isUpdating ? 'Updating...' : confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminOrderDetailPage() {
  return (
    <Suspense fallback={<AdminOrderDetailSkeleton />}>
      <AdminOrderDetailContent />
    </Suspense>
  );
}
