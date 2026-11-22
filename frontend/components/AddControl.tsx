'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { FoodItem } from '@/types/menu';
import { useCart } from '@/hooks/useCart';
import { isValidMongoObjectId } from '@/lib/checkout';

interface AddControlProps {
  item: FoodItem;
  theme: 'light' | 'dark';
  className?: string;
}

/**
 * Editorial Add / Quantity Stepper Control
 * - Default: clear button with small caps "ADD" and brand outline.
 * - Active: [ -  qty  + ] stepper with 44x44px tap targets.
 * - Muted and disabled when item.isAvailable is false.
 */
export function AddControl({ item, theme, className = '' }: AddControlProps) {
  const { getItemQuantity, addItem, removeItem } = useCart();
  const isOrderable = item.isAvailable && isValidMongoObjectId(item._id);
  const quantity = isOrderable ? getItemQuantity(item._id) : 0;
  const isLight = theme === 'light';

  // Unavailable / Sold Out / Unsynced State
  if (!isOrderable) {
    return (
      <div
        className={`inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg border text-[11px] font-display uppercase tracking-wider font-semibold opacity-40 cursor-not-allowed select-none ${
          isLight
            ? 'border-[#6A0019]/40 text-[#6A0019]'
            : 'border-[#EFE6DC]/40 text-[#EFE6DC]'
        } ${className}`}
        aria-disabled="true"
      >
        Unavailable
      </div>
    );
  }

  // Default "ADD" Button
  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={() => addItem(item)}
        aria-label={`Add ${item.name} to cart`}
        className={`inline-flex items-center justify-center min-h-[44px] min-w-[76px] px-4 rounded-lg border font-display text-xs uppercase tracking-[0.16em] font-bold transition-all duration-200 active:scale-[0.98] cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-offset-1 ${
          isLight
            ? 'border-[#6A0019] text-[#6A0019] hover:bg-[#6A0019] hover:text-[#EFE6DC] focus:ring-[#6A0019]'
            : 'border-[#EFE6DC] text-[#EFE6DC] hover:bg-[#EFE6DC] hover:text-[#6A0019] focus:ring-[#EFE6DC]'
        } ${className}`}
      >
        <span>Add</span>
      </button>
    );
  }

  // Active Quantity Stepper [ -  qty  + ]
  return (
    <div
      role="group"
      aria-label={`Quantity for ${item.name}`}
      className={`inline-flex items-center rounded-lg border min-h-[44px] select-none transition-colors duration-200 ${
        isLight
          ? 'border-[#6A0019] bg-[#6A0019]/5 text-[#6A0019]'
          : 'border-[#EFE6DC] bg-[#EFE6DC]/10 text-[#EFE6DC]'
      } ${className}`}
    >
      <button
        type="button"
        onClick={() => removeItem(item._id)}
        aria-label={`Decrease quantity of ${item.name}`}
        className={`w-11 h-11 flex items-center justify-center transition-colors active:scale-95 cursor-pointer rounded-l-md focus:outline-none focus:ring-1 ${
          isLight
            ? 'hover:bg-[#6A0019]/10 text-[#6A0019] focus:ring-[#6A0019]'
            : 'hover:bg-[#EFE6DC]/15 text-[#EFE6DC] focus:ring-[#EFE6DC]'
        }`}
      >
        <Minus className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>

      <span
        aria-live="polite"
        className="w-7 sm:w-8 text-center font-body text-xs sm:text-sm font-bold tabular-nums"
      >
        {quantity}
      </span>

      <button
        type="button"
        onClick={() => addItem(item)}
        aria-label={`Increase quantity of ${item.name}`}
        className={`w-11 h-11 flex items-center justify-center transition-colors active:scale-95 cursor-pointer rounded-r-md focus:outline-none focus:ring-1 ${
          isLight
            ? 'hover:bg-[#6A0019]/10 text-[#6A0019] focus:ring-[#6A0019]'
            : 'hover:bg-[#EFE6DC]/15 text-[#EFE6DC] focus:ring-[#EFE6DC]'
        }`}
      >
        <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>
    </div>
  );
}
