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

export type OrderStatus =
  | 'NEW'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CreateOrderItemRequest {
  foodItemId: string;
  quantity: number;
}

export interface CreateOrderRequest {
  tableNumber: number;
  items: CreateOrderItemRequest[];
}

export interface OrderResponseItem {
  foodItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  displayOrderNumber: string;
  orderDate: string;
  tableNumber: number;
  status: OrderStatus;
  items: OrderResponseItem[];
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt?: string;
}

export type CustomerOrder = OrderResponse;
export type OrderItem = OrderResponseItem;
