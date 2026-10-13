'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { CartItem, FoodItem } from '@/types/menu';

interface CartContextType {
  items: CartItem[];
  tableNumber: number | null;
  addItem: (item: FoodItem) => void;
  removeItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  getItemQuantity: (itemId: string) => number;
  clearCart: () => void;
  setTableNumber: (table: number | null) => void;
  totalItemCount: number;
  totalAmountPaise: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'cream_treat_cart_v1';
const TABLE_STORAGE_KEY = 'cream_treat_table_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumberState] = useState<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore cart and table from localStorage on mount
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        setItems(JSON.parse(savedCart));
      }

      const savedTable = localStorage.getItem(TABLE_STORAGE_KEY);
      if (savedTable) {
        const parsed = parseInt(savedTable, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setTableNumberState(parsed);
        }
      }
    } catch {
      // LocalStorage error fallback
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save items to localStorage whenever cart changes
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
  }, [items, isInitialized]);

  // Save tableNumber to localStorage
  const setTableNumber = useCallback((table: number | null) => {
    setTableNumberState(table);
    try {
      if (table !== null && table > 0) {
        localStorage.setItem(TABLE_STORAGE_KEY, table.toString());
      } else {
        localStorage.removeItem(TABLE_STORAGE_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const addItem = useCallback((foodItem: FoodItem) => {
    if (!foodItem.isAvailable) return;

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (ci) => ci.foodItem._id === foodItem._id,
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      return [...prev, { foodItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((foodItemId: string) => {
    setItems((prev) => {
      const existing = prev.find((ci) => ci.foodItem._id === foodItemId);
      if (!existing) return prev;

      if (existing.quantity <= 1) {
        return prev.filter((ci) => ci.foodItem._id !== foodItemId);
      }

      return prev.map((ci) =>
        ci.foodItem._id === foodItemId
          ? { ...ci, quantity: ci.quantity - 1 }
          : ci,
      );
    });
  }, []);

  const deleteItem = useCallback((foodItemId: string) => {
    setItems((prev) => prev.filter((ci) => ci.foodItem._id !== foodItemId));
  }, []);

  const updateQuantity = useCallback(
    (foodItemId: string, quantity: number) => {
      setItems((prev) => {
        if (quantity <= 0) {
          return prev.filter((ci) => ci.foodItem._id !== foodItemId);
        }

        return prev.map((ci) =>
          ci.foodItem._id === foodItemId ? { ...ci, quantity } : ci,
        );
      });
    },
    [],
  );

  const getItemQuantity = useCallback(
    (foodItemId: string): number => {
      const found = items.find((ci) => ci.foodItem._id === foodItemId);
      return found ? found.quantity : 0;
    },
    [items],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const totalItemCount = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [items]);

  const totalAmountPaise = useMemo(() => {
    return items.reduce(
      (acc, curr) => acc + curr.foodItem.price * curr.quantity,
      0,
    );
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      tableNumber,
      addItem,
      removeItem,
      deleteItem,
      updateQuantity,
      getItemQuantity,
      clearCart,
      setTableNumber,
      totalItemCount,
      totalAmountPaise,
    }),
    [
      items,
      tableNumber,
      addItem,
      removeItem,
      deleteItem,
      updateQuantity,
      getItemQuantity,
      clearCart,
      setTableNumber,
      totalItemCount,
      totalAmountPaise,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
