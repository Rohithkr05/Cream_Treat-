'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, ShoppingBag, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/components/CartItem';
import { createOrder } from '@/lib/api';
import { executeProtectedCheckout } from '@/lib/checkout';
import { validateCustomerTableNumber } from '@/lib/qr';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const router = useRouter();
  const { items, tableNumber, setTableNumber, clearCart, totalItemCount, totalAmountPaise } =
    useCart();

  const [tableInput, setTableInput] = useState(tableNumber ? tableNumber.toString() : '');
  const [tableError, setTableError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  if (!isOpen) return null;

  const totalRupees = Math.round(totalAmountPaise / 100);

  const handlePlaceOrder = async () => {
    if (submittingRef.current || isSubmitting) return;

    if (items.length === 0) {
      setSubmitError('Your cart is empty. Please add items to place an order.');
      return;
    }

    // Validate table number
    let targetTable = tableNumber;
    if (!targetTable) {
      const res = validateCustomerTableNumber(tableInput);
      if (!res.isValid || res.value === undefined) {
        setTableError(res.error || 'Please enter your table number.');
        return;
      }
      targetTable = res.value;
      setTableNumber(targetTable);
      setTableError(null);
    }

    if (submittingRef.current) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const outcome = await executeProtectedCheckout({
      lock: submittingRef,
      tableNumber: targetTable,
      items,
      submitOrder: createOrder,
      onSuccess: (orderResponse) => {
        try {
          sessionStorage.setItem('cream_treat_last_order', JSON.stringify(orderResponse));
        } catch {
          // Ignore session storage error
        }
        clearCart();
        onClose();
        router.push(`/order-success?orderId=${encodeURIComponent(orderResponse.id)}`);
      },
    });

    if (outcome.status === 'validation_error' || outcome.status === 'failed') {
      setIsSubmitting(false);
      setSubmitError(
        outcome.error || "We couldn't place your order right now. Please try again.",
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Order Cart"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
    >
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer / Bottom Sheet Container */}
      <div className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-[#FBF7F2] text-[#6A0019] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#6A0019]/20 z-10 animate-in slide-in-from-bottom duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#6A0019]/15 bg-[#EFE6DC]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#6A0019] text-[#EFE6DC] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#6A0019] leading-tight">
                Your Order
              </h3>
              <span className="text-xs text-[#6A0019]/70 font-body">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {tableNumber && (
              <span className="text-xs uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-[#6A0019]/10 text-[#6A0019] border border-[#6A0019]/20">
                Table {tableNumber}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close cart drawer"
              className="p-1.5 rounded-full text-[#6A0019]/60 hover:text-[#6A0019] hover:bg-[#6A0019]/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 no-scrollbar">
          {items.length === 0 ? (
            <div className="py-12 text-center text-[#6A0019]/60">
              <p className="font-display text-base">Your cart is empty.</p>
              <p className="text-xs font-body mt-1">Browse the menu to add delicious items.</p>
            </div>
          ) : (
            items.map((cartItem) => (
              <CartItem key={cartItem.foodItem._id} item={cartItem} />
            ))
          )}

          {/* Table Input if not yet set */}
          {!tableNumber && items.length > 0 && (
            <div className="pt-3 pb-1 border-t border-[#6A0019]/15">
              <label
                htmlFor="drawer-table-input"
                className="block font-display text-xs uppercase tracking-wider font-bold mb-1.5 text-[#6A0019]"
              >
                Dining Table Number:
              </label>
              <div className="flex gap-2">
                <input
                  id="drawer-table-input"
                  type="number"
                  min="1"
                  max="999"
                  value={tableInput}
                  onChange={(e) => {
                    setTableInput(e.target.value);
                    if (tableError) setTableError(null);
                  }}
                  placeholder="e.g. 5"
                  className="flex-1 px-3 py-2 rounded-xl border border-[#6A0019]/30 bg-white font-body text-sm text-[#6A0019] focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                />
              </div>
              {tableError && (
                <p className="text-xs text-rose-700 mt-1 font-medium">{tableError}</p>
              )}
            </div>
          )}

          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}
        </div>

        {/* Drawer Footer with Subtotal & Place Order */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-[#6A0019]/15 bg-[#EFE6DC]/40 shrink-0 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="font-display text-xs uppercase tracking-widest font-semibold text-[#6A0019]/80">
                Total Payable (INR)
              </span>
              <span className="font-body text-xl font-bold text-[#6A0019] tabular-nums">
                ₹{totalRupees}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-full bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] font-display text-xs sm:text-sm uppercase tracking-[0.2em] font-bold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Order...</span>
                </>
              ) : (
                <>
                  <span>Place Dine-In Order</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
