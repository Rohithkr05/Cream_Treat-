import { io, Socket } from 'socket.io-client';
import { OrderStatus } from '@/types/menu';

export interface OrderCreatedSocketEvent {
  id: string;
  orderNumber: string;
  orderDate: string;
  tableNumber: number;
  status: OrderStatus;
  subtotal: number;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    itemTotal: number;
    foodItemId?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusUpdatedSocketEvent {
  id: string;
  orderNumber: string;
  orderDate?: string;
  tableNumber?: number;
  status: OrderStatus;
  subtotal?: number;
  total?: number;
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    itemTotal: number;
    foodItemId?: string;
  }>;
  createdAt?: string;
  updatedAt: string;
}

export type SocketConnectionState =
  | 'connected'
  | 'reconnecting'
  | 'polling-fallback';

/**
 * Returns the configured base URL for Socket.IO connection.
 */
export function getSocketServerUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001'
  );
}

/**
 * Creates and initializes a managed Socket.IO client instance.
 * Automatically handles reconnection, fallback transport, and optional JWT authentication.
 */
export function createOrderSocket(token?: string | null): Socket {
  const url = getSocketServerUrl();

  const socket = io(url, {
    auth: token ? { token: `Bearer ${token}` } : {},
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  return socket;
}
