'use client';

import React from 'react';
import { Category } from '@/types/menu';

interface CategoryBarProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
}

export function CategoryBar({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryBarProps) {
  return (
    <div className="sticky top-[61px] z-20 bg-white/95 backdrop-blur-xs border-b border-stone-200/80 py-2 px-4 shadow-2xs">
      <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {/* "All" button */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
            selectedCategoryId === null
              ? 'bg-[#6A0019] text-[#EFE6DC] shadow-2xs'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          All Items
        </button>

        {/* Dynamic Categories */}
        {categories.map((category) => {
          const isSelected = selectedCategoryId === category._id;

          return (
            <button
              key={category._id}
              onClick={() => onSelectCategory(category._id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-[#6A0019] text-[#EFE6DC] shadow-2xs'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 hover:text-stone-900'
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
