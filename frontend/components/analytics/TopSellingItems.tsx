'use client';

import React from 'react';
import Image from 'next/image';
import {
  Award,
  UtensilsCrossed,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AnalyticsTopItemsResponse } from '@/types/analytics';
import { formatRupees } from '@/lib/analytics-utils';

interface TopSellingItemsProps {
  data: AnalyticsTopItemsResponse | null;
  limit: number;
  page: number;
  onLimitChange: (limit: number) => void;
  onPageChange: (page: number) => void;
  isLoading: boolean;
  error: string | null;
}

export function TopSellingItems({
  data,
  limit,
  page,
  onLimitChange,
  onPageChange,
  isLoading,
  error,
}: TopSellingItemsProps) {
  const items = data?.items ?? [];
  const totalUnique = data?.summary.uniqueItemCount ?? 0;
  const totalPages = data?.pagination.totalPages ?? 0;

  return (
    <section className="bg-white border border-[#6A0019]/15 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#6A0019]">
            Top Selling Items
          </h2>
          <p className="text-xs text-[#2C1810]/65">
            Ranked by quantity sold in completed orders
          </p>
        </div>

        <div className="inline-flex p-0.5 rounded-xl bg-[#EFE6DC]/60 border border-[#6A0019]/15 self-start">
          {[
            { value: 5, label: 'Top 5' },
            { value: 10, label: 'Top 10' },
            { value: 50, label: 'View All' },
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
      ) : items.length === 0 ? (
        <div className="py-12 rounded-xl bg-[#FBF7F2] border border-dashed border-[#6A0019]/20 flex flex-col items-center justify-center text-center px-4">
          <Award className="w-7 h-7 text-[#6A0019]/35 mb-2" />
          <p className="text-sm font-semibold text-[#6A0019]">
            No completed item sales yet
          </p>
          <p className="text-xs text-[#2C1810]/60 mt-1">
            Completed orders during this date range will rank top-selling dishes.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={`${item.foodItemId ?? 'none'}-${item.name}`}
              className="p-3 rounded-xl bg-[#FBF7F2] border border-[#6A0019]/10 space-y-2"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-[#6A0019] text-[#EFE6DC] font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                    #{item.rank}
                  </span>

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
                    <p className="text-[11px] text-[#2C1810]/60 tabular-nums">
                      <span className="font-semibold text-[#6A0019]">
                        {item.quantitySold}
                      </span>{' '}
                      sold
                      {!item.catalogExists && (
                        <span className="ml-1.5 text-[10px] text-[#2C1810]/50">
                          (Archived item)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 tabular-nums">
                  <p className="text-sm font-bold font-mono text-[#6A0019]">
                    {formatRupees(item.revenue)}
                  </p>
                  <p className="text-[11px] font-mono text-[#2C1810]/65">
                    {item.percentageContribution}% of sales
                  </p>
                </div>
              </div>

              <div className="w-full h-1.5 rounded-full bg-[#EFE6DC] overflow-hidden">
                <div
                  className="h-full bg-[#6A0019] rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(2, item.percentageContribution))}%`,
                  }}
                />
              </div>
            </div>
          ))}

          {/* Pagination when viewing all */}
          {(limit > 10 || totalPages > 1) && totalUnique > 0 && (
            <div className="pt-2 flex items-center justify-between text-xs text-[#2C1810]/70">
              <span>
                Showing {items.length} of {totalUnique} items
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                    className="p-1.5 rounded-lg border border-[#6A0019]/20 hover:bg-[#EFE6DC]/50 disabled:opacity-40 cursor-pointer"
                    aria-label="Previous top items page"
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
                    aria-label="Next top items page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

