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
      return 'invalid';
    }
    return 'invalid';
  } catch {
    return 'invalid';
  }
}

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
    const firstUrl = envUrl.split(',')[0].trim();
    return firstUrl.replace(/\/+$/, '');
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
