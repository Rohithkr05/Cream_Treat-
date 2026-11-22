'use client';

import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/types/menu';
import { useCart } from '@/hooks/useCart';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { addItem, removeItem, deleteItem } = useCart();
  const { foodItem, quantity } = item;
  const unitPriceRupees = Math.round(foodItem.price / 100);
  const linePriceRupees = unitPriceRupees * quantity;

  return (
    <div className="bg-[#EFE6DC]/40 rounded-xl p-3.5 sm:p-4 border border-[#6A0019]/15 flex flex-col gap-2.5">
      {/* Top Row: Name, Unit Price, and Delete Button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-display font-semibold text-sm sm:text-base text-[#6A0019] leading-snug">
            {foodItem.name}
          </h4>
          <p className="text-xs text-[#6A0019]/70 font-body tabular-nums mt-0.5">
            ₹{unitPriceRupees} each
          </p>
        </div>

        <button
          type="button"
          onClick={() => deleteItem(foodItem._id)}
          aria-label={`Remove ${foodItem.name} from order`}
          className="p-2 text-[#6A0019]/50 hover:text-[#6A0019] hover:bg-[#6A0019]/10 rounded-lg transition-colors cursor-pointer"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom Row: Stepper and Line Price */}
      <div className="flex items-center justify-between pt-2 border-t border-[#6A0019]/10">
        {/* Quantity Stepper */}
        <div
          role="group"
          aria-label={`Adjust quantity of ${foodItem.name}`}
          className="inline-flex items-center rounded-lg border border-[#6A0019] bg-[#FBF7F2] text-[#6A0019]"
        >
          <button
            type="button"
            onClick={() => removeItem(foodItem._id)}
            aria-label={`Decrease quantity of ${foodItem.name}`}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-[#6A0019]/10 transition-colors cursor-pointer rounded-l-md"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
          <span className="w-7 text-center font-body text-xs sm:text-sm font-bold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => addItem(foodItem)}
            aria-label={`Increase quantity of ${foodItem.name}`}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center hover:bg-[#6A0019]/10 transition-colors cursor-pointer rounded-r-md"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>

        {/* Line Price */}
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-[#6A0019]/60 block font-semibold">
            Line Total
          </span>
          <span className="font-body text-sm sm:text-base font-bold text-[#6A0019] tabular-nums">
            ₹{linePriceRupees}
          </span>
        </div>
      </div>
    </div>
  );
}
