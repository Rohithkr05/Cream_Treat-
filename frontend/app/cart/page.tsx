'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingBag,
  Hash,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/components/CartItem';
import { createOrder } from '@/lib/api';
import { executeProtectedCheckout } from '@/lib/checkout';
import { parseTableUrlParam, validateCustomerTableNumber } from '@/lib/qr';

function CartPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    items,
    tableNumber,
    setTableNumber,
    clearCart,
    totalItemCount,
    totalAmountPaise,
  } = useCart();

  const [tableInput, setTableInput] = useState(
    tableNumber ? tableNumber.toString() : '',
  );
  const [tableError, setTableError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Sync table from query parameter if provided (e.g. /cart?table=5)
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam !== null) {
      const res = parseTableUrlParam(tableParam);
      if (res.status === 'VALID') {
        setTableNumber(res.tableNumber);
        setTableInput(res.tableNumber.toString());
        setTableError(null);
      } else {
        setTableError('Invalid table number.');
        setTableInput(tableParam);
        setTableNumber(null);
      }
    }
  }, [searchParams, setTableNumber]);

  // Keep tableInput in sync if tableNumber was loaded from localStorage
  useEffect(() => {
    if (tableNumber && !tableInput && !tableError) {
      setTableInput(tableNumber.toString());
    }
  }, [tableNumber, tableInput, tableError]);

  const menuUrl = tableNumber ? `/order?table=${tableNumber}` : '/order';
  const totalRupees = Math.round(totalAmountPaise / 100);

  const validateAndSaveTable = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setTableError('Please enter your table number.');
      setTableNumber(null);
      return false;
    }

    const res = validateCustomerTableNumber(trimmed);
    if (!res.isValid || res.value === undefined) {
      setTableError(res.error || 'Invalid table number.');
      setTableNumber(null);
      return false;
    }

    setTableError(null);
    setTableNumber(res.value);
    return true;
  };

  const handleTableInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTableInput(val);
    if (submitError) {
      setSubmitError(null);
    }
    const trimmed = val.trim();
    if (!trimmed) {
      setTableError('Please enter your table number.');
      setTableNumber(null);
      return;
    }
    const res = validateCustomerTableNumber(trimmed);
    if (res.isValid && res.value !== undefined) {
      setTableNumber(res.value);
      setTableError(null);
    } else {
      setTableError(res.error || 'Invalid table number.');
      setTableNumber(null);
    }
  };

  const handlePlaceOrderClick = async () => {
    if (submittingRef.current || isSubmitting) return;

    if (items.length === 0) {
      setSubmitError('Your cart is empty. Please add items to place an order.');
      return;
    }

    if (tableError) {
      return;
    }

    const isValidTable = validateAndSaveTable(tableInput);
    if (!isValidTable) {
      return;
    }

    const targetTable = parseInt(tableInput.trim(), 10);
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
          sessionStorage.setItem(
            'cream_treat_last_order',
            JSON.stringify(orderResponse),
          );
        } catch {
          // Ignore session storage error
        }
        clearCart();
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
    <div className="min-h-screen bg-[#FBF7F2] text-[#6A0019] flex flex-col font-body selection:bg-[#6A0019] selection:text-[#EFE6DC]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#6A0019] text-[#EFE6DC] border-b border-[#EFE6DC]/20 shadow-xs">
        <div className="max-w-xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href={menuUrl}
            className="flex items-center gap-1.5 text-xs font-bold text-[#EFE6DC] hover:text-white px-3 py-1.5 rounded-full bg-[#EFE6DC]/10 hover:bg-[#EFE6DC]/20 transition-all cursor-pointer font-display uppercase tracking-wider"
            aria-label="Back to menu"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Menu</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-full overflow-hidden border border-[#EFE6DC]/30 p-0.5 bg-[#EFE6DC]">
              <Image
                src="/images/cream-treat-logo.jpg"
                alt="Cream Treat Logo"
                fill
                sizes="28px"
                className="object-cover rounded-full"
              />
            </div>
            <span className="font-display font-extrabold text-sm tracking-wider uppercase text-[#EFE6DC]">
              Cream Treat
            </span>
          </div>

          <span className="font-display text-xs uppercase tracking-widest text-[#EFE6DC]/80 font-semibold">
            Review Order
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 pb-36">
        {items.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#EFE6DC] text-[#6A0019] flex items-center justify-center mb-4 border border-[#6A0019]/20 shadow-xs">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-display font-bold text-[#6A0019] tracking-tight">
              Your cart is empty
            </h2>
            <p className="mt-1.5 text-xs text-[#6A0019]/75 max-w-xs leading-relaxed font-body">
              Explore our freshly prepared sundaes, cold coffees, sandwiches, and snacks to start your order.
            </p>
            <Link
              href={menuUrl}
              className="mt-6 inline-flex items-center justify-center px-6 py-3 bg-[#6A0019] hover:bg-[#520013] active:scale-95 text-[#EFE6DC] text-xs font-display font-bold uppercase tracking-[0.2em] rounded-full shadow-xs transition-all cursor-pointer"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {submitError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-start gap-3 shadow-xs">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Order could not be placed</p>
                  <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed font-body">
                    {submitError}
                  </p>
                </div>
              </div>
            )}

            {/* Dining Table Confirmation Card */}
            <div className="bg-[#EFE6DC]/40 rounded-2xl p-4 sm:p-5 border border-[#6A0019]/20 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="tableInput"
                  className="text-xs font-display font-bold text-[#6A0019] uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Hash className="w-3.5 h-3.5 text-[#6A0019]" />
                  <span>Dining Table Number</span>
                </label>
                {tableNumber && !tableError && (
                  <span className="text-[10px] font-bold text-[#6A0019] bg-[#6A0019]/10 px-2 py-0.5 rounded-full border border-[#6A0019]/20 flex items-center gap-1 font-body">
                    <CheckCircle2 className="w-3 h-3 text-[#6A0019]" /> Confirmed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Hash className="w-4 h-4 text-[#6A0019]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="tableInput"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={isSubmitting}
                    value={tableInput}
                    onChange={handleTableInputChange}
                    placeholder="Enter table number (e.g. 5)"
                    className={`w-full pl-9 pr-3.5 py-2.5 text-sm font-bold font-body rounded-xl border transition-all focus:outline-none focus:ring-2 bg-white ${
                      tableError
                        ? 'border-rose-400 text-rose-900 focus:ring-rose-500'
                        : 'border-[#6A0019]/30 text-[#6A0019] focus:ring-[#6A0019]'
                    }`}
                  />
                </div>
              </div>

              {tableError && (
                <p className="mt-1.5 text-xs text-rose-700 font-medium">
                  {tableError}
                </p>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h3 className="font-display text-xs uppercase tracking-[0.2em] font-bold text-[#6A0019]">
                  Ordered Items ({totalItemCount})
                </h3>
                <Link
                  href={menuUrl}
                  className="text-xs text-[#6A0019]/70 hover:text-[#6A0019] font-medium transition-colors"
                >
                  + Add More
                </Link>
              </div>

              {items.map((cartItem) => (
                <CartItem key={cartItem.foodItem._id} item={cartItem} />
              ))}
            </div>

            {/* Bill Summary */}
            <div className="bg-[#EFE6DC]/30 rounded-2xl p-4 sm:p-5 border border-[#6A0019]/15 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-[#6A0019]/80 font-body">
                <span>Items Subtotal</span>
                <span className="tabular-nums font-semibold">₹{totalRupees}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[#6A0019]/80 font-body">
                <span>Taxes & Service</span>
                <span className="font-semibold">Inclusive</span>
              </div>
              <div className="pt-2 border-t border-[#6A0019]/15 flex items-baseline justify-between">
                <span className="font-display text-xs uppercase tracking-widest font-bold text-[#6A0019]">
                  Total Payable
                </span>
                <span className="font-body text-xl font-bold text-[#6A0019] tabular-nums">
                  ₹{totalRupees}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Action */}
      {items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-[#FBF7F2]/95 backdrop-blur-md border-t border-[#6A0019]/15">
          <div className="max-w-xl mx-auto flex items-center gap-4">
            <div className="shrink-0">
              <span className="text-[10px] uppercase tracking-wider text-[#6A0019]/60 block font-semibold">
                Total
              </span>
              <span className="font-body text-lg sm:text-xl font-bold text-[#6A0019] tabular-nums">
                ₹{totalRupees}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrderClick}
              disabled={isSubmitting}
              className="flex-1 py-3.5 px-6 rounded-full bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] font-display text-xs sm:text-sm uppercase tracking-[0.2em] font-bold shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <span>Place Dine-In Order →</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF7F2] p-4 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#6A0019]" />
        </div>
      }
    >
      <CartPageContent />
    </Suspense>
  );
}
