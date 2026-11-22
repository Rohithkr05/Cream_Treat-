'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Utensils } from 'lucide-react';
import { FoodItem } from '@/types/menu';
import { AddControl } from '@/components/AddControl';

export interface FeaturedDish {
  foodItem: FoodItem;
  image: string;
  alt?: string;
}

interface FeaturedPhotoGridProps {
  dishes: FeaturedDish[];
  theme: 'light' | 'dark';
  sectionId?: string;
}

export function FeaturedPhotoGrid({
  dishes,
  theme,
  sectionId,
}: FeaturedPhotoGridProps) {
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  if (!dishes || dishes.length === 0) return null;

  const isLight = theme === 'light';
  const isDrinkSection = sectionId === 'milkshake' || sectionId === 'mojito';
  const borderColor = isLight ? 'border-[#6A0019]/15' : 'border-[#EFE6DC]/20';
  const nameColor = isLight ? 'text-[#6A0019]' : 'text-[#EFE6DC]';
  const priceColor = isLight ? 'text-[#6A0019]/80' : 'text-[#EFE6DC]/85';
  const cardBg = isLight ? 'bg-[#EFE6DC]/30' : 'bg-[#520013]/60';
  const fallbackBg = isLight
    ? 'bg-[#EFE6DC]/60 text-[#6A0019]/60'
    : 'bg-[#6A0019]/40 text-[#EFE6DC]/70';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {dishes.map((dish, index) => {
        const item = dish.foodItem;
        const priceRupees = Math.round(item.price / 100);
        const dishKey = item._id || dish.image + index;
        const hasValidImage =
          Boolean(dish.image && dish.image.trim()) && !failedImages[dishKey];

        return (
          <figure
            key={dishKey}
            className={`group overflow-hidden rounded-2xl border ${borderColor} ${cardBg} p-3 sm:p-3.5 flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-[#EFE6DC]/40`}
          >
            {/* Image Container: Portrait 4:5 for Milkshake & Mojito glasses, 4:3 for food plates */}
            <div
              className={`relative w-full overflow-hidden rounded-xl ${
                isDrinkSection
                  ? 'aspect-[4/5] bg-gradient-to-b from-[#40000E] via-[#520013] to-[#38000C] border border-[#EFE6DC]/10 shadow-inner flex items-center justify-center p-2.5 sm:p-3.5'
                  : 'aspect-4/3 bg-black/5'
              }`}
            >
              {hasValidImage ? (
                <Image
                  src={dish.image}
                  alt={dish.alt || item.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                  className={`${
                    isDrinkSection
                      ? 'object-contain object-center p-2 sm:p-3 transition-transform duration-500 ease-out group-hover:scale-105'
                      : 'object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]'
                  }`}
                  loading="lazy"
                  onError={() =>
                    setFailedImages((prev) => ({ ...prev, [dishKey]: true }))
                  }
                />
              ) : (
                <div
                  className={`w-full h-full flex flex-col items-center justify-center gap-1.5 ${fallbackBg}`}
                >
                  <Utensils className="w-7 h-7 opacity-70" />
                  <span className="font-display text-[11px] uppercase tracking-widest font-semibold">
                    Cream Treat
                  </span>
                </div>
              )}
              {!item.isAvailable && (
                <div className="absolute inset-0 bg-[#6A0019]/80 backdrop-blur-2xs flex items-center justify-center z-10">
                  <span className="font-display text-xs uppercase tracking-widest text-[#EFE6DC] font-bold px-3 py-1 border border-[#EFE6DC]/40 rounded-full">
                    Sold Out
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Caption & Add Control */}
            <figcaption className="mt-3 pt-1 flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span
                  className={`font-display text-sm sm:text-base font-semibold tracking-tight block truncate ${nameColor}`}
                  title={item.name}
                >
                  {item.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`font-body text-xs sm:text-sm font-medium tabular-nums ${priceColor}`}
                  >
                    ₹{priceRupees}
                  </span>
                  {isDrinkSection && (
                    <span className="text-[10px] uppercase font-mono tracking-wider opacity-60 text-[#EFE6DC]">
                      · Chilled
                    </span>
                  )}
                </div>
              </div>

              {/* Add / Stepper Control wired to cart */}
              <div className="shrink-0">
                <AddControl item={item} theme={theme} />
              </div>
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
