'use client';

import React from 'react';
import { AlertCircle, Activity } from 'lucide-react';
import { AnalyticsOrderStatusResponse } from '@/types/analytics';
import { OrderStatus } from '@/types/menu';
import { formatRupees } from '@/lib/analytics-utils';

interface OrderStatusOverviewProps {
  data: AnalyticsOrderStatusResponse | null;
  isLoading: boolean;
  error: string | null;
}

const STATUS_META: Record<
  OrderStatus,
  { label: string; barColor: string; pillClass: string }
> = {
  NEW: {
    label: 'New Orders',
    barColor: 'bg-[#D97706]',
    pillClass: 'bg-[#FDF6E2] text-[#8C5D00] border-[#E8D194]',
  },
  ACCEPTED: {
    label: 'Accepted',
    barColor: 'bg-[#2563EB]',
    pillClass: 'bg-[#EEF4FB] text-[#2B5480] border-[#C3D8EF]',
  },
  PREPARING: {
    label: 'Preparing',
    barColor: 'bg-[#7C3AED]',
    pillClass: 'bg-[#F0EFF8] text-[#4E447A] border-[#D1CEE8]',
  },
  READY: {
    label: 'Ready to Serve',
    barColor: 'bg-[#059669]',
    pillClass: 'bg-[#EEF6EF] text-[#2B6633] border-[#BADBBE]',
  },
  COMPLETED: {
    label: 'Completed',
    barColor: 'bg-[#6A0019]',
    pillClass: 'bg-[#EFE6DC] text-[#6A0019] border-[#6A0019]/25',
  },
  CANCELLED: {
    label: 'Cancelled',
    barColor: 'bg-[#DC2626]',
    pillClass: 'bg-[#FDF0ED] text-[#9E3524] border-[#F2C2B8]',
  },
};

export function OrderStatusOverview({
  data,
  isLoading,
  error,
}: OrderStatusOverviewProps) {
  return (
    <section className="bg-white border border-[#6A0019]/15 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-4">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base sm:text-lg font-bold text-[#6A0019]">
            Order Status Overview
          </h2>
          {data && (
            <span className="text-xs font-mono font-bold text-[#6A0019] tabular-nums">
              {data.totalOrders} total
            </span>
          )}
        </div>
        <p className="text-xs text-[#2C1810]/65 mt-0.5">
          Current lifecycle states of orders created in range
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-3 w-full bg-[#6A0019]/10 rounded-full" />
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-9 bg-[#FBF7F2] rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : !data || data.totalOrders === 0 ? (
        <div className="py-12 rounded-xl bg-[#FBF7F2] border border-dashed border-[#6A0019]/20 flex flex-col items-center justify-center text-center px-4">
          <Activity className="w-7 h-7 text-[#6A0019]/35 mb-2" />
          <p className="text-sm font-semibold text-[#6A0019]">
            No orders created
          </p>
          <p className="text-xs text-[#2C1810]/60 mt-1">
            Order status breakdown will appear once orders are received.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Segmented Proportion Strip */}
          <div className="w-full h-3 rounded-full overflow-hidden bg-[#EFE6DC]/60 flex">
            {data.statuses
              .filter((s) => s.count > 0)
              .map((s) => (
                <div
                  key={s.status}
                  className={STATUS_META[s.status].barColor}
                  style={{ width: `${Math.max(2, s.percentage)}%` }}
                  title={`${STATUS_META[s.status].label}: ${s.count} (${s.percentage}%)`}
                />
              ))}
          </div>

          {/* 6 Lifecycle Rows */}
          <div className="space-y-2">
            {data.statuses.map((row) => {
              const meta = STATUS_META[row.status];
              return (
                <div
                  key={row.status}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FBF7F2] border border-[#6A0019]/10 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${meta.barColor}`}
                    />
                    <span className="font-semibold text-[#2C1810] truncate">
                      {meta.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span className="text-[11px] text-[#2C1810]/60 hidden sm:inline">
                      {formatRupees(row.totalAmount)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${meta.pillClass}`}
                    >
                      {row.count}
                    </span>
                    <span className="w-11 text-right font-mono text-[11px] text-[#2C1810]/70">
                      {row.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

