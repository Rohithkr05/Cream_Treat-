import {
  Category,
  CreateOrderRequest,
  FoodItem,
  OrderResponse,
  OrderStatus,
} from '@/types/menu';
import {
  AdminLoginResponse,
  AdminOrder,
  AdminOrdersQuery,
  AdminOrdersResponse,
  AdminUser,
} from '@/types/admin';

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
 * Creates a new order on the backend with server-validated pricing.
 */
export async function createOrder(
  orderData: CreateOrderRequest,
): Promise<OrderResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    if (!res.ok) {
      let errorMessage = 'Unable to place your order. Please try again.';
      try {
        const errorData = await res.json();
        if (errorData?.message) {
          const msg = Array.isArray(errorData.message)
            ? errorData.message.join(', ')
            : String(errorData.message);

          if (msg.toLowerCase().includes('unavailable')) {
            errorMessage =
              'Some items in your cart are currently unavailable. Please review your cart.';
          } else if (msg.toLowerCase().includes('not found')) {
            errorMessage =
              'One or more items in your cart could not be found. Please review your cart.';
          } else if (msg.toLowerCase().includes('table')) {
            errorMessage = 'Please provide a valid table number (1–999).';
          }
        }
      } catch {
        // Fallback to default user-friendly error message
      }
      throw new Error(errorMessage);
    }

    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(
      'Unable to place your order. Please check your connection and try again.',
    );
  }
}

/**
 * Fetches confirmed order by ID for customer live order tracking.
 * Handles 200 (success), 400 (invalid ID), 404 (not found), and network/server errors.
 */
export async function getOrder(orderId: string): Promise<OrderResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
      cache: 'no-store',
    });

    if (res.status === 400) {
      throw new Error('Invalid order reference');
    }
    if (res.status === 404) {
      throw new Error("We couldn't find this order.");
    }
    if (!res.ok) {
      throw new Error('Unable to load your order right now.');
    }

    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Unable to load your order right now.');
  }
}

/**
 * Backward-compatible alias for getOrder.
 */
export const fetchOrderById = getOrder;

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

/* ==========================================================================
   Admin Authentication & Session Helpers (Phase 9)
   ========================================================================== */

const ADMIN_TOKEN_KEY = 'ct_admin_access_token';
const ADMIN_USER_KEY = 'ct_admin_user';

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getStoredAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(ADMIN_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminUser;
  } catch {
    return null;
  }
}

export function setStoredAdminUser(user: AdminUser): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_USER_KEY);
}

/**
 * Authenticates the administrator using email and password.
 * Returns JWT accessToken and safe admin profile.
 */
export async function adminLogin(
  email: string,
  password: string,
): Promise<AdminLoginResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 401 || res.status === 400) {
      throw new Error('Invalid email or password.');
    }

    if (!res.ok) {
      throw new Error('Login failed. Please try again.');
    }

    const data: AdminLoginResponse = await res.json();
    setAdminToken(data.accessToken);
    setStoredAdminUser(data.admin);
    return data;
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'Invalid email or password.') {
        throw err;
      }
    }
    throw new Error('Unable to sign in. Please verify your connection.');
  }
}

/**
 * Verifies current admin session by querying /auth/admin/me.
 */
export async function adminGetProfile(tokenOverride?: string): Promise<AdminUser> {
  const token = tokenOverride || getAdminToken();
  if (!token) {
    throw new Error('No admin token available');
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/admin/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      clearAdminSession();
      throw new Error('Session expired or unauthorized');
    }

    const user: AdminUser = await res.json();
    setStoredAdminUser(user);
    return user;
  } catch (err: unknown) {
    clearAdminSession();
    throw err instanceof Error ? err : new Error('Session expired');
  }
}

/**
 * Logs out the administrator and invalidates client session state.
 */
export async function adminLogout(): Promise<void> {
  const token = getAdminToken();
  try {
    if (token) {
      await fetch(`${API_BASE_URL}/auth/admin/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch {
    // Client-side cleanup occurs regardless of backend network state
  } finally {
    clearAdminSession();
  }
}

/**
 * Protected Admin API call: fetches categories requiring admin bearer token.
 */
export async function fetchAdminCategories(tokenOverride?: string): Promise<Category[]> {
  const token = tokenOverride || getAdminToken();
  const res = await fetch(`${API_BASE_URL}/admin/categories`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch admin categories: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Protected Admin API call: fetches paginated incoming orders with optional status and date filters.
 */
export async function fetchAdminOrders(
  params?: AdminOrdersQuery,
  tokenOverride?: string,
): Promise<AdminOrdersResponse> {
  const token = tokenOverride || getAdminToken();
  if (!token) {
    throw new Error('Unauthorized');
  }

  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.set('page', String(params.page));
  if (params?.limit) queryParams.set('limit', String(params.limit));
  if (params?.status) queryParams.set('status', params.status);
  if (params?.date) queryParams.set('date', params.date);

  const queryString = queryParams.toString();
  const url = queryString
    ? `${API_BASE_URL}/admin/orders?${queryString}`
    : `${API_BASE_URL}/admin/orders`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (res.status === 401) {
      clearAdminSession();
      throw new Error('Unauthorized');
    }
    if (res.status === 403) {
      throw new Error('Administrator access required.');
    }
    if (!res.ok) {
      throw new Error(
        'Unable to load orders. Please check your connection and try again.',
      );
    }

    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(
      'Unable to load orders. Please check your connection and try again.',
    );
  }
}

/**
 * Protected Admin API call: fetches a single order's details by ID.
 */
export async function fetchAdminOrderById(
  id: string,
  tokenOverride?: string,
): Promise<AdminOrder> {
  const token = tokenOverride || getAdminToken();
  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/orders/${encodeURIComponent(id)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      },
    );

    if (res.status === 401) {
      clearAdminSession();
      throw new Error('Unauthorized');
    }
    if (res.status === 403) {
      throw new Error('Administrator access required.');
    }
    if (res.status === 404) {
      throw new Error('Order not found');
    }
    if (!res.ok) {
      throw new Error('Unable to load order details. Please try again.');
    }

    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Unable to load order details. Please try again.');
  }
}

/**
 * Protected Admin API call: updates an order's lifecycle status.
 * Handles 200, 400, 401 (redirects/clears session), 403, 404, 409 (conflict), 500.
 */
export async function updateAdminOrderStatus(
  orderId: string,
  status: OrderStatus,
  tokenOverride?: string,
): Promise<AdminOrder> {
  const token = tokenOverride || getAdminToken();
  if (!token) {
    throw new Error('Unauthorized');
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/admin/orders/${encodeURIComponent(orderId)}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      },
    );

    if (res.status === 401) {
      clearAdminSession();
      throw new Error('Unauthorized');
    }

    if (res.status === 403) {
      throw new Error('Administrator access required.');
    }

    if (res.status === 404) {
      throw new Error('Order not found');
    }

    if (res.status === 409) {
      let conflictMsg =
        'This order has already been updated. Refresh the order.';
      try {
        const errorData = await res.json();
        if (errorData?.message) {
          conflictMsg = Array.isArray(errorData.message)
            ? errorData.message.join(', ')
            : String(errorData.message);
        }
      } catch {
        // fallback
      }
      const err = new Error(conflictMsg);
      (err as any).status = 409;
      throw err;
    }

    if (!res.ok) {
      throw new Error('Unable to update order status. Please try again.');
    }

    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Unable to update order status. Please try again.');
  }
}



