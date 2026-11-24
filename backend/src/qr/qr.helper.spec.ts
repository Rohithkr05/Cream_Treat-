import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateTableOrderUrl,
  getAppBaseUrl,
  validateQRTable,
  validateOrderTable,
  isPublicHttpsUrl,
  classifyQRBaseUrl,
  isLocalhost,
  isLanAddress,
  MIN_QR_TABLE,
  MAX_QR_TABLE,
  MIN_ORDER_TABLE,
  MAX_ORDER_TABLE,
} from './qr.helper.js';

describe('Phase 13: QR Helper & Table URL Specifications', () => {
  const originalFrontendUrl = process.env.FRONTEND_URL;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    delete process.env.FRONTEND_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  afterEach(() => {
    process.env.FRONTEND_URL = originalFrontendUrl;
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  describe('Part 22 Item 1: QR URL generation for table 1', () => {
    it('should generate correct URL for table 1', () => {
      const url = generateTableOrderUrl(1, 'http://localhost:3000');
      expect(url).toBe('http://localhost:3000/order?table=1');
    });
  });

  describe('Part 22 Item 2: QR URL generation for table 5', () => {
    it('should generate correct URL for table 5', () => {
      const url = generateTableOrderUrl(5, 'http://localhost:3000');
      expect(url).toBe('http://localhost:3000/order?table=5');
    });
  });

  describe('Part 22 Item 3: QR URL generation for table 100', () => {
    it('should generate correct URL for table 100', () => {
      const url = generateTableOrderUrl(100, 'http://localhost:3000');
      expect(url).toBe('http://localhost:3000/order?table=100');
    });
  });

  describe('Part 22 Item 4: Invalid table 0', () => {
    it('should reject table 0 for QR generation', () => {
      const result = validateQRTable(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject table "0" string for QR generation', () => {
      const result = validateQRTable('0');
      expect(result.isValid).toBe(false);
    });

    it('should reject table 0 for order placement', () => {
      const result = validateOrderTable(0);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Part 22 Item 5: Invalid negative table', () => {
    it('should reject negative table -1 for QR generation', () => {
      const result = validateQRTable(-1);
      expect(result.isValid).toBe(false);
    });

    it('should reject negative table -5 for QR generation', () => {
      const result = validateQRTable('-5');
      expect(result.isValid).toBe(false);
    });

    it('should reject negative table for order placement', () => {
      const result = validateOrderTable(-1);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Part 22 Item 6: Invalid decimal table', () => {
    it('should reject decimal table 5.5 for QR generation', () => {
      const result = validateQRTable(5.5);
      expect(result.isValid).toBe(false);
    });

    it('should reject decimal table "3.14" for QR generation', () => {
      const result = validateQRTable('3.14');
      expect(result.isValid).toBe(false);
    });

    it('should reject decimal table 1.01 for order placement', () => {
      const result = validateOrderTable(1.01);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Part 22 Item 7: Invalid non-numeric table', () => {
    it('should reject non-numeric string "abc"', () => {
      const result = validateQRTable('abc');
      expect(result.isValid).toBe(false);
    });

    it('should reject empty string ""', () => {
      const result = validateQRTable('');
      expect(result.isValid).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(validateQRTable(null).isValid).toBe(false);
      expect(validateQRTable(undefined).isValid).toBe(false);
    });

    it('should reject non-numeric string for order placement', () => {
      const result = validateOrderTable('table-two');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Part 22 Item 8: Correct APP URL configuration', () => {
    it('should use default http://localhost:3000 when no env is configured', () => {
      const base = getAppBaseUrl();
      expect(base).toBe('http://localhost:3000');
    });

    it('should use FRONTEND_URL environment variable when set', () => {
      process.env.FRONTEND_URL = 'https://creamtreat.food';
      const base = getAppBaseUrl();
      expect(base).toBe('https://creamtreat.food');
    });

    it('should trim trailing slashes from configured URL', () => {
      process.env.FRONTEND_URL = 'https://creamtreat.food///';
      const base = getAppBaseUrl();
      expect(base).toBe('https://creamtreat.food');

      const url = generateTableOrderUrl(5);
      expect(url).toBe('https://creamtreat.food/order?table=5');
    });

    it('should prefer explicit baseUrl parameter override', () => {
      process.env.FRONTEND_URL = 'https://env-url.com';
      const url = generateTableOrderUrl(10, 'http://192.168.1.15:3000');
      expect(url).toBe('http://192.168.1.15:3000/order?table=10');
    });
  });

  describe('Boundary and Constraint Testing (1–100 QR vs 1–999 Order)', () => {
    it('should accept upper boundary 100 for QR generation', () => {
      const result = validateQRTable(100);
      expect(result.isValid).toBe(true);
      expect(result.tableNumber).toBe(100);
    });

    it('should reject table 101 for QR generation (exceeds max 100)', () => {
      const result = validateQRTable(101);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain(`between ${MIN_QR_TABLE} and ${MAX_QR_TABLE}`);
    });

    it('should accept table 101 for order placement (within 1–999)', () => {
      const result = validateOrderTable(101);
      expect(result.isValid).toBe(true);
      expect(result.tableNumber).toBe(101);
    });

    it('should accept upper boundary 999 for order placement', () => {
      const result = validateOrderTable(999);
      expect(result.isValid).toBe(true);
      expect(result.tableNumber).toBe(999);
    });

    it('should reject table 1000 for order placement (exceeds max 999)', () => {
      const result = validateOrderTable(1000);
      expect(result.isValid).toBe(false);
    });
  });

  describe('Part 16 & 21: Security and Deterministic Reprinting', () => {
    it('should never contain sensitive tokens, keys, or customer credentials in QR URL', () => {
      const url = generateTableOrderUrl(7, 'https://creamtreat.com');
      expect(url).toBe('https://creamtreat.com/order?table=7');
      expect(url).not.toContain('jwt');
      expect(url).not.toContain('token');
      expect(url).not.toContain('secret');
      expect(url).not.toContain('auth');
      expect(url).not.toContain('user');
    });

    it('should deterministically produce identical URLs for same table across reprints', () => {
      const urlA = generateTableOrderUrl(42, 'https://creamtreat.com');
      const urlB = generateTableOrderUrl(42, 'https://creamtreat.com');
      expect(urlA).toBe(urlB);
    });
  });

  describe('Public HTTPS & Cellular 4G/5G Validation', () => {
    it('should identify public HTTPS URLs as public_https', () => {
      expect(isPublicHttpsUrl('https://order.creamtreat.com')).toBe(true);
      expect(isPublicHttpsUrl('https://cream-treat.vercel.app')).toBe(true);
      expect(classifyQRBaseUrl('https://order.creamtreat.com')).toBe('public_https');
    });

    it('should identify localhost and loopback addresses as localhost', () => {
      expect(isPublicHttpsUrl('http://localhost:3000')).toBe(false);
      expect(isPublicHttpsUrl('http://127.0.0.1:3000')).toBe(false);
      expect(classifyQRBaseUrl('http://localhost:3000')).toBe('localhost');
      expect(classifyQRBaseUrl('http://127.0.0.1:3000')).toBe('localhost');
      expect(isLocalhost('localhost')).toBe(true);
      expect(isLocalhost('127.0.0.1')).toBe(true);
    });

    it('should identify private LAN IP addresses as lan_ip', () => {
      expect(isPublicHttpsUrl('http://192.168.1.50:3000')).toBe(false);
      expect(classifyQRBaseUrl('http://192.168.1.50:3000')).toBe('lan_ip');
      expect(classifyQRBaseUrl('http://10.0.0.1:3000')).toBe('lan_ip');
      expect(classifyQRBaseUrl('http://172.16.0.1:3000')).toBe('lan_ip');
      expect(isLanAddress('192.168.1.50')).toBe(true);
      expect(isLanAddress('10.0.0.1')).toBe(true);
      expect(isLanAddress('172.16.0.1')).toBe(true);
    });

    it('should handle comma-separated FRONTEND_URL in getAppBaseUrl cleanly', () => {
      process.env.FRONTEND_URL = 'https://order.creamtreat.com,https://admin.creamtreat.com';
      expect(getAppBaseUrl()).toBe('https://order.creamtreat.com');
    });
  });
});
