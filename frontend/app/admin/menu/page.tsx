'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UtensilsCrossed,
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from 'lucide-react';
import {
  adminGetProfile,
  adminLogout,
  getAdminToken,
  getStoredAdminUser,
  fetchAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  fetchAdminFoodItems,
  createAdminFoodItem,
  updateAdminFoodItem,
  deleteAdminFoodItem,
} from '@/lib/api';
import { AdminUser } from '@/types/admin';
import { Category, FoodItem } from '@/types/menu';

export default function AdminMenuPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Active view: 'items' | 'categories'
  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');

  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters for Food Items
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedAvailabilityFilter, setSelectedAvailabilityFilter] = useState('ALL');

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    displayOrder: 0,
    isActive: true,
  });
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  // Food Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [itemForm, setItemForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    priceRupees: '',
    imageUrl: '',
    isAvailable: true,
    displayOrder: 0,
  });
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);

  // Delete / Deactivate Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete-item' | 'toggle-category' | 'delete-category';
    title: string;
    message: string;
    targetId: string;
    extraData?: any;
  }>({
    isOpen: false,
    type: 'delete-item',
    title: '',
    message: '',
    targetId: '',
  });

  // Verify Admin Session on Mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const token = getAdminToken();
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const cached = getStoredAdminUser();
      if (cached && isMounted) {
        setAdmin(cached);
      }

      try {
        const verifiedUser = await adminGetProfile(token);
        if (isMounted) {
          setAdmin(verifiedUser);
          setIsAuthChecking(false);
        }
      } catch {
        if (isMounted) {
          router.replace('/admin/login');
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Load Menu Data
  const loadMenuData = useCallback(async () => {
    setIsLoadingData(true);
    setActionError(null);
    try {
      const [cats, items] = await Promise.all([
        fetchAdminCategories(),
        fetchAdminFoodItems(),
      ]);
      setCategories(cats);
      setFoodItems(items);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'Unauthorized') {
          router.replace('/admin/login');
          return;
        }
        setActionError(err.message);
      } else {
        setActionError('Failed to load menu data.');
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthChecking) {
      loadMenuData();
    }
  }, [isAuthChecking, loadMenuData]);

  // Success message auto-dismiss
  useEffect(() => {
    if (!actionSuccess) return;
    const timer = setTimeout(() => setActionSuccess(null), 3500);
    return () => clearTimeout(timer);
  }, [actionSuccess]);

  // Handle Logout
  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    adminLogout();
    router.replace('/admin/login');
  };

  // ==========================================
  // Category Actions
  // ==========================================

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryForm({
      name: '',
      description: '',
      displayOrder: categories.length + 1,
      isActive: true,
    });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      displayOrder: cat.displayOrder ?? 0,
      isActive: cat.isActive,
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      setActionError('Category name is required.');
      return;
    }

    setIsSubmittingCategory(true);
    setActionError(null);

    try {
      if (editingCategory) {
        await updateAdminCategory(editingCategory._id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          displayOrder: Number(categoryForm.displayOrder) || 0,
          isActive: categoryForm.isActive,
        });
        setActionSuccess(`Category "${categoryForm.name.trim()}" updated successfully.`);
      } else {
        await createAdminCategory({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim(),
          displayOrder: Number(categoryForm.displayOrder) || 0,
          isActive: categoryForm.isActive,
        });
        setActionSuccess(`Category "${categoryForm.name.trim()}" created successfully.`);
      }

      setIsCategoryModalOpen(false);
      await loadMenuData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Category operation failed.');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      await updateAdminCategory(cat._id, {
        isActive: !cat.isActive,
      });
      setActionSuccess(
        `Category "${cat.name}" is now ${!cat.isActive ? 'Active' : 'Inactive'}.`,
      );
      await loadMenuData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update category status.');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      const res = await deleteAdminCategory(catId);
      setActionSuccess(res.message);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      await loadMenuData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete category.');
    }
  };

  // ==========================================
  // Food Item Actions
  // ==========================================

  const handleOpenAddItem = () => {
    setEditingItem(null);
    setItemForm({
      categoryId: categories[0]?._id || '',
      name: '',
      description: '',
      priceRupees: '',
      imageUrl: '',
      isAvailable: true,
      displayOrder: foodItems.length + 1,
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: FoodItem) => {
    setEditingItem(item);
    const catId = typeof item.categoryId === 'string' ? item.categoryId : item.categoryId._id;
    setItemForm({
      categoryId: catId,
      name: item.name,
      description: item.description || '',
      priceRupees: (item.price / 100).toFixed(0),
      imageUrl: item.imageUrl || '',
      isAvailable: item.isAvailable,
      displayOrder: item.displayOrder ?? 0,
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim()) {
      setActionError('Food item name is required.');
      return;
    }
    if (!itemForm.categoryId) {
      setActionError('Please select a valid category.');
      return;
    }

    const rupees = parseFloat(itemForm.priceRupees);
    if (isNaN(rupees) || rupees < 0) {
      setActionError('Price must be a valid positive number in Rupees.');
      return;
    }

    const priceInPaise = Math.round(rupees * 100);

    setIsSubmittingItem(true);
    setActionError(null);

    try {
      if (editingItem) {
        await updateAdminFoodItem(editingItem._id, {
          categoryId: itemForm.categoryId,
          name: itemForm.name.trim(),
          description: itemForm.description.trim(),
          price: priceInPaise,
          imageUrl: itemForm.imageUrl.trim(),
          isAvailable: itemForm.isAvailable,
          displayOrder: Number(itemForm.displayOrder) || 0,
        });
        setActionSuccess(`Food item "${itemForm.name.trim()}" updated successfully.`);
      } else {
        await createAdminFoodItem({
          categoryId: itemForm.categoryId,
          name: itemForm.name.trim(),
          description: itemForm.description.trim(),
          price: priceInPaise,
          imageUrl: itemForm.imageUrl.trim(),
          isAvailable: itemForm.isAvailable,
          displayOrder: Number(itemForm.displayOrder) || 0,
        });
        setActionSuccess(`Food item "${itemForm.name.trim()}" created successfully.`);
      }

      setIsItemModalOpen(false);
      await loadMenuData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Food item operation failed.');
    } finally {
      setIsSubmittingItem(false);
    }
  };

  const handleToggleItemAvailability = async (item: FoodItem) => {
    try {
      await updateAdminFoodItem(item._id, {
        isAvailable: !item.isAvailable,
      });
      setActionSuccess(
        `"${item.name}" is now marked as ${!item.isAvailable ? 'Available' : 'Unavailable'}.`,
      );
      await loadMenuData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update item availability.');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await deleteAdminFoodItem(itemId);
      setActionSuccess(res.message);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      await loadMenuData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete food item.');
    }
  };

  // Filtered Food Items
  const filteredFoodItems = useMemo(() => {
    return foodItems.filter((item) => {
      // Category filter
      if (selectedCategoryFilter !== 'ALL') {
        const itemCatId =
          typeof item.categoryId === 'string' ? item.categoryId : item.categoryId._id;
        if (itemCatId !== selectedCategoryFilter) return false;
      }

      // Availability filter
      if (selectedAvailabilityFilter === 'AVAILABLE' && !item.isAvailable) return false;
      if (selectedAvailabilityFilter === 'UNAVAILABLE' && item.isAvailable) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });
  }, [foodItems, searchQuery, selectedCategoryFilter, selectedAvailabilityFilter]);

  if (isAuthChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-600">Verifying session...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-16">
      {/* Top Header Navigation */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-base sm:text-lg text-stone-900 uppercase">
                CREAM TREAT
              </h1>
              <p className="text-[11px] font-medium text-stone-500 -mt-1 hidden sm:block">
                Menu Management
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-medium text-stone-600">
            <Link
              href="/admin"
              className="px-3 py-1 text-stone-600 hover:text-stone-900 hover:bg-white/60 rounded-lg transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1 text-stone-600 hover:text-stone-900 hover:bg-white/60 rounded-lg transition-colors font-medium"
            >
              Orders
            </Link>
            <span className="px-3 py-1 bg-white text-stone-900 rounded-lg shadow-xs font-semibold">
              Menu
            </span>
            <Link
              href="/admin/qr"
              className="px-3 py-1 text-stone-600 hover:text-stone-900 hover:bg-white/60 rounded-lg transition-colors font-medium"
            >
              QR Codes
            </Link>
          </nav>

          {/* Right Action: Admin Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {admin && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-stone-800">
                  {admin.name}
                </span>
                <span className="text-[10px] text-stone-400 -mt-0.5">
                  {admin.email}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Banner Alerts */}
        {actionSuccess && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs sm:text-sm text-emerald-800 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="font-medium">{actionSuccess}</p>
          </div>
        )}

        {actionError && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs sm:text-sm text-red-800">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="font-medium">{actionError}</p>
            </div>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-red-600 hover:text-red-900 text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Section Header & Tab Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-stone-900">
              Cream Treat Menu
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Manage live restaurant categories, item pricing in paise, and real-time availability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex bg-stone-100 p-1 rounded-xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('items')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'items'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Food Items</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700">
                  {foodItems.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('categories')}
                className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'categories'
                    ? 'bg-white text-stone-900 shadow-xs font-semibold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Categories</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-stone-200 text-stone-700">
                  {categories.length}
                </span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadMenuData}
              disabled={isLoadingData}
              className="p-2 border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl transition disabled:opacity-50"
              title="Refresh Menu Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: FOOD ITEMS MANAGEMENT                             */}
        {/* ======================================================== */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            {/* Controls Bar: Filters & Add Item */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search food item name or description..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-800"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-stone-800"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {!c.isActive ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>

                {/* Availability Filter */}
                <select
                  value={selectedAvailabilityFilter}
                  onChange={(e) => setSelectedAvailabilityFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-700 font-medium focus:outline-none focus:ring-2 focus:ring-stone-800"
                >
                  <option value="ALL">All Availability</option>
                  <option value="AVAILABLE">Available Only</option>
                  <option value="UNAVAILABLE">Unavailable Only</option>
                </select>
              </div>

              {/* Add Food Item Button */}
              <button
                type="button"
                onClick={handleOpenAddItem}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Food Item</span>
              </button>
            </div>

            {/* Food Items Grid / Table */}
            {isLoadingData ? (
              <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-500 text-xs">
                <div className="w-7 h-7 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading food items...
              </div>
            ) : filteredFoodItems.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center">
                <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-stone-700">No Food Items Found</p>
                <p className="text-xs text-stone-400 mt-1">
                  {searchQuery || selectedCategoryFilter !== 'ALL' || selectedAvailabilityFilter !== 'ALL'
                    ? 'No food items match your filter criteria.'
                    : 'Get started by creating your first food item.'}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddItem}
                  className="mt-4 px-4 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition"
                >
                  + Add Food Item
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Item Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Price</th>
                        <th className="px-4 py-3">Availability</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {filteredFoodItems.map((item) => {
                        const cat =
                          typeof item.categoryId === 'object' && item.categoryId !== null
                            ? item.categoryId
                            : categories.find((c) => c._id === item.categoryId);

                        return (
                          <tr
                            key={item._id}
                            className={`hover:bg-stone-50/70 transition-colors ${
                              !item.isAvailable ? 'bg-stone-50/40 text-stone-400' : ''
                            }`}
                          >
                            <td className="px-4 py-3 font-mono text-[11px] text-stone-400">
                              #{item.displayOrder ?? 0}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                                  {item.imageUrl ? (
                                    <img
                                      src={item.imageUrl}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <UtensilsCrossed className="w-4 h-4 text-stone-300" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-semibold text-stone-900">{item.name}</div>
                                  {item.description && (
                                    <p className="text-[11px] text-stone-400 line-clamp-1 max-w-sm">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700 border border-stone-200/60">
                                {cat?.name || 'Unassigned'}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold font-mono text-stone-900 text-sm">
                              ₹{(item.price / 100).toFixed(0)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                  item.isAvailable
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-stone-100 text-stone-500 border-stone-200'
                                }`}
                              >
                                {item.isAvailable ? (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Available
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                                    Unavailable
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleItemAvailability(item)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
                                    item.isAvailable
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}
                                  title={item.isAvailable ? 'Disable Item' : 'Enable Item'}
                                >
                                  {item.isAvailable ? 'Disable' : 'Enable'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItem(item)}
                                  className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                                  title="Edit Item"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      type: 'delete-item',
                                      title: `Delete "${item.name}"?`,
                                      message: `Are you sure you want to permanently delete this food item? Note: Past orders will safely retain their historical snapshot prices.`,
                                      targetId: item._id,
                                    })
                                  }
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                                  title="Delete Item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CATEGORIES MANAGEMENT                             */}
        {/* ======================================================== */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            {/* Category Header Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
              <div>
                <p className="text-xs text-stone-500">
                  Customer menu orders sections by category display order. Inactive categories are hidden from customers.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-xs shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>

            {/* Categories Table */}
            {isLoadingData ? (
              <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center text-stone-500 text-xs">
                <div className="w-7 h-7 border-2 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading categories...
              </div>
            ) : categories.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center">
                <FolderTree className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-stone-700">No Categories Found</p>
                <p className="text-xs text-stone-400 mt-1">
                  Create categories (e.g. Momos, Soup, Mains, Sundaes) to organize your restaurant menu.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddCategory}
                  className="mt-4 px-4 py-1.5 bg-stone-900 text-white rounded-xl text-xs font-medium hover:bg-stone-800 transition"
                >
                  + Add Category
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Order</th>
                        <th className="px-4 py-3">Category Name</th>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Items Count</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {categories.map((cat) => {
                        const itemsInCat = foodItems.filter((i) => {
                          const cId = typeof i.categoryId === 'string' ? i.categoryId : i.categoryId._id;
                          return cId === cat._id;
                        });

                        return (
                          <tr
                            key={cat._id}
                            className={`hover:bg-stone-50/70 transition-colors ${
                              !cat.isActive ? 'bg-stone-50/40 text-stone-400' : ''
                            }`}
                          >
                            <td className="px-4 py-3 font-mono text-[11px] text-stone-400">
                              #{cat.displayOrder ?? 0}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-semibold text-stone-900">{cat.name}</span>
                            </td>
                            <td className="px-4 py-3 text-stone-500 max-w-xs truncate">
                              {cat.description || '—'}
                            </td>
                            <td className="px-4 py-3 font-medium text-stone-600">
                              {itemsInCat.length} {itemsInCat.length === 1 ? 'item' : 'items'}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                  cat.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-stone-100 text-stone-500 border-stone-200'
                                }`}
                              >
                                {cat.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCategoryActive(cat)}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-medium border transition ${
                                    cat.isActive
                                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                  }`}
                                  title={cat.isActive ? 'Deactivate Category' : 'Activate Category'}
                                >
                                  {cat.isActive ? 'Deactivate' : 'Activate'}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCategory(cat)}
                                  className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition"
                                  title="Edit Category"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      type: 'delete-category',
                                      title: `Delete Category "${cat.name}"?`,
                                      message:
                                        itemsInCat.length > 0
                                          ? `This category has ${itemsInCat.length} associated food items. It will be safely deactivated (isActive: false) instead of deleted to protect customer orders.`
                                          : `Are you sure you want to permanently delete category "${cat.name}"?`,
                                      targetId: cat._id,
                                    })
                                  }
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
                                  title="Delete Category"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT CATEGORY                             */}
      {/* ======================================================== */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Categories group related food items on the customer QR menu.
            </p>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Sundae, Momos, Soup"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Short description displayed to customers"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={categoryForm.displayOrder}
                    onChange={(e) =>
                      setCategoryForm({ ...categoryForm, displayOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-700 pb-2">
                    <input
                      type="checkbox"
                      checked={categoryForm.isActive}
                      onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-stone-900 border-stone-300 focus:ring-stone-800"
                    />
                    <span>Active on Menu</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  disabled={isSubmittingCategory}
                  className="px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
                >
                  {isSubmittingCategory ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT FOOD ITEM                            */}
      {/* ======================================================== */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              {editingItem ? 'Edit Food Item' : 'Add New Food Item'}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              All prices are stored as integer paise in MongoDB (e.g. ₹120.00 = 12000 paise).
            </p>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Food Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                    placeholder="e.g. Veg Momos, Rose Falooda"
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} {!c.isActive ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Price in Rupees (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 text-xs font-bold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={itemForm.priceRupees}
                      onChange={(e) => setItemForm({ ...itemForm, priceRupees: e.target.value })}
                      placeholder="120"
                      className="w-full pl-7 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-stone-800"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Ingredients or details"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Image URL (optional)
                </label>
                <input
                  type="text"
                  value={itemForm.imageUrl}
                  onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                  placeholder="https://... (optional image link)"
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.displayOrder}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, displayOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-800"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-700 pb-2">
                    <input
                      type="checkbox"
                      checked={itemForm.isAvailable}
                      onChange={(e) => setItemForm({ ...itemForm, isAvailable: e.target.checked })}
                      className="w-4 h-4 rounded text-stone-900 border-stone-300 focus:ring-stone-800"
                    />
                    <span>Available for Ordering</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  disabled={isSubmittingItem}
                  className="px-3.5 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingItem}
                  className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition disabled:opacity-50"
                >
                  {isSubmittingItem ? 'Saving...' : 'Save Food Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CONFIRMATION DIALOG                             */}
      {/* ======================================================== */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-stone-200 text-center">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 font-bold text-sm">
              !
            </div>
            <h4 className="text-sm font-bold text-stone-900 mb-1">
              {confirmModal.title}
            </h4>
            <p className="text-xs text-stone-500 mb-5 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmModal.type === 'delete-item') {
                    handleDeleteItem(confirmModal.targetId);
                  } else if (confirmModal.type === 'delete-category') {
                    handleDeleteCategory(confirmModal.targetId);
                  }
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
