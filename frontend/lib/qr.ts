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

export type QRBaseUrlClassification =
  | 'public_https'
  | 'lan_ip'
  | 'localhost'
  | 'invalid';

/**
 * Checks whether a given hostname is loopback / localhost.
 */
export function isLocalhost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '0.0.0.0' ||
    normalized === '[::1]'
  );
}

/**
 * Checks whether a given hostname is an RFC 1918 private LAN IP address or mDNS .local name.
 */
export function isLanAddress(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    /^192\.168\.\d+\.\d+$/.test(normalized) ||
    /^10\.\d+\.\d+\.\d+$/.test(normalized) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(normalized) ||
    normalized.endsWith('.local')
  );
}

/**
 * Validates whether a given URL is a valid public HTTPS URL suitable for
 * permanent restaurant table standees that work across all mobile cellular networks (4G/5G).
 */
export function isPublicHttpsUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return false;
  }
  try {
    const url = new URL(rawUrl.trim());
    if (url.protocol !== 'https:') return false;
    const hostname = url.hostname.toLowerCase();
    if (isLocalhost(hostname) || isLanAddress(hostname)) return false;
    return hostname.includes('.');
  } catch {
    return false;
  }
}

/**
 * Classifies a base URL into its operational category:
 * - 'public_https': Ready for 4G/5G mobile customers without restaurant Wi-Fi
 * - 'lan_ip': Local Wi-Fi testing only (requires customer to join shop Wi-Fi)
 * - 'localhost': Development workstation only (unreachable on mobile phones)
 * - 'invalid': Malformed or unsupported URL
 */
export function classifyQRBaseUrl(rawUrl: string): QRBaseUrlClassification {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return 'invalid';
  }
  try {
    const url = new URL(rawUrl.trim());
    const hostname = url.hostname.toLowerCase();
    if (isLocalhost(hostname)) return 'localhost';
    if (isLanAddress(hostname)) return 'lan_ip';
    if (url.protocol === 'https:' && hostname.includes('.')) {
      return 'public_https';
    }
    if (url.protocol === 'http:') {
      // Insecure plain HTTP over public internet
      return 'invalid';
    }
    return 'invalid';
  } catch {
    return 'invalid';
  }
}

/**
 * Returns the configured frontend application base URL without a trailing slash.
 * Priority:
 * 1. customUrl override (if provided)
 * 2. NEXT_PUBLIC_APP_URL environment variable (if non-localhost / production)
 * 3. window.location.origin (if non-localhost in browser)
 * 4. NEXT_PUBLIC_APP_URL environment variable (fallback)
 * 5. window.location.origin (browser fallback)
 * 6. 'http://localhost:3000' (default local development)
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

  // In browser: if active origin is NOT localhost (e.g. public domain or LAN IP)
  if (typeof window !== 'undefined' && window.location?.origin) {
    const host = window.location.hostname;
    if (!isLocalhost(host)) {
      return window.location.origin.replace(/\/+$/, '');
    }
  }

  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
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
