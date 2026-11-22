'use client';

import React, { useState } from 'react';
import { BarChart3, AlertCircle } from 'lucide-react';
import {
  AnalyticsSalesResponse,
  SalesInterval,
  SalesTrendPoint,
} from '@/types/analytics';
import { formatCompactRupees, formatRupees } from '@/lib/analytics-utils';

interface SalesChartProps {
  data: AnalyticsSalesResponse | null;
  interval: SalesInterval;
  onIntervalChange: (interval: SalesInterval) => void;
  isLoading: boolean;
  error: string | null;
}

type ChartMetricView = 'revenue' | 'orders';

const INTERVAL_OPTIONS: { value: SalesInterval; label: string }[] = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
  { value: 'month', label: 'Monthly' },
];

export function SalesChart({
  data,
  interval,
  onIntervalChange,
  isLoading,
  error,
}: SalesChartProps) {
  const [metricView, setMetricView] = useState<ChartMetricView>('revenue');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const series: SalesTrendPoint[] = data?.series ?? [];
  const hasAnyActivity = series.some(
    (point) => point.revenue > 0 || point.orders > 0,
  );

  const values = series.map((point) =>
    metricView === 'revenue' ? point.revenue : point.orders,
  );
  const maxValue = Math.max(0, ...values);
  const safeMax = maxValue > 0 ? maxValue : 1;

  const activePoint =
    selectedIndex !== null && series[selectedIndex]
      ? series[selectedIndex]
      : series.length > 0
        ? series[series.length - 1]
        : null;

  // Responsive SVG geometry
  const svgWidth = 680;
  const svgHeight = 230;
  const padLeft = 56;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 34;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const labelStep =
    series.length <= 8 ? 1 : Math.ceil(series.length / 7);

  return (
    <section className="bg-white border border-[#6A0019]/15 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-4">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#6A0019]">
            Sales Overview
          </h2>
          <p className="text-xs text-[#2C1810]/65">
            {metricView === 'revenue'
              ? 'Completed order revenue over time'
              : 'Total orders placed over time (all statuses)'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Toggle */}
          <div
            role="group"
            aria-label="Chart metric"
            className="inline-flex p-0.5 rounded-xl bg-[#EFE6DC]/60 border border-[#6A0019]/15"
          >
            <button
              type="button"
              onClick={() => setMetricView('revenue')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                metricView === 'revenue'
                  ? 'bg-[#6A0019] text-[#EFE6DC]'
                  : 'text-[#2C1810]/70 hover:text-[#6A0019]'
              }`}
            >
              Revenue
            </button>
            <button
              type="button"
              onClick={() => setMetricView('orders')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                metricView === 'orders'
                  ? 'bg-[#6A0019] text-[#EFE6DC]'
                  : 'text-[#2C1810]/70 hover:text-[#6A0019]'
              }`}
            >
              Orders
            </button>
          </div>

          {/* Interval Toggle */}
          <div
            role="group"
            aria-label="Grouping interval"
            className="inline-flex p-0.5 rounded-xl bg-[#FBF7F2] border border-[#6A0019]/15"
          >
            {INTERVAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedIndex(null);
                  onIntervalChange(opt.value);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                  interval === opt.value
                    ? 'bg-[#6A0019] text-[#EFE6DC]'
                    : 'text-[#2C1810]/70 hover:text-[#6A0019]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body States */}
      {isLoading ? (
        <div className="h-60 rounded-xl bg-[#FBF7F2] border border-[#6A0019]/10 animate-pulse flex items-end justify-between px-6 pb-8 gap-3">
          {[45, 70, 55, 85, 65, 90, 50].map((pct, i) => (
            <div
              key={i}
              className="flex-1 bg-[#6A0019]/15 rounded-t-lg"
              style={{ height: `${pct}%` }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : !hasAnyActivity ? (
        <div className="h-56 rounded-xl bg-[#FBF7F2] border border-dashed border-[#6A0019]/20 flex flex-col items-center justify-center text-center p-6">
          <BarChart3 className="w-8 h-8 text-[#6A0019]/35 mb-2" />
          <p className="text-sm font-semibold text-[#6A0019]">
            No sales activity in this period
          </p>
          <p className="text-xs text-[#2C1810]/60 mt-1 max-w-sm">
            Try switching to a broader date range or completing incoming orders.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Active Point Inspection Banner */}
          {activePoint && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#FBF7F2] border border-[#6A0019]/15 text-xs">
              <span className="font-semibold text-[#6A0019]">
                {activePoint.label}
              </span>
              <div className="flex flex-wrap items-center gap-3 tabular-nums text-[#2C1810]/80">
                <span>
                  Revenue:{' '}
                  <strong className="text-[#6A0019]">
                    {formatRupees(activePoint.revenue)}
                  </strong>
                </span>
                <span>
                  Orders: <strong>{activePoint.orders}</strong>
                </span>
                <span className="text-emerald-800">
                  Completed: <strong>{activePoint.completedOrders}</strong>
                </span>
                <span className="text-rose-800">
                  Cancelled: <strong>{activePoint.cancelledOrders}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Responsive SVG Bar + Trend Chart */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-56 sm:h-64 select-none"
              role="img"
              aria-label="Sales overview chart"
            >
              {/* Horizontal Gridlines & Y-Axis Ticks */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padTop + plotHeight * (1 - ratio);
                const tickVal = Math.round(maxValue * ratio);
                const tickLabel =
                  metricView === 'revenue'
                    ? formatCompactRupees(tickVal)
                    : String(tickVal);
                return (
                  <g key={ratio}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="#6A0019"
                      strokeOpacity={ratio === 0 ? 0.22 : 0.08}
                      strokeDasharray={ratio === 0 ? undefined : '4 4'}
                    />
                    <text
                      x={padLeft - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="#2C1810"
                      fillOpacity={0.6}
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {tickLabel}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {series.map((point, idx) => {
                const count = series.length;
                const slotWidth = plotWidth / count;
                const barWidth = Math.max(
                  6,
                  Math.min(36, slotWidth * 0.62),
                );
                const x = padLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
                const val =
                  metricView === 'revenue' ? point.revenue : point.orders;
                const barHeight =
                  val > 0 ? Math.max(4, (val / safeMax) * plotHeight) : 0;
                const y = padTop + plotHeight - barHeight;
                const isSelected =
                  selectedIndex === idx ||
                  (selectedIndex === null && idx === series.length - 1);

                return (
                  <g
                    key={point.bucket}
                    className="cursor-pointer"
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => setSelectedIndex(idx)}
                  >
                    {/* Invisible wider hit target for touch */}
                    <rect
                      x={padLeft + idx * slotWidth}
                      y={padTop}
                      width={slotWidth}
                      height={plotHeight + padBottom}
                      fill="transparent"
                    />

                    {/* Bar fill */}
                    {barHeight > 0 && (
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx={4}
                        fill="#6A0019"
                        fillOpacity={isSelected ? 1 : 0.68}
                      />
                    )}

                    {/* X-axis label */}
                    {(idx % labelStep === 0 || idx === series.length - 1) && (
                      <text
                        x={padLeft + idx * slotWidth + slotWidth / 2}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        fill="#2C1810"
                        fillOpacity={isSelected ? 0.95 : 0.6}
                        fontWeight={isSelected ? '700' : '500'}
                        fontSize="10"
                      >
                        {point.label.length > 13
                          ? `${point.label.slice(0, 12)}…`
                          : point.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </section>
  );
}

