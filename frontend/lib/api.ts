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
  CreateCategoryPayload,
  UpdateCategoryPayload,
  DeleteCategoryResponse,
  CreateFoodItemPayload,
  UpdateFoodItemPayload,
  DeleteFoodItemResponse,
} from '@/types/admin';

/**
 * Returns the configured backend REST API base URL.
 * Automatically resolves to the local network host when testing from a mobile phone on LAN,
 * uses NEXT_PUBLIC_API_URL when explicitly configured or in production,
 * and falls back to http://localhost:3001 for local development.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (
      envUrl &&
      typeof envUrl === 'string' &&
      !envUrl.includes('localhost') &&
      !envUrl.includes('127.0.0.1')
    ) {
      return envUrl.trim().replace(/\/+$/, '');
    }
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}:3001`;
  }

  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return 'http://localhost:3001';
}

/**
 * Safely extracts diagnostic error message from a failed HTTP response for console logging without throwing
 */
async function parseResponseErrorDetails(res: Response): Promise<string> {
  try {
    const data = await res.clone().json();
    if (data?.message) {
      return Array.isArray(data.message)
        ? data.message.join(', ')
        : String(data.message);
    }
    return JSON.stringify(data);
  } catch {
    try {
      return await res.clone().text();
    } catch {
      return 'No response body';
    }
  }
}

export async function fetchCategories(): Promise<Category[]> {
  const baseUrl = getApiBaseUrl();
  try {
    const res = await fetch(`${baseUrl}/menu/categories`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const details = await parseResponseErrorDetails(res);
      console.error(
        `[Cream Treat API] GET ${baseUrl}/menu/categories failed (${res.status} ${res.statusText}):`,
        details,
      );
      throw new Error('Unable to load menu categories. Please try again.');
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unable to load')) {
      throw err;
    }
    console.error(
      `[Cream Treat API] Connection error GET ${baseUrl}/menu/categories:`,
      err,
    );
    throw new Error(
      'Unable to connect to the restaurant menu service. Please verify your connection.',
    );
  }
}

export async function fetchFoodItems(
  categoryId?: string,
): Promise<FoodItem[]> {
  const baseUrl = getApiBaseUrl();
  const url = categoryId
    ? `${baseUrl}/menu/items?categoryId=${encodeURIComponent(categoryId)}`
    : `${baseUrl}/menu/items`;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const details = await parseResponseErrorDetails(res);
      console.error(
        `[Cream Treat API] GET ${url} failed (${res.status} ${res.statusText}):`,
        details,
      );
      throw new Error('Unable to load menu items. Please try again.');
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unable to load')) {
      throw err;
    }
    console.error(`[Cream Treat API] Connection error GET ${url}:`, err);
    throw new Error(
      'Unable to connect to the restaurant menu service. Please verify your connection.',
    );
  }
}

export async function fetchFoodItemById(id: string): Promise<FoodItem> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/menu/items/${id}`;
  try {
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const details = await parseResponseErrorDetails(res);
      console.error(
        `[Cream Treat API] GET ${url} failed (${res.status} ${res.statusText}):`,
        details,
      );
      throw new Error('Unable to load item details. Please try again.');
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Unable to load')) {
      throw err;
    }
    console.error(`[Cream Treat API] Connection error GET ${url}:`, err);
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
    const res = await fetch(`${getApiBaseUrl()}/orders`, {
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
    const res = await fetch(`${getApiBaseUrl()}/orders/${encodeURIComponent(orderId)}`, {
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
    const res = await fetch(`${getApiBaseUrl()}/auth/admin/login`, {
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
    const res = await fetch(`${getApiBaseUrl()}/auth/admin/me`, {
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
      await fetch(`${getApiBaseUrl()}/auth/admin/logout`, {
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
  const res = await fetch(`${getApiBaseUrl()}/admin/categories`, {
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
    ? `${getApiBaseUrl()}/admin/orders?${queryString}`
    : `${getApiBaseUrl()}/admin/orders`;

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
      `${getApiBaseUrl()}/admin/orders/${encodeURIComponent(id)}`,
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
      `${getApiBaseUrl()}/admin/orders/${encodeURIComponent(orderId)}/status`,
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

/**
 * Helper to safely extract error messages from API responses.
 */
async function parseResponseErrorMessage(
  res: Response,
  defaultMessage: string,
): Promise<string> {
  try {
    const errorData = await res.json();
    if (errorData?.message) {
      return Array.isArray(errorData.message)
        ? errorData.message.join(', ')
        : String(errorData.message);
    }
  } catch {
    // Return default message if body cannot be parsed
  }
  return defaultMessage;
}

/**
 * Protected Admin API call: creates a new category.
 */
export async function createAdminCategory(
  data: CreateCategoryPayload,
  tokenOverride?: string,
): Promise<Category> {
  const token = tokenOverride || getAdminToken();
  if (!token) throw new Error('Unauthorized');

  const res = await fetch(`${getApiBaseUrl()}/admin/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    clearAdminSession();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const msg = await parseResponseErrorMessage(res, 'Failed to create category');
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Protected Admin API call: updates category details or display order.
 */
