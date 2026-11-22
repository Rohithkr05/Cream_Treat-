import type {
  CartItem,
  Category,
  CreateOrderItemRequest,
  CreateOrderRequest,
  FoodItem,
  OrderResponse,
} from '../types/menu';

export const MIN_ORDER_TABLE = 1;
export const MAX_ORDER_TABLE = 999;
export const MIN_ITEM_QUANTITY = 1;
export const MAX_ITEM_QUANTITY = 99;

const MONGO_OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

/**
 * Validates that a foodItemId (or any entity ID) is a 24-character hex MongoDB ObjectId.
 * Rejects synthetic frontend fallback IDs (e.g. "client_*") before they reach the cart or API.
 */
export function isValidMongoObjectId(value: unknown): value is string {
  return typeof value === 'string' && MONGO_OBJECT_ID_REGEX.test(value.trim());
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '[::1]';
}

function extractPort(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.port || '3001';
  } catch {
    return '3001';
  }
}

export interface ApiUrlResolutionOptions {
  envUrl?: string;
  windowHostname?: string;
  windowProtocol?: string;
}

/**
 * Resolves the backend API base URL deterministically.
 * - Honors an explicit non-empty NEXT_PUBLIC_API_URL in browser and server contexts.
 * - Adapts localhost/127.0.0.1 NEXT_PUBLIC_API_URL to the active LAN IP when accessed
 *   from another device on the local network (e.g. phone scanning a table QR code).
 */
export function resolveApiBaseUrl(options: ApiUrlResolutionOptions = {}): string {
  const trimmedEnv =
    typeof options.envUrl === 'string' && options.envUrl.trim()
      ? options.envUrl.trim().replace(/\/+$/, '')
      : '';

  const hostname =
    typeof options.windowHostname === 'string' ? options.windowHostname.trim() : '';
  const protocol =
    typeof options.windowProtocol === 'string' && options.windowProtocol.trim()
      ? options.windowProtocol.trim()
      : 'http:';

  if (trimmedEnv) {
    if (hostname && !isLocalHostname(hostname)) {
      const envPointsLocal =
        trimmedEnv.includes('localhost') || trimmedEnv.includes('127.0.0.1');
      if (envPointsLocal) {
        const port = extractPort(trimmedEnv);
        return `${protocol}//${hostname}:${port}`;
      }
    }
    return trimmedEnv;
  }

  if (hostname) {
    if (isLocalHostname(hostname)) {
      return 'http://localhost:3001';
    }
    return `${protocol}//${hostname}:3001`;
  }

  return 'http://localhost:3001';
}

export interface SanitizedCartResult {
  items: CartItem[];
  removedInvalidCount: number;
}

/**
 * Sanitizes persisted cart data loaded from localStorage.
 * Strips corrupted entries and any legacy synthetic "client_*" items so invalid IDs
 * cannot be submitted to POST /orders.
 */
export function sanitizeCartItems(raw: unknown): SanitizedCartResult {
  if (!Array.isArray(raw)) {
    return { items: [], removedInvalidCount: 0 };
  }

  const validItems: CartItem[] = [];
  let removedInvalidCount = 0;

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      removedInvalidCount++;
      continue;
    }

    const candidate = entry as Partial<CartItem>;
    const foodItem = candidate.foodItem;
    const rawQty = candidate.quantity;

    if (
      !foodItem ||
      typeof foodItem !== 'object' ||
      !isValidMongoObjectId(foodItem._id) ||
      typeof foodItem.name !== 'string' ||
      !foodItem.name.trim() ||
      typeof foodItem.price !== 'number' ||
      !Number.isFinite(foodItem.price) ||
      foodItem.price < 0 ||
      typeof rawQty !== 'number' ||
      !Number.isInteger(rawQty) ||
      rawQty < MIN_ITEM_QUANTITY
    ) {
      removedInvalidCount++;
      continue;
    }

    const clampedQty = Math.min(rawQty, MAX_ITEM_QUANTITY);
    validItems.push({
      foodItem: {
        ...foodItem,
        _id: foodItem._id.trim(),
      },
      quantity: clampedQty,
    });
  }

  return { items: validItems, removedInvalidCount };
}

