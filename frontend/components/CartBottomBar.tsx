'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/hooks/useCart';

interface CartBottomBarProps {
  onOpenCart?: () => void;
}

export function CartBottomBar({ onOpenCart }: CartBottomBarProps) {
  const { totalItemCount, totalAmountPaise, tableNumber } = useCart();

  if (totalItemCount === 0) {
    return null;
  }

  const totalRupees = Math.round(totalAmountPaise / 100);
  const cartUrl = tableNumber ? `/cart?table=${tableNumber}` : '/cart';

  const content = (
    <div className="flex items-center justify-between bg-[#6A0019] text-[#EFE6DC] py-3.5 px-4 sm:px-5 rounded-2xl shadow-xl border border-[#EFE6DC]/25 backdrop-blur-xs transition-all duration-300">
      {/* Left: Quantity & Total Price */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#EFE6DC]/15 border border-[#EFE6DC]/25 flex items-center justify-center relative text-[#EFE6DC]">
          <ShoppingBag className="w-4 h-4" />
          <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-[#EFE6DC] text-[#6A0019] font-body font-extrabold text-[10px] rounded-full flex items-center justify-center">
            {totalItemCount}
          </span>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-body text-xs font-semibold text-[#EFE6DC]/85">
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
            </span>
            {tableNumber && (
              <span className="text-[10px] uppercase tracking-wider font-bold bg-[#EFE6DC]/15 text-[#EFE6DC] px-1.5 py-0.5 rounded-sm">
                Table {tableNumber}
              </span>
            )}
          </div>
          <p className="font-body text-base font-bold text-[#EFE6DC] tabular-nums tracking-tight">
            ₹{totalRupees}
          </p>
        </div>
      </div>

      {/* Right: View Cart Button */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#EFE6DC] text-[#6A0019] font-display text-xs uppercase tracking-[0.16em] font-bold hover:bg-white transition-colors cursor-pointer shadow-xs">
        <span>View Cart</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="max-w-xl mx-auto pointer-events-auto">
        {onOpenCart ? (
          <button
            type="button"
            onClick={onOpenCart}
            aria-label={`View cart with ${totalItemCount} items totaling ₹${totalRupees}`}
            className="w-full text-left cursor-pointer active:scale-[0.99] transition-transform"
          >
            {content}
          </button>
        ) : (
          <Link
            href={cartUrl}
            aria-label={`View cart with ${totalItemCount} items totaling ₹${totalRupees}`}
            className="block active:scale-[0.99] transition-transform"
          >
            {content}
          </Link>
        )}
      </div>
    </div>
  );
}
