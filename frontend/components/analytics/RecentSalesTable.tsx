'use client';

import React from 'react';
import Link from 'next/link';
import {
  Receipt,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { AnalyticsRecentOrdersResponse } from '@/types/analytics';
import { OrderStatus } from '@/types/menu';
import { formatIstDateTime, formatRupees } from '@/lib/analytics-utils';

interface RecentSalesTableProps {
  data: AnalyticsRecentOrdersResponse | null;
  page: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  error: string | null;
}

const STATUS_BADGES: Record<OrderStatus, { label: string; className: string }> =
  {
    NEW: {
      label: 'New',
      className: 'bg-[#FDF6E2] text-[#8C5D00] border-[#E8D194]',
    },
    ACCEPTED: {
      label: 'Accepted',
      className: 'bg-[#EEF4FB] text-[#2B5480] border-[#C3D8EF]',
    },
    PREPARING: {
      label: 'Preparing',
      className: 'bg-[#F0EFF8] text-[#4E447A] border-[#D1CEE8]',
    },
    READY: {
      label: 'Ready',
      className: 'bg-[#EEF6EF] text-[#2B6633] border-[#BADBBE]',
    },
    COMPLETED: {
      label: 'Completed',
      className: 'bg-[#EFE6DC]/70 text-[#6A0019] border-[#6A0019]/20',
    },
    CANCELLED: {
      label: 'Cancelled',
      className: 'bg-[#FDF0ED] text-[#9E3524] border-[#F2C2B8]',
    },
  };

export function RecentSalesTable({
  data,
  page,
  onPageChange,
  isLoading,
  error,
}: RecentSalesTableProps) {
  const rows = data?.data ?? [];
  const total = data?.pagination.total ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;

  return (
    <section className="bg-white border border-[#6A0019]/15 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#6A0019]">
            Recent Sales Activity
          </h2>
          <p className="text-xs text-[#2C1810]/65">
            Orders created within the selected period (Asia/Kolkata time)
          </p>
        </div>
        {data && (
          <span className="text-xs font-mono font-semibold text-[#2C1810]/65 tabular-nums">
            {total} order{total === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2.5 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-12 bg-[#FBF7F2] rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="py-12 rounded-xl bg-[#FBF7F2] border border-dashed border-[#6A0019]/20 flex flex-col items-center justify-center text-center px-4">
          <Receipt className="w-7 h-7 text-[#6A0019]/35 mb-2" />
          <p className="text-sm font-semibold text-[#6A0019]">
            No orders found in this date range
          </p>
          <p className="text-xs text-[#2C1810]/60 mt-1">
            Adjust the date filter above to inspect historical orders.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#6A0019]/15 text-[11px] uppercase tracking-wider text-[#2C1810]/60">
                  <th className="py-2.5 px-3 font-semibold">Order</th>
                  <th className="py-2.5 px-3 font-semibold">Date &amp; Time</th>
                  <th className="py-2.5 px-3 font-semibold">Items</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  <th className="py-2.5 px-3 font-semibold text-center">
                    Status
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#6A0019]/10 text-xs">
                {rows.map((order) => {
                  const badge = STATUS_BADGES[order.status];
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FBF7F2]/80 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="font-mono font-bold text-[#6A0019]">
                          {order.orderNumber}
                        </div>
                        <div className="text-[11px] text-[#2C1810]/55">
                          Table {order.tableNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#2C1810]/80 whitespace-nowrap">
                        {formatIstDateTime(order.createdAt)}
                      </td>
                      <td className="py-3 px-3 font-mono tabular-nums text-[#2C1810]">
                        {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#6A0019] tabular-nums">
                        {formatRupees(order.total)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#6A0019] bg-[#EFE6DC]/60 hover:bg-[#6A0019] hover:text-[#EFE6DC] transition"
                        >
                          <span>View</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-2.5">
            {rows.map((order) => {
              const badge = STATUS_BADGES[order.status];
              return (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="block p-3.5 rounded-xl bg-[#FBF7F2] border border-[#6A0019]/15 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-sm text-[#6A0019]">
                      {order.orderNumber} · Table {order.tableNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#2C1810]/70">
                    <span>{formatIstDateTime(order.createdAt)}</span>
                    <span className="font-mono font-bold text-[#6A0019] tabular-nums">
                      {order.itemCount} items · {formatRupees(order.total)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-2 flex items-center justify-between text-xs text-[#2C1810]/70 border-t border-[#6A0019]/10">
              <span>
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#6A0019]/20 hover:bg-[#EFE6DC]/50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#6A0019]/20 hover:bg-[#EFE6DC]/50 disabled:opacity-40 cursor-pointer"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

