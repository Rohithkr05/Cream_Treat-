'use client';

import React from 'react';
import { FoodItem } from '@/types/menu';
import { AddControl } from '@/components/AddControl';

export interface TypographicSubgroup {
  title: string;
  items: FoodItem[];
}

interface TypographicItemListProps {
  items?: FoodItem[];
  subgroups?: TypographicSubgroup[];
  theme: 'light' | 'dark';
}

export function TypographicItemList({
  items,
  subgroups,
  theme,
}: TypographicItemListProps) {
  const isLight = theme === 'light';
  const nameColor = isLight ? 'text-[#6A0019]' : 'text-[#EFE6DC]';
  const priceColor = isLight ? 'text-[#6A0019]' : 'text-[#EFE6DC]';
  const leaderColor = isLight ? 'border-[#6A0019]/30' : 'border-[#EFE6DC]/30';
  const subgroupTitleColor = isLight ? 'text-[#6A0019]' : 'text-[#EFE6DC]';
  const subgroupBorder = isLight ? 'border-[#6A0019]/20' : 'border-[#EFE6DC]/25';

  const renderItemRow = (item: FoodItem, index: number) => {
    const priceRupees = Math.round(item.price / 100);
    const itemKey = item._id || `${item.name}-${index}`;

    return (
      <li
        key={itemKey}
        className="group flex items-center justify-between py-2 sm:py-2.5 transition-colors gap-2 sm:gap-3"
      >
        {/* Item Name (wraps up to 2 lines on narrow screens) */}
        <div className="flex-1 min-w-0 pr-1">
          <span
            className={`font-body text-sm sm:text-base font-medium leading-snug line-clamp-2 block ${nameColor} ${
              !item.isAvailable ? 'opacity-50 line-through' : ''
            }`}
          >
            {item.name}
          </span>
        </div>

        {/* Dotted Leader Line */}
        <div
          className={`flex-1 border-b border-dotted min-w-2 sm:min-w-6 transform -translate-y-1 ${leaderColor}`}
          aria-hidden="true"
        />

        {/* Price & Add Control */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span
            className={`font-body text-sm sm:text-base font-semibold tabular-nums ${priceColor} ${
              !item.isAvailable ? 'opacity-50' : ''
            }`}
          >
            ₹{priceRupees}
          </span>

          <AddControl item={item} theme={theme} />
        </div>
      </li>
    );
  };

  return (
    <div className="w-full">
      {/* If section has subgroups (e.g. Milkshakes, Mains, Cheat Meal, Mojitos) */}
      {subgroups && subgroups.length > 0 ? (
        <div className="space-y-8 sm:space-y-10">
          {subgroups.map((subgroup) => (
            <div key={subgroup.title} className="space-y-2 sm:space-y-3">
              <div
                className={`flex items-center justify-between pb-1.5 border-b ${subgroupBorder}`}
              >
                <h3
                  className={`font-display text-xs sm:text-sm uppercase tracking-[0.2em] font-bold ${subgroupTitleColor}`}
                >
                  {subgroup.title}
                </h3>
                <span
                  className={`text-[11px] uppercase tracking-widest opacity-60 font-medium ${subgroupTitleColor}`}
                >
                  {subgroup.items.length} items
                </span>
              </div>
              <ul className="divide-y-0 space-y-1" role="list">
                {subgroup.items.map((item, idx) => renderItemRow(item, idx))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        /* Flat items list (e.g. Sundae, Sides) */
        <ul className="divide-y-0 space-y-1" role="list">
          {items?.map((item, idx) => renderItemRow(item, idx))}
        </ul>
      )}
    </div>
  );
}
