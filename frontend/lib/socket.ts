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
  const envSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (
    envSocketUrl &&
    typeof envSocketUrl === 'string' &&
    envSocketUrl.trim() &&
    !envSocketUrl.includes('localhost') &&
    !envSocketUrl.includes('127.0.0.1')
  ) {
    return envSocketUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    const isLan =
      /^192\.168\.\d+\.\d+$/.test(hostname) ||
      /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname) ||
      hostname.endsWith('.local');
    if (isLan) {
      const protocol = window.location.protocol;
      return `${protocol}//${hostname}:3001`;
    }
    return window.location.origin.replace(/\/+$/, '');
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