export async function updateAdminCategory(
  id: string,
  data: UpdateCategoryPayload,
  tokenOverride?: string,
): Promise<Category> {
  const token = tokenOverride || getAdminToken();
  if (!token) throw new Error('Unauthorized');

  const res = await fetch(
    `${getApiBaseUrl()}/admin/categories/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    },
  );

  if (res.status === 401) {
    clearAdminSession();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const msg = await parseResponseErrorMessage(res, 'Failed to update category');
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Protected Admin API call: deletes or deactivates a category.
 * If food items exist, the server soft-deactivates it (deleted: false).
 * If no food items exist, permanently deletes it (deleted: true).
 */
export async function deleteAdminCategory(
  id: string,
  tokenOverride?: string,
): Promise<DeleteCategoryResponse> {
  const token = tokenOverride || getAdminToken();
  if (!token) throw new Error('Unauthorized');

  const res = await fetch(
    `${getApiBaseUrl()}/admin/categories/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (res.status === 401) {
    clearAdminSession();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const msg = await parseResponseErrorMessage(
      res,
      'Failed to delete or deactivate category',
    );
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Protected Admin API call: fetches all food items (including unavailable items),
 * optionally filtered by categoryId.
 */
export async function fetchAdminFoodItems(
  categoryId?: string,
  tokenOverride?: string,
): Promise<FoodItem[]> {
  const token = tokenOverride || getAdminToken();
  if (!token) throw new Error('Unauthorized');

  const url = categoryId
    ? `${getApiBaseUrl()}/admin/items?categoryId=${encodeURIComponent(categoryId)}`
    : `${getApiBaseUrl()}/admin/items`;

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
  if (!res.ok) {
    const msg = await parseResponseErrorMessage(res, 'Failed to load food items');
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Protected Admin API call: creates a new food item.
 */
export async function createAdminFoodItem(
  data: CreateFoodItemPayload,
  tokenOverride?: string,
): Promise<FoodItem> {
  const token = tokenOverride || getAdminToken();
  if (!token) throw new Error('Unauthorized');

  const res = await fetch(`${getApiBaseUrl()}/admin/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (res.status === 401) {
    clearAdminSession();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const msg = await parseResponseErrorMessage(res, 'Failed to create food item');
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Protected Admin API call: updates a food item's price, availability, or details.
 */
export async function updateAdminFoodItem(
  id: string,
  data: UpdateFoodItemPayload,
  tokenOverride?: string,
): Promise<FoodItem> {
  const token = tokenOverride || getAdminToken();
  if (!token) throw new Error('Unauthorized');

  const res = await fetch(
    `${getApiBaseUrl()}/admin/items/${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    },
  );

  if (res.status === 401) {
    clearAdminSession();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const msg = await parseResponseErrorMessage(res, 'Failed to update food item');
    throw new Error(msg);
  }
  return res.json();
}

/**
 * Protected Admin API call: deletes a food item permanently.
 */
export async function deleteAdminFoodItem(
  id: string,
  tokenOverride?: string,
): Promise<DeleteFoodItemResponse> {
  const token = tokenOverride || getAdminToken();
  if (!token) throw new Error('Unauthorized');

  const res = await fetch(
    `${getApiBaseUrl()}/admin/items/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (res.status === 401) {
    clearAdminSession();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const msg = await parseResponseErrorMessage(res, 'Failed to delete food item');
    throw new Error(msg);
  }
  return res.json();
}



