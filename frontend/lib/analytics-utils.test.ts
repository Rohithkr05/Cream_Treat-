import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCompactRupees,
  formatIstDateTime,
  formatRupees,
  getKolkataTodayIso,
  getPresetDateRange,
  isValidIsoCalendarDate,
  validateCustomDateRange,
} from './analytics-utils.ts';

describe('Frontend Analytics Utilities', () => {
  it('computes today in Asia/Kolkata accurately across UTC midnight boundaries', () => {
    // 2026-11-10T18:45:00Z === 2026-11-11 00:15 IST
    const now = new Date('2026-11-10T18:45:00.000Z');
    assert.equal(getKolkataTodayIso(now), '2026-11-11');
  });

  it('builds preset date ranges cleanly in Asia/Kolkata', () => {
    const refNow = new Date('2026-11-11T10:00:00.000Z'); // 15:30 IST
    assert.deepEqual(getPresetDateRange('today', refNow), {
      startDate: '2026-11-11',
      endDate: '2026-11-11',
    });
    assert.deepEqual(getPresetDateRange('yesterday', refNow), {
      startDate: '2026-11-10',
      endDate: '2026-11-10',
    });
    assert.deepEqual(getPresetDateRange('last7days', refNow), {
      startDate: '2026-11-05',
      endDate: '2026-11-11',
    });
    assert.deepEqual(getPresetDateRange('last30days', refNow), {
      startDate: '2026-10-13',
      endDate: '2026-11-11',
    });
    assert.deepEqual(getPresetDateRange('thisMonth', refNow), {
      startDate: '2026-11-01',
      endDate: '2026-11-11',
    });
  });

  it('validates custom calendar dates and rejects reversed or impossible ranges', () => {
    assert.equal(isValidIsoCalendarDate('2026-02-29'), false);
    assert.equal(isValidIsoCalendarDate('2024-02-29'), true);
    assert.equal(
      validateCustomDateRange('2026-11-01', '2026-11-11').valid,
      true,
    );
    assert.equal(
      validateCustomDateRange('2026-11-12', '2026-11-11').valid,
      false,
    );
    assert.equal(validateCustomDateRange('', '2026-11-11').valid, false);
  });

  it('formats paise into INR currency and compact axis labels', () => {
    assert.equal(formatRupees(12000), '₹120');
    assert.equal(formatRupees(12050), '₹120.50');
    assert.equal(formatCompactRupees(45000), '₹450');
    assert.equal(formatCompactRupees(250000), '₹2.5k');
  });

  it('formats ISO timestamps in Asia/Kolkata', () => {
    const formatted = formatIstDateTime('2026-11-10T18:45:00.000Z');
    assert.ok(formatted.includes('11'));
    assert.ok(formatted.includes('2026'));
  });
});

