import type { DateFilterPreset } from '../types/analytics';

export const BUSINESS_TIMEZONE = 'Asia/Kolkata';
const MS_PER_DAY = 86_400_000;
const MAX_RANGE_DAYS = 1095;

export function getKolkataTodayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isValidIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [yStr, mStr, dStr] = value.split('-');
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    !Number.isNaN(probe.getTime()) &&
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

export function shiftIsoDate(dateStr: string, offsetDays: number): string {
  const [yStr, mStr, dStr] = dateStr.split('-');
  const d = new Date(
    Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr) + offsetDays),
  );
  return d.toISOString().slice(0, 10);
}

export function getPresetDateRange(
  preset: Exclude<DateFilterPreset, 'custom'>,
  now: Date = new Date(),
): { startDate: string; endDate: string } {
  const today = getKolkataTodayIso(now);

  switch (preset) {
    case 'today':
      return { startDate: today, endDate: today };
    case 'yesterday': {
      const yesterday = shiftIsoDate(today, -1);
      return { startDate: yesterday, endDate: yesterday };
    }
    case 'last7days':
      return { startDate: shiftIsoDate(today, -6), endDate: today };
    case 'last30days':
      return { startDate: shiftIsoDate(today, -29), endDate: today };
    case 'thisMonth':
      return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  }
}

export function validateCustomDateRange(
  startDate: string,
  endDate: string,
): { valid: boolean; error?: string } {
  if (!startDate || !endDate) {
    return {
      valid: false,
      error: 'Please select both a start date and an end date.',
    };
  }

  if (!isValidIsoCalendarDate(startDate) || !isValidIsoCalendarDate(endDate)) {
    return {
      valid: false,
      error: 'Please enter valid dates in YYYY-MM-DD format.',
    };
  }

  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);

  if (startMs > endMs) {
    return {
      valid: false,
      error: 'Start date cannot be later than end date.',
    };
  }

  const days = Math.round((endMs - startMs) / MS_PER_DAY) + 1;
  if (days > MAX_RANGE_DAYS) {
    return {
      valid: false,
      error: `Custom range cannot exceed ${MAX_RANGE_DAYS} days.`,
    };
  }

  return { valid: true };
}

export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function formatCompactRupees(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 100_000) {
    return `₹${(rupees / 100_000).toFixed(1)}L`;
  }
  if (rupees >= 1_000) {
    return `₹${(rupees / 1_000).toFixed(rupees >= 10_000 ? 0 : 1)}k`;
  }
  return `₹${Math.round(rupees)}`;
}

export function formatIstDateTime(isoString?: string): string {
  if (!isoString) return '—';
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(dt);
}

export function formatIstDateLabel(isoDate: string): string {
  if (!isValidIsoCalendarDate(isoDate)) return isoDate;
  const dt = new Date(`${isoDate}T00:00:00.000+05:30`);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(dt);
}

