'use client';

import React, { useState } from 'react';
import { PieChart, AlertCircle, Info } from 'lucide-react';
import { AnalyticsCategoriesResponse } from '@/types/analytics';
import { formatRupees } from '@/lib/analytics-utils';

interface CategoryPerformanceProps {
  data: AnalyticsCategoriesResponse | null;
  isLoading: boolean;
  error: string | null;
}

const SLICE_COLORS = [
  '#6A0019',
  '#B8860B',
  '#2B6633',
  '#2B5480',
  '#7C3AED',
  '#C2593F',
  '#4E447A',
  '#78716C',
];

export function CategoryPerformance({
  data,
  isLoading,
  error,
}: CategoryPerformanceProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const categories = data?.categories ?? [];
  const totalRevenue = data?.summary.totalRevenue ?? 0;

  const size = 180;
  const strokeWidth = 26;
  const center = size / 2;
  const radius = center - strokeWidth / 2 - 4;
  const circumference = 2 * Math.PI * radius;

  const activeIndex =
    hoveredIdx !== null && categories[hoveredIdx] ? hoveredIdx : 0;
  const highlighted = categories[activeIndex] ?? null;

  // Precompute donut offsets cleanly without mutation after render
  const segments = categories.reduce<
    Array<{
      categoryName: string;
      dashLength: number;
      dashOffset: number;
      color: string;
      pct: number;
    }>
  >((acc, cat, idx) => {
    const share = totalRevenue > 0 ? cat.revenue / totalRevenue : 0;
    const dashLength = share * circumference;
    const prevCumulative = acc.reduce((sum, seg) => sum + seg.dashLength, 0);
    const color = cat.isUnattributedBucket
      ? '#78716C'
      : SLICE_COLORS[idx % (SLICE_COLORS.length - 1)];
    acc.push({
      categoryName: cat.categoryName,
      dashLength,
      dashOffset: -prevCumulative,
      color,
      pct: cat.percentageContribution,
    });
    return acc;
  }, []);

  return (
    <section className="bg-white border border-[#6A0019]/15 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-4">
      <div>
        <h2 className="font-display text-base sm:text-lg font-bold text-[#6A0019]">
          Category Performance
        </h2>
        <p className="text-xs text-[#2C1810]/65">
          Completed sales revenue &amp; quantity share by menu category
        </p>
      </div>

      {isLoading ? (
        <div className="h-60 rounded-xl bg-[#FBF7F2] animate-pulse" />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : categories.length === 0 ? (
        <div className="py-12 rounded-xl bg-[#FBF7F2] border border-dashed border-[#6A0019]/20 flex flex-col items-center justify-center text-center px-4">
          <PieChart className="w-7 h-7 text-[#6A0019]/35 mb-2" />
          <p className="text-sm font-semibold text-[#6A0019]">
            No category sales recorded
          </p>
          <p className="text-xs text-[#2C1810]/60 mt-1">
            Completed orders will populate category revenue shares.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* SVG Donut Chart */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg
                viewBox={`0 0 ${size} ${size}`}
                className="w-full h-full -rotate-90"
                role="img"
                aria-label="Category sales distribution chart"
              >
                <circle
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke="#EFE6DC"
                  strokeWidth={strokeWidth}
                />
                {segments.map((seg, idx) => (
                  <circle
                    key={seg.categoryName}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={`${seg.dashLength} ${circumference}`}
                    strokeDashoffset={seg.dashOffset}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onClick={() => setHoveredIdx(idx)}
                  />
                ))}
              </svg>
              {highlighted && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-7 pointer-events-none">
                  <span className="text-[10px] font-semibold text-[#2C1810]/65 truncate max-w-full">
                    {highlighted.categoryName}
                  </span>
                  <span className="font-display text-base font-bold text-[#6A0019] tabular-nums">
                    {highlighted.percentageContribution}%
                  </span>
                  <span className="text-[10px] font-mono text-[#2C1810]/70 tabular-nums">
                    {formatRupees(highlighted.revenue)}
                  </span>
                </div>
              )}
            </div>

            {/* Category Breakdown List */}
            <div className="flex-1 w-full space-y-2">
              {categories.map((cat, idx) => {
                const segColor = segments[idx]?.color ?? '#6A0019';
                const isSelected = activeIndex === idx;
                return (
                  <div
                    key={`${cat.categoryId ?? 'none'}-${cat.categoryName}`}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onClick={() => setHoveredIdx(idx)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#EFE6DC]/60 border-[#6A0019]/30'
                        : 'bg-[#FBF7F2] border-[#6A0019]/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: segColor }}
                        />
                        <span className="font-semibold text-[#2C1810] truncate">
                          {cat.categoryName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 tabular-nums">
                        <span className="text-[11px] text-[#2C1810]/65">
                          {cat.itemsSold} items
                        </span>
                        <span className="font-mono font-bold text-[#6A0019]">
                          {formatRupees(cat.revenue)}
                        </span>
                        <span className="w-10 text-right font-mono text-[11px] text-[#2C1810]/70">
                          {cat.percentageContribution}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(data?.attributionSummary.hasLegacyCatalogFallback ||
            data?.attributionSummary.hasUnattributedItems) && (
            <div className="p-2.5 rounded-xl bg-[#EFE6DC]/40 border border-[#6A0019]/10 text-[11px] text-[#2C1810]/75 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-[#6A0019] shrink-0 mt-0.5" />
              <span>
                {data.attributionSummary.hasLegacyCatalogFallback &&
                  'Older orders placed before category snapshotting resolve using their item’s catalog relationship. '}
                {data.attributionSummary.hasUnattributedItems &&
                  'Items whose catalog entry or category was removed without a stored snapshot are isolated under Uncategorized / Historical.'}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

