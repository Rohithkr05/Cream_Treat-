import React from 'react';

export function MenuSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Search Bar Skeleton */}
      <div className="h-10 bg-stone-200/70 rounded-xl w-full" />

      {/* Category Pills Skeleton */}
      <div className="flex gap-2 overflow-hidden py-1">
        <div className="h-8 bg-stone-200/70 rounded-full w-20 shrink-0" />
        <div className="h-8 bg-stone-200/70 rounded-full w-24 shrink-0" />
        <div className="h-8 bg-stone-200/70 rounded-full w-28 shrink-0" />
        <div className="h-8 bg-stone-200/70 rounded-full w-20 shrink-0" />
      </div>

      {/* Food Cards Skeleton */}
      <div className="grid gap-3 pt-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-4 border border-stone-200/60 flex items-center justify-between gap-4"
          >
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-stone-200 rounded-md w-3/4" />
              <div className="h-3 bg-stone-200/70 rounded-md w-full" />
              <div className="h-3 bg-stone-200/70 rounded-md w-1/2" />
              <div className="h-4 bg-stone-200 rounded-md w-1/4 pt-1" />
            </div>
            <div className="w-24 h-24 bg-stone-200/70 rounded-xl shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