export interface CheckoutValidationResult {
  valid: boolean;
  error?: string;
  invalidItems: CartItem[];
  payload?: CreateOrderRequest;
}

/**
 * Validates customer table number, cart items, quantities, and MongoDB ObjectIds
 * before sending POST /orders. Strips untrusted client price/total fields.
 */
export function validateCheckoutSubmission(
  tableNumber: number | null | undefined,
  items: CartItem[],
): CheckoutValidationResult {
  if (
    tableNumber === null ||
    tableNumber === undefined ||
    !Number.isInteger(tableNumber) ||
    tableNumber < MIN_ORDER_TABLE ||
    tableNumber > MAX_ORDER_TABLE
  ) {
    return {
      valid: false,
      error: `Please provide a valid table number (${MIN_ORDER_TABLE}–${MAX_ORDER_TABLE}) before placing your order.`,
      invalidItems: [],
    };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return {
      valid: false,
      error: 'Your cart is empty. Please add at least one menu item to place an order.',
      invalidItems: [],
    };
  }

  const invalidItems: CartItem[] = [];
  const quantityTotals = new Map<string, number>();

  for (const cartItem of items) {
    const id = cartItem?.foodItem?._id;
    const qty = cartItem?.quantity;

    if (!isValidMongoObjectId(id)) {
      invalidItems.push(cartItem);
      continue;
    }

    if (
      typeof qty !== 'number' ||
      !Number.isInteger(qty) ||
      qty < MIN_ITEM_QUANTITY ||
      qty > MAX_ITEM_QUANTITY
    ) {
      return {
        valid: false,
        error: `Quantity for "${cartItem.foodItem?.name || 'item'}" must be a whole number between ${MIN_ITEM_QUANTITY} and ${MAX_ITEM_QUANTITY}.`,
        invalidItems: [],
      };
    }

    const normalizedId = id.trim();
    const combinedQty = (quantityTotals.get(normalizedId) || 0) + qty;
    if (combinedQty > MAX_ITEM_QUANTITY) {
      return {
        valid: false,
        error: `Total quantity for "${cartItem.foodItem.name}" cannot exceed ${MAX_ITEM_QUANTITY}.`,
        invalidItems: [],
      };
    }
    quantityTotals.set(normalizedId, combinedQty);
  }

  if (invalidItems.length > 0) {
    return {
      valid: false,
      error: 'Some items in your cart are no longer available. Please refresh your menu.',
      invalidItems,
    };
  }

  const payloadItems: CreateOrderItemRequest[] = Array.from(quantityTotals.entries()).map(
    ([foodItemId, quantity]) => ({
      foodItemId,
      quantity,
    }),
  );

  return {
    valid: true,
    invalidItems: [],
    payload: {
      tableNumber,
      items: payloadItems,
    },
  };
}

/**
 * Extracts raw text error message from standard NestJS or JSON error responses.
 */
export function extractBackendErrorMessage(errorData: unknown): string {
  if (!errorData || typeof errorData !== 'object') {
    return '';
  }

  const record = errorData as { message?: unknown; error?: unknown };
  if (Array.isArray(record.message)) {
    return record.message
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join(', ');
  }

  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim();
  }

  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error.trim();
  }

  return '';
}

/**
 * Converts backend HTTP error responses into customer-safe, actionable checkout messages
 * without masking real validation, availability, or server failure categories.
 */
