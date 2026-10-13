import { Category, FoodItem } from '@/types/menu';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/menu/categories`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error('Unable to load menu categories. Please try again.');
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unable to load')) {
      throw err;
    }
    throw new Error(
      'Unable to connect to the restaurant menu service. Please verify your connection.',
    );
  }
}

export async function fetchFoodItems(
  categoryId?: string,
): Promise<FoodItem[]> {
  try {
    const url = categoryId
      ? `${API_BASE_URL}/menu/items?categoryId=${encodeURIComponent(categoryId)}`
      : `${API_BASE_URL}/menu/items`;
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error('Unable to load menu items. Please try again.');
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unable to load')) {
      throw err;
    }
    throw new Error(
      'Unable to connect to the restaurant menu service. Please verify your connection.',
    );
  }
}

export async function fetchFoodItemById(id: string): Promise<FoodItem> {
  try {
    const res = await fetch(`${API_BASE_URL}/menu/items/${id}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error('Unable to load item details. Please try again.');
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unable to load')) {
      throw err;
    }
    throw new Error('Item could not be loaded.');
  }
}

/**
 * Formats integer paise into a human-friendly INR currency string.
 * Example: 12000 paise -> "₹120", 12050 paise -> "₹120.50"
 */
export function formatCurrency(paise: number): string {
  const rupees = paise / 100;
  if (Number.isInteger(rupees)) {
    return `₹${rupees}`;
  }
  return `₹${rupees.toFixed(2)}`;
}
