'use client';

import React from 'react';
import Image from 'next/image';
import { Plus, Minus, Utensils } from 'lucide-react';
import { FoodItem } from '@/types/menu';
import { formatCurrency } from '@/lib/api';
import { isValidMongoObjectId } from '@/lib/checkout';
import { useCart } from '@/hooks/useCart';

interface FoodCardProps {
  item: FoodItem;
}

function isDrinkItem(item: FoodItem): boolean {
  const name = item.name.toLowerCase();
  const catName =
    typeof item.categoryId === 'object' && item.categoryId?.name
      ? item.categoryId.name.toLowerCase()
      : '';
  return (
    catName.includes('shake') ||
    catName.includes('coffee') ||
    catName.includes('mojito') ||
    catName.includes('lassi') ||
    name.includes('mojito') ||
    name.includes('milkshake') ||
    name.includes('cold coffee') ||
    name.includes('bubble milk') ||
    name.includes('lassi')
  );
}

export function FoodCard({ item }: FoodCardProps) {
  const { getItemQuantity, addItem, removeItem } = useCart();
  const isOrderable = item.isAvailable && isValidMongoObjectId(item._id);
  const quantity = isOrderable ? getItemQuantity(item._id) : 0;
  const isDrink = isDrinkItem(item);

  const [imageError, setImageError] = React.useState(false);
  const showImage = Boolean(item.imageUrl && item.imageUrl.trim()) && !imageError;

  return (
    <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs hover:shadow-md hover:border-[#D4AF37]/50 transition-all duration-200 flex flex-col justify-between gap-3 group">
      <div className="flex gap-3.5">
        {/* Food Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* Indian Veg Badge */}
            <div className="w-3.5 h-3.5 border border-emerald-600 rounded-xs flex items-center justify-center p-0.5" title="Vegetarian">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            </div>
            <h3 className="font-bold text-base text-stone-900 leading-snug tracking-tight">
              {item.name}
            </h3>
          </div>

          {item.description && (
            <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed font-normal">
              {item.description}
            </p>
          )}

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-extrabold text-base text-[#4A0E1A]">
              {formatCurrency(item.price)}
            </span>
          </div>
        </div>

        {/* Dish Image: Contain & centered for drinks, cover for food */}
        <div
          className={`relative shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ${
            isDrink
              ? 'bg-gradient-to-b from-[#40000E] to-[#2B000A] border-[#6A0019]/30 p-1.5'
              : 'bg-stone-100 border-stone-200/80'
          } border shadow-inner flex items-center justify-center`}
        >
          {showImage && item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.name}
              fill
              unoptimized
              className={`${
                isDrink
                  ? 'object-contain object-center p-1 group-hover:scale-105'
                  : 'object-cover group-hover:scale-105'
              } transition-transform duration-300`}
              sizes="(max-width: 640px) 96px, 112px"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-stone-300 gap-1 p-2 text-center">
              <Utensils className="w-6 h-6 stroke-[1.5] text-[#D4AF37]/60" />
              <span className="text-[9px] font-bold tracking-wider uppercase text-stone-400">
                Cream Treat
              </span>
            </div>
          )}

          {!item.isAvailable && (
            <div className="absolute inset-0 bg-stone-950/70 backdrop-blur-2xs flex items-center justify-center text-[10px] font-extrabold text-white uppercase tracking-wider text-center px-1">
              Sold Out
            </div>
          )}
        </div>
      </div>

      {/* Action Area */}
      <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between">
        <span className="text-[11px] text-stone-400 font-medium">
          {item.isAvailable ? 'Freshly made for dine-in' : 'Currently sold out'}
        </span>

        {isOrderable && (
          <div>
            {quantity === 0 ? (
              <button
                onClick={() => addItem(item)}
                className="px-4 py-1.5 bg-[#4A0E1A] hover:bg-[#631424] active:scale-95 text-[#F3D7A4] hover:text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 border border-[#8C2338]/40"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ADD</span>
              </button>
            ) : (
              <div className="flex items-center bg-[#4A0E1A] text-white rounded-xl px-1 py-1 shadow-sm border border-[#8C2338]/40">
                <button
                  onClick={() => removeItem(item._id)}
                  aria-label="Decrease quantity"
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-90 transition-colors text-[#F3D7A4]"
                >
                  <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="w-7 text-center text-xs font-black font-mono text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => addItem(item)}
                  aria-label="Increase quantity"
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 active:scale-90 transition-colors text-[#F3D7A4]"
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