export function formatOrderApiError(
  status: number,
  errorData: unknown,
): string {
  const rawMsg = extractBackendErrorMessage(errorData);
  const lower = rawMsg.toLowerCase();

  if (status === 503 || lower.includes('database service')) {
    return "We couldn't place your order right now because our ordering service is temporarily unavailable. Please try again shortly.";
  }

  if (status === 400) {
    if (lower.includes('objectid') || lower.includes('fooditemid')) {
      return 'Some items in your cart are no longer available. Please refresh your menu.';
    }
    if (lower.includes('unavailable') || lower.includes('inactive')) {
      return rawMsg || 'One or more items are currently unavailable. Please update your cart.';
    }
    if (lower.includes('table')) {
      return `Please provide a valid table number (${MIN_ORDER_TABLE}–${MAX_ORDER_TABLE}).`;
    }
    if (lower.includes('quantity')) {
      return 'Item quantities must be whole numbers between 1 and 99. Please update your cart.';
    }
    return rawMsg || 'Please review your cart items and table number before trying again.';
  }

  if (status === 404) {
    if (lower.startsWith('cannot post')) {
      return "We couldn't place your order right now. Please try again.";
    }
    return 'Some items in your cart are no longer available. Please refresh your menu.';
  }

  if (status >= 500) {
    return "We couldn't place your order right now. Please try again.";
  }

  return rawMsg || "We couldn't place your order right now. Please try again.";
}

/**
 * Formats network/CORS/URL errors when fetch fails before reaching the backend.
 */
export function formatOrderNetworkError(err: unknown): string {
  if (err instanceof TypeError) {
    return 'Unable to connect to the shop. Please check your internet connection.';
  }

  if (err instanceof Error && err.message.trim()) {
    const lower = err.message.toLowerCase();
    if (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('fetch failed') ||
      lower.includes('econnrefused') ||
      lower.includes('load failed')
    ) {
      return 'Unable to connect to the shop. Please check your internet connection.';
    }
    return err.message;
  }

  return 'Unable to connect to the shop. Please check your internet connection.';
}

/**
 * Pure cart state transitions shared by CartContext and unit tests.
 */
export function addCartItem(prev: CartItem[], foodItem: FoodItem): CartItem[] {
  if (!foodItem.isAvailable || !isValidMongoObjectId(foodItem._id)) {
    return prev;
  }

  const normalizedId = foodItem._id.trim();
  const existingIndex = prev.findIndex((ci) => ci.foodItem._id === normalizedId);

  if (existingIndex > -1) {
    const currentQty = prev[existingIndex].quantity;
    if (currentQty >= MAX_ITEM_QUANTITY) {
      return prev;
    }
    const updated = [...prev];
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: currentQty + 1,
    };
    return updated;
  }

  return [...prev, { foodItem: { ...foodItem, _id: normalizedId }, quantity: 1 }];
}

export function decrementCartItem(prev: CartItem[], foodItemId: string): CartItem[] {
  const existing = prev.find((ci) => ci.foodItem._id === foodItemId);
  if (!existing) return prev;

  if (existing.quantity <= 1) {
    return prev.filter((ci) => ci.foodItem._id !== foodItemId);
  }

  return prev.map((ci) =>
    ci.foodItem._id === foodItemId ? { ...ci, quantity: ci.quantity - 1 } : ci,
  );
}

export function deleteCartItem(prev: CartItem[], foodItemId: string): CartItem[] {
  return prev.filter((ci) => ci.foodItem._id !== foodItemId);
}

export function setCartItemQuantity(
  prev: CartItem[],
  foodItemId: string,
  quantity: number,
): CartItem[] {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return prev.filter((ci) => ci.foodItem._id !== foodItemId);
  }
  const clamped = Math.min(quantity, MAX_ITEM_QUANTITY);
  return prev.map((ci) =>
    ci.foodItem._id === foodItemId ? { ...ci, quantity: clamped } : ci,
  );
}

export interface SubmissionLock {
  current: boolean;
}

export interface ProtectedCheckoutParams {
  lock: SubmissionLock;
  tableNumber: number | null;
  items: CartItem[];
  submitOrder: (payload: CreateOrderRequest) => Promise<OrderResponse>;
  onSuccess: (order: OrderResponse) => void;
}

export interface ProtectedCheckoutResult {
  status: 'duplicate_ignored' | 'validation_error' | 'submitted' | 'failed';
  error?: string;
  order?: OrderResponse;
}

/**
 * Coordinates duplicate-submission locking, payload validation, cart preservation on error,
 * and post-success clearing across /cart and CartDrawer.
 */
