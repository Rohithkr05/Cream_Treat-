'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  AlertCircle,
  RefreshCw,
  UtensilsCrossed,
  QrCode,
  X,
  Hash,
  Check,
} from 'lucide-react';
import { Category, FoodItem } from '@/types/menu';
import { fetchCategories, fetchFoodItems } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { Navbar } from '@/components/Navbar';
import { CategoryBar } from '@/components/CategoryBar';
import { FoodCard } from '@/components/FoodCard';
import { CartBottomBar } from '@/components/CartBottomBar';
import { MenuSkeleton } from '@/components/MenuSkeleton';
import { parseTableUrlParam, validateCustomerTableNumber } from '@/lib/qr';

function OrderMenuContent() {
  const searchParams = useSearchParams();
  const { setTableNumber, tableNumber } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Table Parameter State
  const [isInvalidTableParam, setIsInvalidTableParam] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [manualTableInput, setManualTableInput] = useState('');
  const [manualTableError, setManualTableError] = useState<string | null>(null);

  // Automatically sync table number from query parameters (e.g. /order?table=5)
  useEffect(() => {
    const rawParam = searchParams.get('table');

    if (rawParam !== null) {
      const parsed = parseTableUrlParam(rawParam);
      if (parsed.status === 'VALID') {
        setTableNumber(parsed.tableNumber);
        setIsInvalidTableParam(false);
      } else {
        // Invalid table in URL (e.g. ?table=abc, ?table=0, ?table=-1)
        setIsInvalidTableParam(true);
        setTableNumber(null);
      }
    } else {
      // No table param in URL
      setIsInvalidTableParam(false);
    }
  }, [searchParams, setTableNumber]);

  // Load categories and food items from backend API
  const loadMenu = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [categoriesData, itemsData] = await Promise.all([
        fetchCategories(),
        fetchFoodItems(),
      ]);

      setCategories(categoriesData);
      setFoodItems(itemsData);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to load menu. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // Filter items by category and search query
  const filteredItems = useMemo(() => {
    return foodItems.filter((item) => {
      // Category filter
      if (selectedCategoryId) {
        const itemCatId =
          typeof item.categoryId === 'string'
            ? item.categoryId
            : item.categoryId._id;
        if (itemCatId !== selectedCategoryId) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [foodItems, selectedCategoryId, searchQuery]);

  // Save manual table number from modal
  const handleSaveManualTable = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateCustomerTableNumber(manualTableInput);
    if (!res.isValid || res.value === undefined) {
      setManualTableError(res.error || 'Please enter a valid table number (1–999).');
      return;
    }

    setTableNumber(res.value);
    setIsInvalidTableParam(false);
    setManualTableError(null);
    setIsScanModalOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Restaurant Header & Table Badge */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto pb-28">
        {/* Invalid Table Number Banner (Part 11) */}
        {isInvalidTableParam && (
          <div
            id="invalid-table-banner"
            className="mx-4 mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-start gap-3 shadow-2xs"
          >
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">Invalid table number.</p>
              <p className="text-xs text-rose-700 mt-0.5">
                The table parameter in your link is not recognized. Please scan the QR code on your dining table.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  id="scan-return-qr-invalid-button"
                  onClick={() => {
                    setManualTableInput('');
                    setManualTableError(null);
                    setIsScanModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan / Return to QR</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Missing Table Notice: When opened at /order without a table number (Part 11) */}
        {!isInvalidTableParam && !tableNumber && (
          <div
            id="missing-table-banner"
            className="mx-4 mt-3 p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-amber-950 text-xs flex items-start gap-3 shadow-2xs"
          >
            <QrCode className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-sm">
                Please scan the QR code on your table to start your order.
              </p>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Each dining table has a unique QR code that routes your delicious food directly to your table.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  id="scan-return-qr-button"
                  onClick={() => {
                    setManualTableInput('');
                    setManualTableError(null);
                    setIsScanModalOpen(true);
                  }}
                  className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 active:scale-95 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Scan / Return to QR</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks, momos..."
              className="w-full pl-10 pr-4 py-2 bg-white text-sm text-stone-800 placeholder:text-stone-400 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-stone-400 hover:text-stone-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="p-4 pt-2">
            <MenuSkeleton />
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="mx-4 my-8 p-6 bg-white border border-rose-100 rounded-2xl shadow-xs text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-stone-800 text-base mb-1">
              Menu Unavailable
            </h3>
            <p className="text-xs text-stone-500 max-w-xs mb-4">
              {errorMessage}
            </p>
            <button
              onClick={loadMenu}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Menu Loaded Successfully */}
        {!isLoading && !errorMessage && (
          <>
            {/* Horizontal Categories Bar */}
            {categories.length > 0 && (
              <CategoryBar
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={setSelectedCategoryId}
              />
            )}

            {/* Food Items List */}
            <div className="p-4 pt-3">
              {filteredItems.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredItems.map((item) => (
                    <FoodCard key={item._id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mb-3">
                    <UtensilsCrossed className="w-7 h-7" />
                  </div>
                  <h4 className="font-semibold text-stone-700 text-sm mb-1">
                    {searchQuery
                      ? 'No matching food items found'
                      : 'No menu items available in this category'}
                  </h4>
                  <p className="text-xs text-stone-400 max-w-xs">
                    {searchQuery
                      ? 'Try searching for something else or browse all categories.'
                      : 'The restaurant will add items to this category soon.'}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      <CartBottomBar />

      {/* Interactive Scan / Return to QR Guide Modal */}
      {isScanModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-stone-950/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-xl border border-stone-200 text-center relative">
            <button
              type="button"
              onClick={() => setIsScanModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition"
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/80 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
              <QrCode className="w-7 h-7" />
            </div>

            <h3 className="text-base font-bold text-stone-900 tracking-tight">
              Table QR Code
            </h3>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              Open your phone camera and point it at the QR code card placed on your dining table.
            </p>

            <div className="mt-4 p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-left space-y-1.5 text-[11px] text-stone-600">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center">
                  1
                </span>
                <span>Look for the "Cream Treat" stand on your table.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center">
                  2
                </span>
                <span>Scan the QR code with any camera app.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-amber-600 text-white font-bold text-[10px] flex items-center justify-center">
                  3
                </span>
                <span>Your table number is automatically detected!</span>
              </div>
            </div>

            {/* Fallback Table Entry Option */}
            <div className="mt-5 pt-4 border-t border-stone-100 text-left">
              <label
                htmlFor="modalTableInput"
                className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1.5 flex items-center gap-1"
              >
                <Hash className="w-3 h-3 text-amber-600" />
                <span>Or Enter Table Number Manually:</span>
              </label>

              <form onSubmit={handleSaveManualTable} className="flex gap-2">
                <input
                  id="modalTableInput"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={manualTableInput}
                  onChange={(e) => {
                    setManualTableInput(e.target.value);
                    if (manualTableError) setManualTableError(null);
                  }}
                  placeholder="e.g. 5"
                  className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Set</span>
                </button>
              </form>

              {manualTableError && (
                <p className="mt-1.5 text-[11px] text-rose-600 font-medium">
                  {manualTableError}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsScanModalOpen(false)}
              className="mt-4 w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition"
            >
              Continue Browsing Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 p-4">
          <MenuSkeleton />
        </div>
      }
    >
      <OrderMenuContent />
    </Suspense>
  );
}
