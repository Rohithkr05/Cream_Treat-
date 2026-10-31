'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, Utensils } from 'lucide-react';
import { FoodItem } from '@/types/menu';
import { formatCurrency } from '@/lib/api';
import { useCart } from '@/hooks/useCart';

interface FoodCardProps {
  item: FoodItem;
}

export function FoodCard({ item }: FoodCardProps) {
  const { getItemQuantity, addItem, removeItem } = useCart();
  const quantity = getItemQuantity(item._id);

  const [imageError, setImageError] = React.useState(false);
  const showImage = Boolean(item.imageUrl && item.imageUrl.trim()) && !imageError;

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs hover:border-amber-200/80 transition-all duration-200 flex flex-col justify-between gap-3">
      <div className="flex gap-3.5">
        {/* Food Details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-stone-900 leading-snug tracking-tight">
            {item.name}
          </h3>

          {item.description && (
            <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-bold text-base text-stone-900">
              {formatCurrency(item.price)}
            </span>
          </div>
        </div>

        {/* Optional Image or Clean Restaurant Placeholder */}
        <div className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-stone-100 border border-stone-200/60 flex items-center justify-center">
          {showImage ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              unoptimized
              className="object-cover"
              sizes="96px"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-stone-300 gap-1 p-2 text-center">
              <Utensils className="w-6 h-6 stroke-[1.5]" />
              <span className="text-[9px] font-medium tracking-wider uppercase text-stone-400">
                Cream Treat
              </span>
            </div>
          )}

          {!item.isAvailable && (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-2xs flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wider text-center px-1">
              Sold Out
            </div>
          )}
        </div>
      </div>

      {/* Action Area */}
      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
        <span className="text-[11px] text-stone-400 font-medium">
          {item.isAvailable ? 'Freshly Prepared' : 'Unavailable today'}
        </span>

        {item.isAvailable && (
          <div>
            {quantity === 0 ? (
              <button
                onClick={() => addItem(item)}
                className="px-5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-xs shadow-amber-600/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ADD</span>
              </button>
            ) : (
              <div className="flex items-center bg-stone-900 text-white rounded-lg px-1 py-1 shadow-xs">
                <button
                  onClick={() => removeItem(item._id)}
                  aria-label="Decrease quantity"
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-800 active:scale-90 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="w-8 text-center text-xs font-bold font-mono">
                  {quantity}
                </span>
                <button
                  onClick={() => addItem(item)}
                  aria-label="Increase quantity"
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-800 active:scale-90 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
