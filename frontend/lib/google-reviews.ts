/**
 * Central utility and configuration for the Cream Treat Standalone Google Review QR Board.
 * 
 * Defines standard print dimensions (4x6, A6, 5x5 sticker), validation,
 * and design palette values.
 */

export const DEFAULT_GOOGLE_REVIEW_URL =
  process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ||
  'https://search.google.com/local/writereview?placeid=ChIJCreamTreatCafe';

export interface ReviewBoardLayout {
  id: '4x6' | 'a6' | '5x5';
  title: string;
  badge: string;
  description: string;
  widthPx: number; // 300 DPI
  heightPx: number; // 300 DPI
  widthPt: number; // 72 DPI (PDF points)
  heightPt: number; // 72 DPI (PDF points)
  cssPageSize: string;
  recommendedStock: string;
  bestFor: string;
}

export const REVIEW_LAYOUTS: Record<'4x6' | 'a6' | '5x5', ReviewBoardLayout> = {
  '4x6': {
    id: '4x6',
    title: '4 × 6 Inches',
    badge: 'Popular Tabletop',
    description: 'Standard 4" × 6" portrait standee format for clear acrylic L-frames or wood bases.',
    widthPx: 1200,
    heightPx: 1800,
    widthPt: 288,
    heightPt: 432,
    cssPageSize: '4in 6in',
    recommendedStock: '300–350 GSM Art Board or Acrylic Insert',
    bestFor: 'Café dining tables, booths, and dessert display counters',
  },
  'a6': {
    id: 'a6',
    title: 'A6 Postcard',
    badge: 'International Standard',
    description: '105 mm × 148 mm standard international format for postcard stands & takeaway trays.',
    widthPx: 1240,
    heightPx: 1748,
    widthPt: 297.64,
    heightPt: 419.53,
    cssPageSize: '105mm 148mm',
    recommendedStock: '350 GSM Matte Cardstock with Soft-Touch UV',
    bestFor: 'Countertop payment points, billing folders, and takeaway trays',
  },
  '5x5': {
    id: '5x5',
    title: '5 × 5 Inches Square',
    badge: 'Square Sticker / Decal',
    description: '1:1 ratio square layout ideal for durable vinyl stickers, table decals, and packaging.',
    widthPx: 1500,
    heightPx: 1500,
    widthPt: 360,
    heightPt: 360,
    cssPageSize: '5in 5in',
    recommendedStock: 'Waterproof Vinyl Decal with Matte Lamination',
    bestFor: 'Table corners, entrance glass doors, delivery bags, and coasters',
  },
};

/**
 * Validates whether an entered string is a plausible Google Review URL.
 * Accepts:
 * - https://g.page/r/.../review
 * - https://search.google.com/local/writereview?placeid=...
 * - https://maps.app.goo.gl/...
 * - Any valid HTTPS/HTTP URL
 */
export function isValidReviewUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    return false;
  }

  try {
    const url = new URL(rawUrl.trim());
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Normalizes a Google Review URL, trimming whitespace and trailing slashes.
 */
export function normalizeReviewUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return DEFAULT_GOOGLE_REVIEW_URL;
  }
  const trimmed = rawUrl.trim();
  return isValidReviewUrl(trimmed) ? trimmed : DEFAULT_GOOGLE_REVIEW_URL;
}
