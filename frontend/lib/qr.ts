/**
 * Central QR code and table URL configuration & validation utility for Cream Treat.
 * 
 * Rules:
 * - Single source of truth for base URL, table URL, and QR URL construction.
 * - Respects NEXT_PUBLIC_APP_URL with fallback to window.location.origin or http://localhost:3000.
 * - QR table generation range: 1–100.
 * - Customer table order range: 1–999.
 */

export const MIN_QR_TABLE = 1;
export const MAX_QR_TABLE = 100;

export const MIN_ORDER_TABLE = 1;
export const MAX_ORDER_TABLE = 999;

/**
 * Returns the configured frontend application base URL without a trailing slash.
 * Priority:
 * 1. customUrl override (if provided)
 * 2. NEXT_PUBLIC_APP_URL environment variable (if non-localhost / production)
 * 3. window.location.origin (in browser environment, e.g. http://192.168.x.x:3000)
 * 4. NEXT_PUBLIC_APP_URL environment variable (fallback)
 * 5. 'http://localhost:3000' (default local development)
 */
export function getFrontendAppUrl(customUrl?: string): string {
  if (customUrl && typeof customUrl === 'string' && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  // If explicitly configured with a non-localhost production URL
  if (
    envUrl &&
    typeof envUrl === 'string' &&
    envUrl.trim() &&
    !envUrl.includes('localhost') &&
    !envUrl.includes('127.0.0.1')
  ) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // In browser: dynamically adopt the active origin (e.g. http://192.168.70.104:3000)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
}

/**
 * Constructs the standard customer ordering destination URL encoded into physical table QR codes.
 * Format: <APP_URL>/order?table=<tableNumber>
 * 
 * Example:
 * http://localhost:3000/order?table=5
 * https://creamtreat.example.com/order?table=5
 */
export function buildTableOrderUrl(
  tableNumber: number | string,
  baseUrl?: string,
): string {
  const base = getFrontendAppUrl(baseUrl);
  const normalizedTable = String(tableNumber).trim();
  return `${base}/order?table=${encodeURIComponent(normalizedTable)}`;
}

export interface ValidationResult<T = number> {
  isValid: boolean;
  error?: string;
  value?: T;
}

/**
 * Validates table count for Admin QR Code Generation (Range: 1–100).
 * Rejects:
 * - 0
 * - negative numbers
 * - decimals (e.g. 5.5)
 * - numbers > 100
 * - non-numeric inputs / strings
 */
export function validateQRTableCount(input: unknown): ValidationResult<number> {
  if (input === null || input === undefined || input === '') {
    return {
      isValid: false,
      error: 'Please enter the number of tables (1–100).',
    };
  }

  const str = String(input).trim();

  // Reject non-integer formats (letters, decimals, signs)
  if (!/^\d+$/.test(str)) {
    return {
      isValid: false,
      error: 'Number of tables must be a whole positive integer without decimals or letters.',
    };
  }

  const num = parseInt(str, 10);

  if (isNaN(num)) {
    return {
      isValid: false,
      error: 'Invalid number of tables.',
    };
  }

  if (num < MIN_QR_TABLE) {
    return {
      isValid: false,
      error: `Number of tables must be at least ${MIN_QR_TABLE}.`,
    };
  }

  if (num > MAX_QR_TABLE) {
    return {
      isValid: false,
      error: `Number of tables cannot exceed ${MAX_QR_TABLE}.`,
    };
  }

  return {
    isValid: true,
    value: num,
  };
}

/**
 * Validates a table number for Customer Ordering (Range: 1–999).
 * Used when reading table from URL or manual fallback entry.
 */
export function validateCustomerTableNumber(
  input: unknown,
): ValidationResult<number> {
  if (input === null || input === undefined || input === '') {
    return {
      isValid: false,
      error: 'Table number is required.',
    };
  }

  const str = String(input).trim();

  // Strict whole positive digits
  if (!/^\d+$/.test(str)) {
    return {
      isValid: false,
      error: 'Invalid table number.',
    };
  }

  const num = parseInt(str, 10);

  if (isNaN(num) || num < MIN_ORDER_TABLE || num > MAX_ORDER_TABLE) {
    return {
      isValid: false,
      error: 'Invalid table number.',
    };
  }

  return {
    isValid: true,
    value: num,
  };
}

export type TableUrlParamStatus =
  | { status: 'VALID'; tableNumber: number }
  | { status: 'MISSING' }
  | { status: 'INVALID'; error: string };

/**
 * Parses and validates the ?table= query parameter from a customer URL.
 */
export function parseTableUrlParam(param: string | null): TableUrlParamStatus {
  if (param === null || param.trim() === '') {
    return { status: 'MISSING' };
  }

  const validation = validateCustomerTableNumber(param);
  if (!validation.isValid || validation.value === undefined) {
    return {
      status: 'INVALID',
      error: 'Invalid table number.',
    };
  }

  return {
    status: 'VALID',
    tableNumber: validation.value,
  };
}
