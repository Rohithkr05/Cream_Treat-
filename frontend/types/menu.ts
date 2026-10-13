export interface Category {
  _id: string;
  name: string;
  description?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FoodItem {
  _id: string;
  categoryId: string | Category;
  name: string;
  description?: string;
  /**
   * Price in integer paise (e.g. ₹120.00 = 12000 paise).
   */
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CartItem {
  foodItem: FoodItem;
  quantity: number;
}