export async function executeProtectedCheckout(
  params: ProtectedCheckoutParams,
): Promise<ProtectedCheckoutResult> {
  if (params.lock.current) {
    return { status: 'duplicate_ignored' };
  }

  const validation = validateCheckoutSubmission(params.tableNumber, params.items);
  if (!validation.valid || !validation.payload) {
    return {
      status: 'validation_error',
      error: validation.error || 'Please review your cart items before placing your order.',
    };
  }

  params.lock.current = true;
  try {
    const order = await params.submitOrder(validation.payload);
    params.onSuccess(order);
    return { status: 'submitted', order };
  } catch (err: unknown) {
    params.lock.current = false;
    return {
      status: 'failed',
      error:
        err instanceof Error
          ? err.message
          : "We couldn't place your order right now. Please try again.",
    };
  }
}

/**
 * Formats HTTP API error responses when fetching public menu categories or food items
 * without masking real availability, database outage (503), or server failure categories.
 */
export function formatMenuApiError(
  status: number,
  errorData: unknown,
  resourceLabel: 'menu categories' | 'menu items' = 'menu items',
): string {
  const rawMsg = extractBackendErrorMessage(errorData);
  const lower = rawMsg.toLowerCase();

  if (status === 503 || lower.includes('database service') || lower.includes('mongodb')) {
    return 'The live kitchen menu service is temporarily unavailable because the database is offline. Please try again shortly.';
  }

  if (status === 404) {
    return `Unable to reach the ${resourceLabel} endpoint. Please refresh the page and try again.`;
  }

  if (status >= 500) {
    return `The kitchen server encountered an error while loading ${resourceLabel}. Please try again.`;
  }

  return rawMsg || `Unable to load ${resourceLabel}. Please try again.`;
}

/**
 * Formats network/connection errors when fetching menu data fails before an HTTP response.
 */
export function formatMenuNetworkError(err: unknown): string {
  if (err instanceof TypeError) {
    return 'Unable to connect to the kitchen menu service. Please check your connection and try again.';
  }

  if (err instanceof Error && err.message.trim()) {
    const lower = err.message.toLowerCase();
    if (
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('fetch failed') ||
      lower.includes('econnrefused') ||
      lower.includes('load failed')
    ) {
      return 'Unable to connect to the kitchen menu service. Please check that the server is running and try again.';
    }
    return err.message;
  }

  return 'Unable to connect to the kitchen menu service. Please verify your connection and try again.';
}

/**
 * Resolves a string category ID whether FoodItem.categoryId is a raw ObjectId string
 * or a populated Category reference object.
 */
export function extractItemCategoryId(item: FoodItem): string {
  if (typeof item.categoryId === 'string') {
    return item.categoryId.trim();
  }
  if (item.categoryId && typeof item.categoryId === 'object') {
    return typeof item.categoryId._id === 'string' ? item.categoryId._id.trim() : '';
  }
  return '';
}

/**
 * Filters public food items so unavailable dishes or items belonging to deactivated
 * categories cannot leak into customer menu sections.
 */
export function filterMenuItemsByActiveCategories(
  items: FoodItem[],
  categories: Category[] = [],
): FoodItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const hasCategoryList = Array.isArray(categories) && categories.length > 0;
  const activeCategoryIds = new Set<string>();
  const inactiveCategoryIds = new Set<string>();

  if (hasCategoryList) {
    for (const cat of categories) {
      if (!cat || !isValidMongoObjectId(cat._id)) continue;
      if (cat.isActive === false) {
        inactiveCategoryIds.add(cat._id.trim());
      } else {
        activeCategoryIds.add(cat._id.trim());
      }
    }
  }

  return items.filter((item) => {
    if (!item || !isValidMongoObjectId(item._id) || !item.isAvailable) {
      return false;
    }

    if (
      item.categoryId &&
      typeof item.categoryId === 'object' &&
      item.categoryId.isActive === false
    ) {
      return false;
    }

    const catId = extractItemCategoryId(item);
    if (catId && inactiveCategoryIds.has(catId)) {
      return false;
    }

    if (hasCategoryList && activeCategoryIds.size > 0 && catId) {
      return activeCategoryIds.has(catId);
    }

    return true;
  });
}

