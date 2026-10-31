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
 * Resolves to the local LAN host when accessed from a mobile device on Wi-Fi,
 * respects NEXT_PUBLIC_SOCKET_URL in production, and falls back to localhost:3001.
 */
export function getSocketServerUrl(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    const envSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
    if (
      envSocketUrl &&
      typeof envSocketUrl === 'string' &&
      !envSocketUrl.includes('localhost') &&
      !envSocketUrl.includes('127.0.0.1')
    ) {
      return envSocketUrl.trim().replace(/\/+$/, '');
    }
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}:3001`;
  }

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
