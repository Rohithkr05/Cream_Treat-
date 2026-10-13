'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/lib/api';

export function CartBottomBar() {
  const { totalItemCount, totalAmountPaise, tableNumber } = useCart();

  if (totalItemCount === 0) {
    return null;
  }

  const cartUrl = tableNumber ? `/cart?table=${tableNumber}` : '/cart';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <Link
          href={cartUrl}
          className="flex items-center justify-between bg-stone-900 text-white p-3.5 px-5 rounded-2xl shadow-xl shadow-stone-950/20 border border-stone-800 hover:bg-stone-800 active:scale-[0.99] transition-all group"
        >
          {/* Cart Quantity & Total */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center relative">
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-stone-950 font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-stone-900">
                {totalItemCount}
              </span>
            </div>
            <div>
              <p className="text-xs text-stone-400 font-medium">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} in order
              </p>
              <p className="text-base font-bold text-white tracking-tight">
                {formatCurrency(totalAmountPaise)}
              </p>
            </div>
          </div>

          {/* Action */}
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 group-hover:translate-x-0.5 transition-transform">
            <span>View Cart</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
      </div>
    </div>
  );
}
