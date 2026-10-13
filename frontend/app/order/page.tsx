'use client';

import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, AlertCircle, RefreshCw, UtensilsCrossed } from 'lucide-react';
import { Category, FoodItem } from '@/types/menu';
import { fetchCategories, fetchFoodItems } from '@/lib/api';
import { useCart } from '@/hooks/useCart';
import { Navbar } from '@/components/Navbar';
import { CategoryBar } from '@/components/CategoryBar';
import { FoodCard } from '@/components/FoodCard';
import { CartBottomBar } from '@/components/CartBottomBar';
import { MenuSkeleton } from '@/components/MenuSkeleton';

function OrderMenuContent() {
  const searchParams = useSearchParams();
  const { setTableNumber, tableNumber } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Automatically sync table number from query parameters (e.g. /order?table=5)
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam) {
      const parsed = parseInt(tableParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        setTableNumber(parsed);
      }
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

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      {/* Restaurant Header & Table Badge */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto pb-28">
        {/* Table Notice if table not set */}
        {!tableNumber && (
          <div className="mx-4 mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 text-xs flex items-center justify-between">
            <span className="font-medium">
              Dining in? Tap the table badge above to set your table number.
            </span>
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
