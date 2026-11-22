'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  TrendingDown,
  UtensilsCrossed,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AnalyticsLeastSellingResponse } from '@/types/analytics';
import { formatRupees } from '@/lib/analytics-utils';

interface LeastSellingItemsProps {
  data: AnalyticsLeastSellingResponse | null;
  limit: number;
  page: number;
  onLimitChange: (limit: number) => void;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  error: string | null;
}

export function LeastSellingItems({
  data,
  limit,
  page,
  onLimitChange,
  onPageChange,
  isLoading,
  error,
}: LeastSellingItemsProps) {
  const [viewMode, setViewMode] = useState<'active' | 'unavailable'>('active');

  const items = data?.items ?? [];
  const unavailableItems = data?.unavailableItems ?? [];
  const totalPages = data?.pagination.totalPages ?? 0;
  const rankedTotal = data?.summary.rankedItemCount ?? 0;

  return (
    <section className="bg-white border border-[#6A0019]/15 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-[#6A0019]">
              Least Selling Items
            </h2>
            <p className="text-xs text-[#2C1810]/65">
              Lowest completed sales quantities; unavailable items separated
            </p>
          </div>

          {viewMode === 'active' && (
            <div className="inline-flex p-0.5 rounded-xl bg-[#EFE6DC]/60 border border-[#6A0019]/15 self-start">
              {[
                { value: 5, label: '5' },
                { value: 10, label: '10' },
                { value: 50, label: 'All' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onLimitChange(opt.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                    limit === opt.value
                      ? 'bg-[#6A0019] text-[#EFE6DC]'
                      : 'text-[#2C1810]/75 hover:text-[#6A0019]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sub-view Switch: Ranked Active vs Unavailable Items */}
        {!isLoading && !error && data && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('active')}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                viewMode === 'active'
                  ? 'bg-[#6A0019] text-[#EFE6DC] border-[#6A0019]'
                  : 'bg-[#FBF7F2] text-[#2C1810]/75 border-[#6A0019]/15 hover:text-[#6A0019]'
              }`}
            >
              Active &amp; Sold ({data.summary.rankedItemCount})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unavailable')}
              className={`px-3 py-1 rounded-xl text-[11px] font-semibold border transition cursor-pointer ${
                viewMode === 'unavailable'
                  ? 'bg-[#6A0019] text-[#EFE6DC] border-[#6A0019]'
                  : 'bg-[#FBF7F2] text-[#2C1810]/75 border-[#6A0019]/15 hover:text-[#6A0019]'
              }`}
            >
              Unavailable / Inactive (0 Sales) ({data.summary.unavailableCount})
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-14 bg-[#FBF7F2] rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : viewMode === 'active' ? (
        items.length === 0 ? (
          <div className="py-12 rounded-xl bg-[#FBF7F2] border border-dashed border-[#6A0019]/20 flex flex-col items-center justify-center text-center px-4">
            <TrendingDown className="w-7 h-7 text-[#6A0019]/35 mb-2" />
            <p className="text-sm font-semibold text-[#6A0019]">
              No active menu items to rank
            </p>
            <p className="text-xs text-[#2C1810]/60 mt-1">
              Menu items available by the end of the selected period will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => (
              <div
                key={item.foodItemId}
                className="p-3 rounded-xl bg-[#FBF7F2] border border-[#6A0019]/10 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative w-10 h-10 rounded-xl bg-stone-100 border border-[#6A0019]/15 overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="40px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#6A0019]/35">
                        <UtensilsCrossed className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#2C1810] truncate">
                      {item.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="text-[11px] text-[#2C1810]/60 truncate">
                        {item.categoryName}
                      </span>
                      {item.salesStatus === 'ZERO_SALES' ? (
                        <span className="px-1.5 py-0.2 rounded-md bg-[#FDF6E2] text-[#8C5D00] border border-[#E8D194] text-[10px] font-semibold">
                          No completed orders
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-semibold">
                          Low sales
                        </span>
                      )}
                      {item.createdAfterRangeStart && (
                        <span className="px-1.5 py-0.2 rounded-md bg-[#EEF4FB] text-[#2B5480] border border-[#C3D8EF] text-[10px] font-medium">
                          Added mid-range
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <p className="text-sm font-bold text-[#6A0019]">
                    {item.quantitySold} sold
                  </p>
                  <p className="text-[11px] font-mono text-[#2C1810]/65">
                    {formatRupees(item.revenue)}
                  </p>
                </div>
              </div>
            ))}

            {(limit > 10 || totalPages > 1) && rankedTotal > 0 && (
              <div className="pt-1 flex items-center justify-between text-xs text-[#2C1810]/70">
                <span>
                  Showing {items.length} of {rankedTotal} items
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => onPageChange(page - 1)}
                      className="p-1.5 rounded-lg border border-[#6A0019]/20 hover:bg-[#EFE6DC]/50 disabled:opacity-40 cursor-pointer"
                      aria-label="Previous least selling page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono text-[11px] px-1">
                      {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => onPageChange(page + 1)}
                      className="p-1.5 rounded-lg border border-[#6A0019]/20 hover:bg-[#EFE6DC]/50 disabled:opacity-40 cursor-pointer"
                      aria-label="Next least selling page"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      ) : unavailableItems.length === 0 ? (
        <div className="py-10 rounded-xl bg-[#FBF7F2] border border-dashed border-[#6A0019]/20 text-center px-4">
          <p className="text-xs font-semibold text-[#6A0019]">
            All existing menu items are currently available.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {unavailableItems.map((item) => (
            <div
              key={item.foodItemId}
              className="p-2.5 rounded-xl bg-[#FDF0ED]/60 border border-[#F2C2B8] flex items-center justify-between gap-3 text-xs"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[#2C1810] truncate">
                  {item.name}
                </p>
                <p className="text-[11px] text-[#2C1810]/65 truncate">
                  {item.categoryName}
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white text-[#9E3524] border border-[#F2C2B8] text-[10px] font-semibold shrink-0">
                {!item.categoryActive
                  ? 'Category inactive'
                  : 'Currently unavailable'}
              </span>
            </div>
          ))}
        </div>
      )}

      {data?.limitationNote && !isLoading && !error && (
        <div className="p-2.5 rounded-xl bg-[#EFE6DC]/40 border border-[#6A0019]/10 text-[11px] text-[#2C1810]/70 flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-[#6A0019] shrink-0 mt-0.5" />
          <span>{data.limitationNote}</span>
        </div>
      )}
    </section>
  );
}

