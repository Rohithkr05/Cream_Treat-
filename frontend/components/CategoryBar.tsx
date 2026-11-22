'use client';

import React from 'react';
import { Category } from '@/types/menu';

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

const CATEGORY_META: Record<string, { icon: string; tag: string }> = {
  Sundae: { icon: '🍨', tag: 'Sweet Tooth' },
  Milkshake: { icon: '🥤', tag: 'Madness' },
  Mains: { icon: '🍔', tag: 'Mustly Mains' },
  'Cheat Meal': { icon: '🍟', tag: 'Feel-Good' },
  Sides: { icon: '🧅', tag: 'Situationship' },
  Mojito: { icon: '🍹', tag: 'Magic' },
};

export function CategoryBar({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryBarProps) {
  return (
    <div className="sticky top-[61px] z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200/80 py-2.5 px-4 shadow-xs">
      <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {/* "All" button */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-150 ${
            selectedCategoryId === null
              ? 'bg-[#4A0E1A] text-white shadow-md shadow-[#4A0E1A]/20 ring-2 ring-[#D4AF37]/40'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 hover:text-stone-900 shadow-2xs'
          }`}
        >
          <span>✨</span>
          <span>All Menu</span>
        </button>

        {/* Dynamic 6 Categories from PDF */}
        {categories.map((category) => {
          const isSelected = selectedCategoryId === category._id;
          const meta = CATEGORY_META[category.name] || {
            icon: '🍽️',
            tag: category.description || '',
          };

          return (
            <button
              key={category._id}
              onClick={() => onSelectCategory(category._id)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all duration-150 ${
                isSelected
                  ? 'bg-[#4A0E1A] text-white shadow-md shadow-[#4A0E1A]/20 ring-2 ring-[#D4AF37]/40'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 hover:text-stone-900 shadow-2xs'
              }`}
            >
              <span className="text-sm">{meta.icon}</span>
              <div className="flex flex-col text-left">
                <span className="leading-none">{category.name}</span>
                {meta.tag && (
                  <span
                    className={`text-[9px] font-medium leading-tight mt-0.5 ${
                      isSelected ? 'text-[#F3D7A4]' : 'text-stone-400'
                    }`}
                  >
                    {meta.tag}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
