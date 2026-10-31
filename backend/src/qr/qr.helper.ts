/**
 * Backend QR Code & Table URL Helper for Cream Treat.
 * 
 * Provides centralized table URL construction and range validation
 * matching the frontend implementation.
 */

export const MIN_QR_TABLE = 1;
export const MAX_QR_TABLE = 100;

export const MIN_ORDER_TABLE = 1;
export const MAX_ORDER_TABLE = 999;

export interface TableValidation {
  isValid: boolean;
  error?: string;
  tableNumber?: number;
}

/**
 * Returns normalized base application URL.
 */
export function getAppBaseUrl(overrideUrl?: string): string {
  if (overrideUrl && typeof overrideUrl === 'string' && overrideUrl.trim()) {
    return overrideUrl.trim().replace(/\/+$/, '');
  }

  const envUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return 'http://localhost:3000';
}

/**
 * Constructs destination URL for customer QR code.
 * Format: <APP_URL>/order?table=<tableNumber>
 */
export function generateTableOrderUrl(
  tableNumber: number | string,
  baseUrl?: string,
): string {
  const base = getAppBaseUrl(baseUrl);
  const normalized = String(tableNumber).trim();
  return `${base}/order?table=${encodeURIComponent(normalized)}`;
}

/**
 * Validates table input for QR generation (1–100).
 */
export function validateQRTable(input: unknown): TableValidation {
  if (input === null || input === undefined || input === '') {
    return { isValid: false, error: 'Table number is required.' };
  }

  const str = String(input).trim();
  if (!/^\d+$/.test(str)) {
    return {
      isValid: false,
      error: 'Table number must be a whole positive integer without decimals.',
    };
  }

  const num = parseInt(str, 10);
  if (isNaN(num) || num < MIN_QR_TABLE || num > MAX_QR_TABLE) {
    return {
      isValid: false,
      error: `Table number must be between ${MIN_QR_TABLE} and ${MAX_QR_TABLE}.`,
    };
  }

  return { isValid: true, tableNumber: num };
}

/**
 * Validates table input for Order placement (1–999).
 */
export function validateOrderTable(input: unknown): TableValidation {
  if (input === null || input === undefined || input === '') {
    return { isValid: false, error: 'Table number is required.' };
  }

  const str = String(input).trim();
  if (!/^\d+$/.test(str)) {
    return {
      isValid: false,
      error: 'Table number must be a positive integer.',
    };
  }

  const num = parseInt(str, 10);
  if (isNaN(num) || num < MIN_ORDER_TABLE || num > MAX_ORDER_TABLE) {
    return {
      isValid: false,
      error: `Table number must be between ${MIN_ORDER_TABLE} and ${MAX_ORDER_TABLE}.`,
    };
  }

  return { isValid: true, tableNumber: num };
}
