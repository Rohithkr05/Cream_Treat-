'use client';

import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/types/menu';
import { formatCurrency } from '@/lib/api';
import { useCart } from '@/hooks/useCart';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { addItem, removeItem, deleteItem } = useCart();
  const { foodItem, quantity } = item;
  const itemTotalPaise = foodItem.price * quantity;

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs flex flex-col gap-3">
      {/* Top row: Name, Unit Price, and Direct Delete */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-stone-900 text-sm leading-snug tracking-tight">
            {foodItem.name}
          </h4>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            {formatCurrency(foodItem.price)} each
          </p>
        </div>

        {/* Delete button */}
        <button
          onClick={() => deleteItem(foodItem._id)}
          aria-label={`Remove ${foodItem.name} from cart`}
          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors active:scale-95"
          title="Remove item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Bottom row: Quantity Stepper & Item Total */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        {/* Quantity Stepper */}
        <div className="flex items-center bg-stone-100 text-stone-900 rounded-lg border border-stone-200 p-0.5 shadow-2xs">
          <button
            onClick={() => removeItem(foodItem._id)}
            aria-label="Decrease quantity"
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white text-stone-700 active:scale-90 transition-all"
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <span className="w-8 text-center text-xs font-bold font-mono">
            {quantity}
          </span>
          <button
            onClick={() => addItem(foodItem)}
            aria-label="Increase quantity"
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white text-stone-700 active:scale-90 transition-all"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>

        {/* Item Total */}
        <div className="text-right">
          <span className="text-[11px] text-stone-400 font-medium block">
            Item Total
          </span>
          <span className="font-bold text-stone-900 text-sm tracking-tight">
            {formatCurrency(itemTotalPaise)}
          </span>
        </div>
      </div>
    </div>
  );
}
