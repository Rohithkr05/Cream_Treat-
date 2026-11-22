'use client';

import React, { useState } from 'react';
import { Calendar, AlertCircle } from 'lucide-react';
import { DateFilterPreset } from '@/types/analytics';
import {
  formatIstDateLabel,
  getKolkataTodayIso,
  validateCustomDateRange,
} from '@/lib/analytics-utils';

interface AnalyticsDateFilterProps {
  preset: DateFilterPreset;
  startDate: string;
  endDate: string;
  previousStartDate?: string;
  previousEndDate?: string;
  onSelectPreset: (preset: Exclude<DateFilterPreset, 'custom'>) => void;
  onApplyCustomRange: (startDate: string, endDate: string) => void;
}

const PRESET_OPTIONS: {
  id: Exclude<DateFilterPreset, 'custom'>;
  label: string;
}[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7days', label: 'Last 7 days' },
  { id: 'last30days', label: 'Last 30 days' },
  { id: 'thisMonth', label: 'This month' },
];

export function AnalyticsDateFilter({
  preset,
  startDate,
  endDate,
  previousStartDate,
  previousEndDate,
  onSelectPreset,
  onApplyCustomRange,
}: AnalyticsDateFilterProps) {
  const [showCustom, setShowCustom] = useState(preset === 'custom');
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [validationError, setValidationError] = useState<string | null>(null);
  const maxDate = getKolkataTodayIso();

  const handlePresetClick = (
    selected: Exclude<DateFilterPreset, 'custom'>,
  ) => {
    setShowCustom(false);
    setValidationError(null);
    onSelectPreset(selected);
  };

  const handleOpenCustom = () => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
    setValidationError(null);
    setShowCustom((prev) => !prev);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const check = validateCustomDateRange(draftStart, draftEnd);
    if (!check.valid) {
      setValidationError(check.error || 'Invalid date range.');
      return;
    }
    setValidationError(null);
    onApplyCustomRange(draftStart, draftEnd);
  };

  return (
    <section
      aria-label="Analytics Date Filters"
      className="bg-white border border-[#6A0019]/15 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Preset Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {PRESET_OPTIONS.map((option) => {
            const isSelected = preset === option.id && !showCustom;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handlePresetClick(option.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#6A0019] text-[#EFE6DC] shadow-2xs'
                    : 'bg-[#FBF7F2] text-[#2C1810]/80 border border-[#6A0019]/15 hover:bg-[#EFE6DC]/50 hover:text-[#6A0019]'
                }`}
              >
                {option.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleOpenCustom}
            className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition cursor-pointer ${
              preset === 'custom' || showCustom
                ? 'bg-[#6A0019] text-[#EFE6DC] shadow-2xs'
                : 'bg-[#FBF7F2] text-[#2C1810]/80 border border-[#6A0019]/15 hover:bg-[#EFE6DC]/50 hover:text-[#6A0019]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Custom</span>
          </button>
        </div>

        {/* Active IST Date Window Summary */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#2C1810]/70">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFE6DC]/50 text-[#6A0019] font-semibold border border-[#6A0019]/15">
            <span>
              {formatIstDateLabel(startDate)} – {formatIstDateLabel(endDate)}
            </span>
            <span className="text-[10px] opacity-75 font-mono">IST</span>
          </span>
          {previousStartDate && previousEndDate && (
            <span className="text-[11px] text-[#2C1810]/55">
              vs {formatIstDateLabel(previousStartDate)} –{' '}
              {formatIstDateLabel(previousEndDate)}
            </span>
          )}
        </div>
      </div>

      {/* Custom Date Range Controls */}
      {showCustom && (
        <form
          onSubmit={handleCustomSubmit}
          className="pt-3 border-t border-[#6A0019]/10 flex flex-col sm:flex-row sm:items-end gap-3"
        >
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="analytics-start-date"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#6A0019] mb-1"
              >
                Start Date (IST)
              </label>
              <input
                id="analytics-start-date"
                type="date"
                value={draftStart}
                max={maxDate}
                onChange={(e) => setDraftStart(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl text-xs font-medium text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
              />
            </div>

            <div>
              <label
                htmlFor="analytics-end-date"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#6A0019] mb-1"
              >
                End Date (IST)
              </label>
              <input
                id="analytics-end-date"
                type="date"
                value={draftEnd}
                max={maxDate}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl text-xs font-medium text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-display font-bold uppercase tracking-wider transition cursor-pointer"
            >
              Apply Range
            </button>
          </div>
        </form>
      )}

      {validationError && (
        <div
          role="alert"
          className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}
    </section>
  );
}

