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
    <div className="sticky top-[61px] z-20 bg-stone-50/95 backdrop-blur-md border-b border-stone-200/80 py-2.5 px-4 shadow-2xs">
      <div className="max-w-3xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {/* "All" category button */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150 ${
            selectedCategoryId === null
              ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30 ring-2 ring-amber-600/20'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 hover:text-stone-900'
          }`}
        >
          All Items
        </button>

        {/* Dynamic Category Buttons */}
        {categories.map((category) => {
          const isSelected = selectedCategoryId === category._id;
          return (
            <button
              key={category._id}
              onClick={() => onSelectCategory(category._id)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-150 ${
                isSelected
                  ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/30 ring-2 ring-amber-600/20'
                  : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 hover:text-stone-900'
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
