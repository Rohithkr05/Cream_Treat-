'use client';

import React, { useState } from 'react';
import { Clock, AlertCircle, Flame } from 'lucide-react';
import { AnalyticsPeakHoursResponse } from '@/types/analytics';
import { formatCompactRupees, formatRupees } from '@/lib/analytics-utils';

interface PeakHoursChartProps {
  data: AnalyticsPeakHoursResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function PeakHoursChart({
  data,
  isLoading,
  error,
}: PeakHoursChartProps) {
  const [metric, setMetric] = useState<'orders' | 'revenue'>('orders');
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const hours = data?.hours ?? [];
  const hasActivity = hours.some((h) => h.orders > 0);
  const values = hours.map((h) => (metric === 'orders' ? h.orders : h.revenue));
  const maxVal = Math.max(0, ...values);
  const safeMax = maxVal > 0 ? maxVal : 1;

  const busiestOrders = data?.busiestHourByOrders ?? null;
  const busiestRevenue = data?.busiestHourByRevenue ?? null;

  const activeHour =
    selectedHour !== null && hours[selectedHour]
      ? hours[selectedHour]
      : metric === 'orders'
        ? busiestOrders
        : busiestRevenue;

  const svgWidth = 680;
  const svgHeight = 205;
  const padLeft = 48;
  const padRight = 10;
  const padTop = 14;
  const padBottom = 32;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  return (
    <section className="bg-white border border-[#6A0019]/15 rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-[#6A0019]">
            Peak Ordering Hours
          </h2>
          <p className="text-xs text-[#2C1810]/65">
            Hourly breakdown in Asia/Kolkata (IST)
          </p>
        </div>

        <div className="inline-flex p-0.5 rounded-xl bg-[#EFE6DC]/60 border border-[#6A0019]/15 self-start">
          <button
            type="button"
            onClick={() => setMetric('orders')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              metric === 'orders'
                ? 'bg-[#6A0019] text-[#EFE6DC]'
                : 'text-[#2C1810]/75 hover:text-[#6A0019]'
            }`}
          >
            Orders
          </button>
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              metric === 'revenue'
                ? 'bg-[#6A0019] text-[#EFE6DC]'
                : 'text-[#2C1810]/75 hover:text-[#6A0019]'
            }`}
          >
            Sales
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-56 rounded-xl bg-[#FBF7F2] animate-pulse" />
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      ) : !hasActivity ? (
        <div className="py-12 rounded-xl bg-[#FBF7F2] border border-dashed border-[#6A0019]/20 flex flex-col items-center justify-center text-center px-4">
          <Clock className="w-7 h-7 text-[#6A0019]/35 mb-2" />
          <p className="text-sm font-semibold text-[#6A0019]">
            No hourly traffic data
          </p>
          <p className="text-xs text-[#2C1810]/60 mt-1">
            Peak hours will appear once customer orders are placed.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Busiest Hour Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#FDF6E2] border border-[#E8D194] flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#B8860B] shrink-0" />
                <span className="font-semibold text-[#8C5D00]">
                  Busiest Hour
                </span>
              </div>
              {busiestOrders ? (
                <span className="font-mono font-bold text-[#2C1810] tabular-nums">
                  {busiestOrders.label} ({busiestOrders.orders} orders)
                </span>
              ) : (
                <span className="text-[#2C1810]/60">—</span>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-[#EFE6DC]/60 border border-[#6A0019]/15 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-[#6A0019]">
                Top Revenue Hour
              </span>
              {busiestRevenue ? (
                <span className="font-mono font-bold text-[#6A0019] tabular-nums">
                  {busiestRevenue.label} ({formatRupees(busiestRevenue.revenue)})
                </span>
              ) : (
                <span className="text-[#2C1810]/60">₹0</span>
              )}
            </div>
          </div>

          {activeHour && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#FBF7F2] border border-[#6A0019]/10 text-[11px] tabular-nums">
              <span className="font-mono font-semibold text-[#6A0019]">
                {activeHour.hourRange} IST
              </span>
              <div className="flex items-center gap-3 text-[#2C1810]/80">
                <span>
                  Orders: <strong>{activeHour.orders}</strong>
                </span>
                <span>
                  Completed: <strong>{activeHour.completedOrders}</strong>
                </span>
                <span>
                  Sales:{' '}
                  <strong className="text-[#6A0019]">
                    {formatRupees(activeHour.revenue)}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* 24-Hour SVG Column Chart */}
          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-48 sm:h-52 select-none"
              role="img"
              aria-label="Hourly order distribution chart"
            >
              {[0, 0.5, 1].map((ratio) => {
                const y = padTop + plotH * (1 - ratio);
                const val = Math.round(maxVal * ratio);
                const text =
                  metric === 'revenue'
                    ? formatCompactRupees(val)
                    : String(val);
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
                      x={padLeft - 6}
                      y={y + 4}
                      textAnchor="end"
                      fill="#2C1810"
                      fillOpacity={0.6}
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {text}
                    </text>
                  </g>
                );
              })}

              {hours.map((entry, idx) => {
                const slotW = plotW / 24;
                const barW = Math.max(8, slotW * 0.65);
                const x = padLeft + idx * slotW + (slotW - barW) / 2;
                const val = metric === 'orders' ? entry.orders : entry.revenue;
                const barH = val > 0 ? Math.max(3, (val / safeMax) * plotH) : 0;
                const y = padTop + plotH - barH;
                const isPeak =
                  metric === 'orders'
                    ? busiestOrders?.hour === entry.hour
                    : busiestRevenue?.hour === entry.hour;
                const isActive = activeHour?.hour === entry.hour;

                return (
                  <g
                    key={entry.hour}
                    className="cursor-pointer"
                    onMouseEnter={() => setSelectedHour(entry.hour)}
                    onClick={() => setSelectedHour(entry.hour)}
                  >
                    <rect
                      x={padLeft + idx * slotW}
                      y={padTop}
                      width={slotW}
                      height={plotH + padBottom}
                      fill="transparent"
                    />
                    {barH > 0 && (
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={barH}
                        rx={3}
                        fill={isPeak ? '#B8860B' : '#6A0019'}
                        fillOpacity={isActive ? 1 : isPeak ? 0.9 : 0.65}
                      />
                    )}
                    {entry.hour % 3 === 0 && (
                      <text
                        x={padLeft + idx * slotW + slotW / 2}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        fill="#2C1810"
                        fillOpacity={0.65}
                        fontSize="9.5"
                      >
                        {entry.label}
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

