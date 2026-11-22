'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  LucideIcon,
} from 'lucide-react';
import { OverviewMetricComparison } from '@/types/analytics';

interface AnalyticsMetricCardProps {
  label: string;
  formattedValue: string;
  subtitle?: string;
  comparison?: OverviewMetricComparison;
  formatPreviousValue?: (val: number) => string;
  icon: LucideIcon;
  tone?: 'default' | 'emerald' | 'rose' | 'amber';
  invertTrendColors?: boolean;
  isLoading?: boolean;
}

const TONE_CLASSES: Record<
  NonNullable<AnalyticsMetricCardProps['tone']>,
  { card: string; iconBg: string; value: string }
> = {
  default: {
    card: 'bg-white border-[#6A0019]/15',
    iconBg: 'bg-[#EFE6DC]/70 text-[#6A0019]',
    value: 'text-[#6A0019]',
  },
  emerald: {
    card: 'bg-[#EEF6EF]/70 border-[#BADBBE]',
    iconBg: 'bg-[#D8EEDB] text-[#2B6633]',
    value: 'text-[#2B6633]',
  },
  rose: {
    card: 'bg-[#FDF0ED]/70 border-[#F2C2B8]',
    iconBg: 'bg-[#FADDD6] text-[#9E3524]',
    value: 'text-[#9E3524]',
  },
  amber: {
    card: 'bg-[#FDF6E2]/70 border-[#E8D194]',
    iconBg: 'bg-[#F5E7B8] text-[#8C5D00]',
    value: 'text-[#8C5D00]',
  },
};

export function AnalyticsMetricCard({
  label,
  formattedValue,
  subtitle,
  comparison,
  formatPreviousValue,
  icon: Icon,
  tone = 'default',
  invertTrendColors = false,
  isLoading = false,
}: AnalyticsMetricCardProps) {
  const styles = TONE_CLASSES[tone];

  if (isLoading) {
    return (
      <div className="bg-white border border-[#6A0019]/15 rounded-2xl p-4 sm:p-5 shadow-2xs animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 bg-[#6A0019]/10 rounded" />
          <div className="h-8 w-8 bg-[#6A0019]/10 rounded-xl" />
        </div>
        <div className="h-7 w-28 bg-[#6A0019]/15 rounded" />
        <div className="h-3 w-32 bg-[#6A0019]/10 rounded" />
      </div>
    );
  }

  let trendNode: React.ReactNode = (
    <span className="inline-flex items-center gap-1 text-[11px] text-[#2C1810]/55">
      <Minus className="w-3 h-3" />
      <span>No prior-period baseline</span>
    </span>
  );

  if (comparison && comparison.hasComparison && comparison.changePercent !== null) {
    const pct = comparison.changePercent;
    const isPositive = pct > 0;
    const isNegative = pct < 0;

    let badgeClass = 'bg-stone-100 text-stone-700 border-stone-200';
    if (isPositive) {
      badgeClass = invertTrendColors
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (isNegative) {
      badgeClass = invertTrendColors
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-rose-50 text-rose-800 border-rose-200';
    }

    const formattedPrev = formatPreviousValue
      ? formatPreviousValue(comparison.previousValue)
      : String(comparison.previousValue);

    trendNode = (
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-bold border tabular-nums ${badgeClass}`}
        >
          {isPositive ? (
            <TrendingUp className="w-3 h-3" />
          ) : isNegative ? (
            <TrendingDown className="w-3 h-3" />
          ) : (
            <Minus className="w-3 h-3" />
          )}
          <span>
            {isPositive ? '+' : ''}
            {pct}%
          </span>
        </span>
        <span className="text-[#2C1810]/55 truncate">
          prev: {formattedPrev}
        </span>
      </div>
    );
  }

  return (
    <article
      className={`border rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between gap-3 ${styles.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-[#2C1810]/75 leading-snug">
            {label}
          </p>
          {subtitle && (
            <p className="text-[10px] text-[#2C1810]/50 mt-0.5">{subtitle}</p>
          )}
        </div>
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${styles.iconBg}`}
        >
          <Icon className="w-4 h-4 stroke-[2.2]" />
        </div>
      </div>

      <div>
        <p
          className={`font-display text-2xl sm:text-[26px] font-bold tracking-tight tabular-nums leading-tight ${styles.value}`}
        >
          {formattedValue}
        </p>
        <div className="mt-2">{trendNode}</div>
      </div>
    </article>
  );
}

