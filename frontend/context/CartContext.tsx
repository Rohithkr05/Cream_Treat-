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
import {
  isValidMongoObjectId,
  sanitizeCartItems,
  addCartItem,
  decrementCartItem,
  deleteCartItem,
  setCartItemQuantity,
} from '@/lib/checkout';

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

  // Restore cart and table from localStorage on mount (dropping any stale client_* IDs)
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const { items: cleanItems, removedInvalidCount } = sanitizeCartItems(parsed);
        setItems(cleanItems);
        if (removedInvalidCount > 0) {
          console.warn(
            `[Cream Treat Cart] Removed ${removedInvalidCount} invalid or outdated item(s) from saved cart.`,
          );
        }
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
    if (!foodItem.isAvailable || !isValidMongoObjectId(foodItem._id)) {
      console.warn(
        `[Cream Treat Cart] Ignored attempt to add item "${foodItem?.name || 'unknown'}" without a valid backend ObjectId.`,
      );
      return;
    }

    setItems((prev) => addCartItem(prev, foodItem));
  }, []);

  const removeItem = useCallback((foodItemId: string) => {
    setItems((prev) => decrementCartItem(prev, foodItemId));
  }, []);

  const deleteItem = useCallback((foodItemId: string) => {
    setItems((prev) => deleteCartItem(prev, foodItemId));
  }, []);

  const updateQuantity = useCallback(
    (foodItemId: string, quantity: number) => {
      setItems((prev) => setCartItemQuantity(prev, foodItemId, quantity));
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
