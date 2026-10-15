import { OrderStatus } from './menu';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN';
}

export interface AdminLoginResponse {
  accessToken: string;
  admin: AdminUser;
}

export interface AdminOrderItem {
  name: string;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  foodItemId?: string;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  orderDate: string;
  tableNumber: number;
  items: AdminOrderItem[];
  subtotal: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrdersPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminOrdersResponse {
  data: AdminOrder[];
  pagination: AdminOrdersPagination;
}

export interface AdminOrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  date?: string;
}
