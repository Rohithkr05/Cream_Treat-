'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  UtensilsCrossed,
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
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
import { AdminLayout } from '@/components/AdminLayout';

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

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    adminLogout();
    router.replace('/admin/login');
  };

  // Category Actions
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
      setActionSuccess(`Category "${cat.name}" is now ${!cat.isActive ? 'Active' : 'Inactive'}.`);
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

  // Food Item Actions
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
        `"${item.name}" marked as ${!item.isAvailable ? 'Available' : 'Sold out'}.`,
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
    const filtered = foodItems.filter((item) => {
      if (selectedCategoryFilter !== 'ALL') {
        const itemCatId =
          typeof item.categoryId === 'string' ? item.categoryId : item.categoryId._id;
        if (itemCatId !== selectedCategoryFilter) return false;
      }

      if (selectedAvailabilityFilter === 'AVAILABLE' && !item.isAvailable) return false;
      if (selectedAvailabilityFilter === 'UNAVAILABLE' && item.isAvailable) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      const catA =
        typeof a.categoryId === 'object' && a.categoryId
          ? a.categoryId
          : categories.find((c) => c._id === a.categoryId);
      const catB =
        typeof b.categoryId === 'object' && b.categoryId
          ? b.categoryId
          : categories.find((c) => c._id === b.categoryId);
      const catOrderA = catA?.displayOrder ?? 99;
      const catOrderB = catB?.displayOrder ?? 99;
      if (catOrderA !== catOrderB) return catOrderA - catOrderB;

      const orderA = a.displayOrder ?? 99;
      const orderB = b.displayOrder ?? 99;
      if (orderA !== orderB) return orderA - orderB;

      return a.name.localeCompare(b.name);
    });
  }, [foodItems, categories, searchQuery, selectedCategoryFilter, selectedAvailabilityFilter]);

  if (isAuthChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FBF7F2] p-4 font-body">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-[#6A0019] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs uppercase tracking-widest text-[#2C1810]/70 font-semibold">
            Verifying Admin Session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <AdminLayout
      activeNav="menu"
      title="Menu & Prices"
      subtitle="Edit pricing, toggle availability, and configure category hierarchy."
      admin={admin}
      onRefresh={loadMenuData}
      isRefreshing={isLoadingData}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
      headerActions={
        <div className="flex items-center gap-2">
          {activeTab === 'items' ? (
            <button
              type="button"
              onClick={handleOpenAddItem}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6A0019] text-[#EFE6DC] hover:bg-[#520013] text-xs font-display uppercase tracking-wider font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Item</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddCategory}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6A0019] text-[#EFE6DC] hover:bg-[#520013] text-xs font-display uppercase tracking-wider font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add Category</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Success Feedback Alert */}
        {actionSuccess && (
          <div className="p-3.5 bg-[#EEF6EF] border border-[#BADBBE] text-[#2B6633] text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2B6633]" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Error Feedback Alert */}
        {actionError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Top Segmented Controls: Food Items vs Categories */}
        <div className="flex items-center justify-between gap-3 border-b border-[#6A0019]/15 pb-4">
          <div className="inline-flex items-center p-1 bg-[#EFE6DC]/50 rounded-xl border border-[#6A0019]/15">
            <button
              type="button"
              onClick={() => setActiveTab('items')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'items'
                  ? 'bg-[#6A0019] text-[#EFE6DC] shadow-2xs'
                  : 'text-[#2C1810]/75 hover:text-[#6A0019]'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Food Items</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-bold ${
                  activeTab === 'items'
                    ? 'bg-[#EFE6DC]/20 text-[#EFE6DC]'
                    : 'bg-[#6A0019]/10 text-[#6A0019]'
                }`}
              >
                {foodItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'categories'
                  ? 'bg-[#6A0019] text-[#EFE6DC] shadow-2xs'
                  : 'text-[#2C1810]/75 hover:text-[#6A0019]'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Categories</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-bold ${
                  activeTab === 'categories'
                    ? 'bg-[#EFE6DC]/20 text-[#EFE6DC]'
                    : 'bg-[#6A0019]/10 text-[#6A0019]'
                }`}
              >
                {categories.length}
              </span>
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: FOOD ITEMS LIST
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#6A0019]/15 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5 flex-1">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-[#2C1810]/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search dish name or description..."
                    className="w-full pl-9 pr-8 py-2 text-xs bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl text-[#2C1810] placeholder:text-[#2C1810]/40 focus:outline-none focus:ring-2 focus:ring-[#6A0019] focus:bg-white"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#2C1810]/40 hover:text-[#2C1810] p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Dropdown Filter */}
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl text-[#2C1810] font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} {!c.isActive ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>

                {/* Availability Dropdown Filter */}
                <select
                  value={selectedAvailabilityFilter}
                  onChange={(e) => setSelectedAvailabilityFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl text-[#2C1810] font-medium focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                >
                  <option value="ALL">All Availability</option>
                  <option value="AVAILABLE">Available Only</option>
                  <option value="UNAVAILABLE">Sold Out Only</option>
                </select>
              </div>
            </div>

            {/* Desktop Table View & Mobile Stacked Rows */}
            {isLoadingData ? (
              <div className="bg-white p-12 rounded-2xl border border-[#6A0019]/15 text-center text-xs">
                <Loader2 className="w-6 h-6 text-[#6A0019] animate-spin mx-auto mb-2" />
                <span className="text-[#2C1810]/60">Loading menu catalog...</span>
              </div>
            ) : filteredFoodItems.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-[#6A0019]/15 text-center">
                <UtensilsCrossed className="w-8 h-8 text-[#6A0019]/30 mx-auto mb-2" />
                <p className="font-display font-semibold text-[#6A0019] text-sm">No items found</p>
                <p className="text-xs text-[#2C1810]/60 mt-1">
                  Try adjusting your search query or filters.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#6A0019]/15 shadow-2xs overflow-hidden">
                {/* Desktop Table: Fits 100% of Screen Width, No Scrolling Needed */}
                <div className="hidden md:block w-full overflow-hidden">
                  <table className="w-full text-left text-xs table-auto">
                    <thead className="bg-[#EFE6DC]/40 border-b border-[#6A0019]/15 text-[#6A0019] font-display uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="w-12 px-3 py-3 text-center">#</th>
                        <th className="px-3 py-3 min-w-0">Item Name</th>
                        <th className="w-28 px-2 py-3">Category</th>
                        <th className="w-20 px-2 py-3 text-right">Price</th>
                        <th className="w-32 px-3 py-3 text-center">Availability</th>
                        <th className="w-28 px-3 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#6A0019]/10 text-[#2C1810]">
                      {filteredFoodItems.map((item) => {
                        const cat =
                          typeof item.categoryId === 'object' && item.categoryId !== null
                            ? item.categoryId
                            : categories.find((c) => c._id === item.categoryId);

                        return (
                          <tr
                            key={item._id}
                            className={`hover:bg-[#EFE6DC]/20 transition-colors ${
                              !item.isAvailable ? 'bg-[#FBF7F2]/80 opacity-60' : ''
                            }`}
                          >
                            <td className="w-12 px-3 py-3 font-mono text-[11px] text-[#2C1810]/50 text-center">
                              #{item.displayOrder ?? 0}
                            </td>
                            <td className="px-3 py-3 min-w-0">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="relative w-9 h-9 rounded-xl bg-stone-100 border border-[#6A0019]/15 overflow-hidden shrink-0">
                                  {item.imageUrl ? (
                                    <Image
                                      src={item.imageUrl}
                                      alt={item.name}
                                      fill
                                      sizes="36px"
                                      unoptimized
                                      className="object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#6A0019]/30">
                                      <UtensilsCrossed className="w-3.5 h-3.5" />
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-[#2C1810] text-sm truncate">
                                    {item.name}
                                  </div>
                                  {item.description && (
                                    <p className="text-[11px] text-[#2C1810]/60 truncate">
                                      {item.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="w-28 px-2 py-3">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EFE6DC] text-[#6A0019] border border-[#6A0019]/15 truncate max-w-[100px]">
                                {cat?.name || 'Unassigned'}
                              </span>
                            </td>
                            <td className="w-20 px-2 py-3 font-bold font-mono text-[#6A0019] text-sm tabular-nums text-right whitespace-nowrap">
                              ₹{(item.price / 100).toFixed(0)}
                            </td>
                            <td className="w-32 px-3 py-3 text-center whitespace-nowrap">
                              {/* Clear Availability Switch with text label */}
                              <button
                                type="button"
                                onClick={() => handleToggleItemAvailability(item)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
                                  item.isAvailable
                                    ? 'bg-[#EEF6EF] text-[#2B6633] border-[#BADBBE]'
                                    : 'bg-[#FDF0ED] text-[#9E3524] border-[#F2C2B8]'
                                }`}
                                title="Click to toggle availability"
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.isAvailable ? 'bg-[#3B8E47]' : 'bg-[#B83E2A]'
                                  }`}
                                />
                                <span>{item.isAvailable ? 'Available' : 'Sold out'}</span>
                              </button>
                            </td>
                            <td className="w-28 px-3 py-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditItem(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#6A0019] bg-[#EFE6DC]/60 hover:bg-[#6A0019] hover:text-[#EFE6DC] rounded-lg transition-colors cursor-pointer"
                                  title="Edit Item"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfirmModal({
                                      isOpen: true,
                                      type: 'delete-item',
                                      title: `Delete "${item.name}"?`,
                                      message: `Are you sure you want to delete this food item? Past orders will safely retain their historical snapshot prices.`,
                                      targetId: item._id,
                                    })
                                  }
                                  className="p-1.5 text-rose-700 hover:bg-rose-100/60 rounded-lg transition-colors cursor-pointer"
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

                {/* Mobile Stacked Card Rows */}
                <div className="md:hidden divide-y divide-[#6A0019]/10">
                  {filteredFoodItems.map((item) => {
                    const cat =
                      typeof item.categoryId === 'object' && item.categoryId !== null
                        ? item.categoryId
                        : categories.find((c) => c._id === item.categoryId);

                    return (
                      <div
                        key={item._id}
                        className={`p-4 space-y-3 ${
                          !item.isAvailable ? 'bg-[#FBF7F2]/80 opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl bg-stone-100 border border-[#6A0019]/15 overflow-hidden shrink-0">
                              {item.imageUrl ? (
                                <Image
                                  src={item.imageUrl}
                                  alt={item.name}
                                  fill
                                  sizes="48px"
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#6A0019]/30">
                                  <UtensilsCrossed className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-[#2C1810] text-sm leading-tight">
                                {item.name}
                              </h4>
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#EFE6DC] text-[#6A0019] mt-1 border border-[#6A0019]/15">
                                {cat?.name || 'Unassigned'}
                              </span>
                            </div>
                          </div>

                          <span className="font-bold font-mono text-[#6A0019] text-base tabular-nums">
                            ₹{(item.price / 100).toFixed(0)}
                          </span>
                        </div>

                        {/* Mobile Actions Bottom Row */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#6A0019]/10">
                          <button
                            type="button"
                            onClick={() => handleToggleItemAvailability(item)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                              item.isAvailable
                                ? 'bg-[#EEF6EF] text-[#2B6633] border-[#BADBBE]'
                                : 'bg-[#FDF0ED] text-[#9E3524] border-[#F2C2B8]'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.isAvailable ? 'bg-[#3B8E47]' : 'bg-[#B83E2A]'
                              }`}
                            />
                            <span>{item.isAvailable ? 'Available' : 'Sold out'}</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditItem(item)}
                              className="px-3 py-1.5 text-xs font-semibold text-[#6A0019] hover:bg-[#6A0019]/10 rounded-lg border border-[#6A0019]/20 transition cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: 'delete-item',
                                  title: `Delete "${item.name}"?`,
                                  message: `Are you sure you want to delete this food item?`,
                                  targetId: item._id,
                                })
                              }
                              className="p-1.5 text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: CATEGORIES LIST
            ───────────────────────────────────────────────────────────── */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#6A0019]/15 shadow-2xs overflow-hidden">
              <div className="w-full overflow-hidden">
                <table className="w-full text-left text-xs table-auto">
                  <thead className="bg-[#EFE6DC]/40 border-b border-[#6A0019]/15 text-[#6A0019] font-display uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="w-14 px-3 py-3 text-center">#</th>
                      <th className="w-44 px-3 py-3">Category Name</th>
                      <th className="px-3 py-3 hidden sm:table-cell">Description</th>
                      <th className="w-32 px-3 py-3 text-center">Status</th>
                      <th className="w-28 px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#6A0019]/10 text-[#2C1810]">
                    {categories.map((cat) => (
                      <tr key={cat._id} className="hover:bg-[#EFE6DC]/20 transition-colors">
                        <td className="w-14 px-3 py-3 font-mono font-bold text-[#6A0019] text-center">
                          #{cat.displayOrder ?? 0}
                        </td>
                        <td className="w-44 px-3 py-3 font-semibold text-[#2C1810] text-sm">
                          {cat.name}
                        </td>
                        <td className="px-3 py-3 text-[#2C1810]/70 text-xs hidden sm:table-cell">
                          <span className="truncate block max-w-sm">{cat.description || '—'}</span>
                        </td>
                        <td className="w-32 px-3 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryActive(cat)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                              cat.isActive
                                ? 'bg-[#EEF6EF] text-[#2B6633] border-[#BADBBE]'
                                : 'bg-[#EFE6DC]/50 text-[#6A0019]/70 border-[#6A0019]/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                cat.isActive ? 'bg-[#3B8E47]' : 'bg-[#6A0019]/40'
                              }`}
                            />
                            <span>{cat.isActive ? 'Active' : 'Inactive'}</span>
                          </button>
                        </td>
                        <td className="w-28 px-3 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditCategory(cat)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-[#6A0019] bg-[#EFE6DC]/60 hover:bg-[#6A0019] hover:text-[#EFE6DC] rounded-lg transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: 'delete-category',
                                  title: `Delete Category "${cat.name}"?`,
                                  message: `Are you sure? Items inside this category will become unassigned.`,
                                  targetId: cat._id,
                                })
                              }
                              className="p-1.5 text-rose-700 hover:bg-rose-100/60 rounded-lg transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE / EDIT FOOD ITEM
          ───────────────────────────────────────────────────────────── */}
      {isItemModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-[#FBF7F2] text-[#2C1810] rounded-3xl max-w-lg w-full border border-[#6A0019]/20 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#6A0019]/15 bg-[#EFE6DC]/40 shrink-0">
              <h3 className="font-display font-bold text-lg text-[#6A0019]">
                {editingItem ? `Edit: ${editingItem.name}` : 'New Food Item'}
              </h3>
              <button
                type="button"
                onClick={() => setIsItemModalOpen(false)}
                className="p-1 rounded-full text-[#6A0019]/60 hover:text-[#6A0019] hover:bg-[#6A0019]/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto p-6 space-y-4 font-body">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1 font-display">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Chocolava Cake Sundae"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#6A0019]/25 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1 font-display">
                    Category *
                  </label>
                  <select
                    required
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-[#6A0019]/25 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1 font-display">
                    Price in INR (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={itemForm.priceRupees}
                    onChange={(e) => setItemForm({ ...itemForm, priceRupees: e.target.value })}
                    placeholder="e.g. 160"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#6A0019]/25 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1 font-display">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Brief description of the dessert or snack..."
                  className="w-full px-3.5 py-2 bg-white border border-[#6A0019]/25 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1 font-display">
                  Photo Path / URL
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-xl bg-stone-100 border border-[#6A0019]/20 overflow-hidden shrink-0 flex items-center justify-center">
                    {itemForm.imageUrl ? (
                      <Image
                        src={itemForm.imageUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                        sizes="44px"
                        unoptimized
                        onError={() => {}}
                      />
                    ) : (
                      <UtensilsCrossed className="w-4 h-4 text-[#6A0019]/30" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={itemForm.imageUrl}
                    onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                    placeholder="/menu/herb-chilli-burger.jpg"
                    className="flex-1 px-3.5 py-2 bg-white border border-[#6A0019]/25 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs uppercase tracking-wider font-bold text-[#6A0019] font-display">
                  Availability
                </label>
                <button
                  type="button"
                  onClick={() => setItemForm({ ...itemForm, isAvailable: !itemForm.isAvailable })}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                    itemForm.isAvailable
                      ? 'bg-[#EEF6EF] text-[#2B6633] border-[#BADBBE]'
                      : 'bg-[#FDF0ED] text-[#9E3524] border-[#F2C2B8]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      itemForm.isAvailable ? 'bg-[#3B8E47]' : 'bg-[#B83E2A]'
                    }`}
                  />
                  <span>{itemForm.isAvailable ? 'Available' : 'Sold out'}</span>
                </button>
              </div>

              {/* Sticky Footer */}
              <div className="pt-4 border-t border-[#6A0019]/15 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#2C1810]/70 hover:bg-[#6A0019]/10 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingItem}
                  className="px-5 py-2.5 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] font-display text-xs uppercase tracking-wider font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Save Changes' : 'Create Item'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CREATE / EDIT CATEGORY
          ───────────────────────────────────────────────────────────── */}
      {isCategoryModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-[#FBF7F2] text-[#2C1810] rounded-3xl max-w-md w-full border border-[#6A0019]/20 shadow-2xl overflow-hidden flex flex-col font-body">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#6A0019]/15 bg-[#EFE6DC]/40">
              <h3 className="font-display font-bold text-lg text-[#6A0019]">
                {editingCategory ? `Edit: ${editingCategory.name}` : 'New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-full text-[#6A0019]/60 hover:text-[#6A0019] hover:bg-[#6A0019]/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1 font-display">
                  Category Title *
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="e.g. Sundae"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#6A0019]/25 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1 font-display">
                  Tagline / Subhead
                </label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="e.g. Sweet Tooth"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#6A0019]/25 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1 font-display">
                  Display Order
                </label>
                <input
                  type="number"
                  value={categoryForm.displayOrder}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, displayOrder: Number(e.target.value) })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-[#6A0019]/25 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#6A0019]"
                />
              </div>

              <div className="pt-4 border-t border-[#6A0019]/15 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#2C1810]/70 hover:bg-[#6A0019]/10 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCategory}
                  className="px-5 py-2.5 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] font-display text-xs uppercase tracking-wider font-bold rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCategory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCategory ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DESTRUCTION CONFIRMATION
          ───────────────────────────────────────────────────────────── */}
      {confirmModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-[#FBF7F2] text-[#2C1810] rounded-3xl max-w-sm w-full p-6 border border-[#6A0019]/20 shadow-2xl font-body text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 stroke-[1.8]" />
            </div>

            <h3 className="font-display font-bold text-base text-[#6A0019]">
              {confirmModal.title}
            </h3>
            <p className="text-xs text-[#2C1810]/70 mt-1.5 leading-relaxed">
              {confirmModal.message}
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 text-xs font-semibold text-[#2C1810]/70 hover:bg-[#6A0019]/10 rounded-xl transition cursor-pointer"
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
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-display text-xs uppercase tracking-wider font-bold rounded-xl transition shadow-2xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
