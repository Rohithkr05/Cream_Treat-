'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  ShoppingBag,
  Hash,
  AlertCircle,
  CheckCircle2,
  UtensilsCrossed,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/components/CartItem';
import { formatCurrency } from '@/lib/api';

function CartPageContent() {
  const searchParams = useSearchParams();
  const {
    items,
    tableNumber,
    setTableNumber,
    totalItemCount,
    totalAmountPaise,
  } = useCart();

  const [tableInput, setTableInput] = useState(
    tableNumber ? tableNumber.toString() : '',
  );
  const [tableError, setTableError] = useState<string | null>(null);
  const [isReadyConfirmed, setIsReadyConfirmed] = useState(false);

  // Sync table from query parameter if provided (e.g. /cart?table=5)
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      const parsed = parseInt(tableParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setTableNumber(parsed);
        setTableInput(parsed.toString());
      }
    }
  }, [searchParams, setTableNumber]);

  // Keep tableInput in sync if tableNumber was loaded from localStorage
  useEffect(() => {
    if (tableNumber && !tableInput) {
      setTableInput(tableNumber.toString());
    }
  }, [tableNumber, tableInput]);

  const menuUrl = tableNumber ? `/order?table=${tableNumber}` : '/order';

  const validateAndSaveTable = (value: string): boolean => {
    const trimmed = value.trim();
    if (!trimmed) {
      setTableError('Please enter your table number.');
      return false;
    }

    // Must be a positive integer without decimals
    if (!/^\d+$/.test(trimmed)) {
      setTableError('Table number must be a positive whole number.');
      return false;
    }

    const parsed = parseInt(trimmed, 10);
    if (parsed <= 0 || parsed > 999) {
      setTableError('Please enter a valid table number (1–999).');
      return false;
    }

    setTableError(null);
    setTableNumber(parsed);
    return true;
  };

  const handleTableInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTableInput(val);
    if (tableError) {
      setTableError(null);
    }
    // Auto-save if valid
    const trimmed = val.trim();
    if (/^\d+$/.test(trimmed)) {
      const parsed = parseInt(trimmed, 10);
      if (parsed > 0 && parsed <= 999) {
        setTableNumber(parsed);
      }
    }
  };

  const handlePlaceOrderClick = () => {
    setIsReadyConfirmed(false);

    if (items.length === 0) {
      return;
    }

    const isValidTable = validateAndSaveTable(tableInput);
    if (!isValidTable) {
      return;
    }

    // Phase 6 UI verification: cart and table are valid. Order creation is in Phase 7.
    setIsReadyConfirmed(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={menuUrl}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-100 transition-colors"
            aria-label="Back to digital menu"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Menu</span>
          </Link>

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center">
              <UtensilsCrossed className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-stone-900 tracking-tight">
              Cream Treat
            </span>
          </div>

          <span className="text-xs font-medium text-stone-400">Review</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4 pb-32">
        {items.length === 0 ? (
          /* Empty Cart State */
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-4 border border-stone-200/60 shadow-2xs">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-stone-900 tracking-tight">
              Your cart is empty
            </h2>
            <p className="mt-1.5 text-xs text-stone-500 max-w-xs leading-relaxed">
              Add some delicious dishes and drinks from our menu to begin your order.
            </p>
            <Link
              href={menuUrl}
              className="mt-6 inline-flex items-center justify-center px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs shadow-amber-600/20 transition-all"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          /* Cart Review View */
          <div className="space-y-4">
            {/* Table Number Card */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="tableInput"
                  className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Hash className="w-3.5 h-3.5 text-amber-600" />
                  <span>Table Number</span>
                </label>
                {tableNumber && !tableError && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Confirmed
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id="tableInput"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={tableInput}
                    onChange={handleTableInputChange}
                    placeholder="Enter table number (e.g. 5)"
                    className={`w-full px-3.5 py-2 text-sm font-semibold rounded-xl border transition-all focus:outline-none focus:ring-2 ${
                      tableError
                        ? 'border-rose-300 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                        : 'border-stone-200 bg-stone-50 text-stone-900 focus:bg-white focus:ring-amber-500'
                    }`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => validateAndSaveTable(tableInput)}
                  className="px-3.5 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl hover:bg-stone-800 active:scale-95 transition-all shadow-2xs"
                >
                  Set Table
                </button>
              </div>

              {tableError ? (
                <p className="mt-1.5 text-xs text-rose-600 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{tableError}</span>
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-stone-400">
                  {tableNumber
                    ? `Food will be delivered to Table ${tableNumber}.`
                    : 'Please enter your table number to proceed with ordering.'}
                </p>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                  Ordered Items ({totalItemCount})
                </h3>
              </div>

              <div className="grid gap-2.5">
                {items.map((item) => (
                  <CartItem key={item.foodItem._id} item={item} />
                ))}
              </div>
            </div>

            {/* + Add More Items Link */}
            <div className="pt-1">
              <Link
                href={menuUrl}
                className="w-full py-2.5 px-4 bg-white hover:bg-stone-100 active:scale-98 border border-dashed border-stone-300 rounded-xl text-xs font-bold text-amber-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add More Items</span>
              </Link>
            </div>

            {/* Order Summary Card */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider border-b border-stone-100 pb-2">
                Order Summary
              </h3>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">
                    {formatCurrency(totalAmountPaise)}
                  </span>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-2.5 flex justify-between items-baseline">
                <span className="text-sm font-bold text-stone-900">Total</span>
                <span className="text-lg font-bold text-stone-900">
                  {formatCurrency(totalAmountPaise)}
                </span>
              </div>
            </div>

            {/* Phase 6 Validation Notice */}
            {isReadyConfirmed && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Order details confirmed for Table {tableNumber}!
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Ready for order creation. Backend order creation and daily sequence generation will be executed in Phase 7.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sticky Bottom Action Bar (if cart has items) */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200/80 p-4 shadow-lg shadow-stone-950/5">
          <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] text-stone-400 font-medium">To Pay</p>
              <p className="text-base font-bold text-stone-900">
                {formatCurrency(totalAmountPaise)}
              </p>
            </div>

            <button
              onClick={handlePlaceOrderClick}
              className="flex-1 max-w-xs py-3 px-5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Confirm & Place Order</span>
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
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <CartPageContent />
    </Suspense>
  );
}
