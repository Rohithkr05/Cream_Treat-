import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTableOrderUrl,
  getFrontendAppUrl,
  validateQRTableCount,
  validateCustomerTableNumber,
  parseTableUrlParam,
  isPublicHttpsUrl,
  classifyQRBaseUrl,
  isLocalhost,
  isLanAddress,
  MIN_QR_TABLE,
  MAX_QR_TABLE,
  MIN_ORDER_TABLE,
  MAX_ORDER_TABLE,
} from './qr.ts';

describe('Frontend QR & Table URL Validation (Phase 13)', () => {
  it('1. QR URL generation for table 1', () => {
    const url = buildTableOrderUrl(1, 'http://localhost:3000');
    assert.equal(url, 'http://localhost:3000/order?table=1');
  });

  it('2. QR URL generation for table 5', () => {
    const url = buildTableOrderUrl(5, 'http://localhost:3000');
    assert.equal(url, 'http://localhost:3000/order?table=5');
  });

  it('3. QR URL generation for table 100', () => {
    const url = buildTableOrderUrl(100, 'http://localhost:3000');
    assert.equal(url, 'http://localhost:3000/order?table=100');
  });

  it('4. Invalid table 0', () => {
    const qrRes = validateQRTableCount(0);
    assert.equal(qrRes.isValid, false);

    const custRes = validateCustomerTableNumber(0);
    assert.equal(custRes.isValid, false);

    const parsed = parseTableUrlParam('0');
    assert.equal(parsed.status, 'INVALID');
  });

  it('5. Invalid negative table', () => {
    const qrRes = validateQRTableCount(-5);
    assert.equal(qrRes.isValid, false);

    const custRes = validateCustomerTableNumber('-1');
    assert.equal(custRes.isValid, false);

    const parsed = parseTableUrlParam('-1');
    assert.equal(parsed.status, 'INVALID');
  });

  it('6. Invalid decimal table', () => {
    const qrRes = validateQRTableCount(5.5);
    assert.equal(qrRes.isValid, false);

    const custRes = validateCustomerTableNumber('3.14');
    assert.equal(custRes.isValid, false);

    const parsed = parseTableUrlParam('5.5');
    assert.equal(parsed.status, 'INVALID');
  });

  it('7. Invalid non-numeric table', () => {
    const qrRes = validateQRTableCount('abc');
    assert.equal(qrRes.isValid, false);

    const custRes = validateCustomerTableNumber('table-5');
    assert.equal(custRes.isValid, false);

    const parsed = parseTableUrlParam('abc');
    assert.equal(parsed.status, 'INVALID');
  });

  it('8. Correct APP URL configuration', () => {
    const custom = getFrontendAppUrl('https://my-restaurant.com/');
    assert.equal(custom, 'https://my-restaurant.com');

    const url = buildTableOrderUrl(8, 'https://creamtreat.example.com///');
    assert.equal(url, 'https://creamtreat.example.com/order?table=8');
  });

  it('9. parseTableUrlParam detects valid table 5', () => {
    const parsed = parseTableUrlParam('5');
    assert.equal(parsed.status, 'VALID');
    if (parsed.status === 'VALID') {
      assert.equal(parsed.tableNumber, 5);
    }
  });

  it('10. parseTableUrlParam detects missing table parameter', () => {
    const parsedNull = parseTableUrlParam(null);
    assert.equal(parsedNull.status, 'MISSING');

    const parsedEmpty = parseTableUrlParam('');
    assert.equal(parsedEmpty.status, 'MISSING');
  });

  it('11. QR Table boundary validation (1–100)', () => {
    assert.equal(validateQRTableCount(1).isValid, true);
    assert.equal(validateQRTableCount(100).isValid, true);
    assert.equal(validateQRTableCount(101).isValid, false);
  });

  it('12. Customer Table boundary validation (1–999)', () => {
    assert.equal(validateCustomerTableNumber(1).isValid, true);
    assert.equal(validateCustomerTableNumber(100).isValid, true);
    assert.equal(validateCustomerTableNumber(500).isValid, true);
    assert.equal(validateCustomerTableNumber(999).isValid, true);
    assert.equal(validateCustomerTableNumber(1000).isValid, false);
  });

  it('13. Public HTTPS & Cellular 4G/5G URL Classification', () => {
    // Valid public HTTPS URLs
    assert.equal(isPublicHttpsUrl('https://order.creamtreat.com'), true);
    assert.equal(isPublicHttpsUrl('https://cream-treat.vercel.app'), true);
    assert.equal(classifyQRBaseUrl('https://order.creamtreat.com'), 'public_https');
    assert.equal(classifyQRBaseUrl('https://my-cafe.in'), 'public_https');

    // Localhost / Loopback
    assert.equal(isPublicHttpsUrl('http://localhost:3000'), false);
    assert.equal(isPublicHttpsUrl('https://localhost:3000'), false);
    assert.equal(classifyQRBaseUrl('http://localhost:3000'), 'localhost');
    assert.equal(classifyQRBaseUrl('http://127.0.0.1:3000'), 'localhost');
    assert.equal(isLocalhost('localhost'), true);
    assert.equal(isLocalhost('127.0.0.1'), true);

    // Private LAN IPs (Shop Wi-Fi only)
    assert.equal(isPublicHttpsUrl('http://192.168.1.100:3000'), false);
    assert.equal(classifyQRBaseUrl('http://192.168.1.100:3000'), 'lan_ip');
    assert.equal(classifyQRBaseUrl('http://10.0.0.5:3000'), 'lan_ip');
    assert.equal(classifyQRBaseUrl('http://172.20.10.2:3000'), 'lan_ip');
    assert.equal(isLanAddress('192.168.1.100'), true);
    assert.equal(isLanAddress('10.0.0.5'), true);
    assert.equal(isLanAddress('172.20.10.2'), true);

    // Insecure HTTP or invalid
    assert.equal(classifyQRBaseUrl('http://insecure-domain.com'), 'invalid');
    assert.equal(classifyQRBaseUrl('not-a-url'), 'invalid');
    assert.equal(classifyQRBaseUrl(''), 'invalid');
  });
});
