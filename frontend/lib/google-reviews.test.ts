import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidReviewUrl,
  normalizeReviewUrl,
  REVIEW_LAYOUTS,
  DEFAULT_GOOGLE_REVIEW_URL,
} from './google-reviews.ts';

describe('Google Reviews QR Board Configuration & Validation', () => {
  it('1. validates valid Google Review URLs', () => {
    assert.equal(
      isValidReviewUrl('https://g.page/r/CbXxCreamTreat/review'),
      true,
    );
    assert.equal(
      isValidReviewUrl(
        'https://search.google.com/local/writereview?placeid=ChIJCreamTreatCafe',
      ),
      true,
    );
    assert.equal(isValidReviewUrl('https://maps.app.goo.gl/creamTreatReview'), true);
  });

  it('2. rejects empty, malformed, or non-URL inputs', () => {
    assert.equal(isValidReviewUrl(''), false);
    assert.equal(isValidReviewUrl('   '), false);
    assert.equal(isValidReviewUrl('not-a-url'), false);
    assert.equal(isValidReviewUrl('javascript:alert(1)'), false);
  });

  it('3. normalizes URLs cleanly', () => {
    assert.equal(
      normalizeReviewUrl('  https://g.page/r/test/review  '),
      'https://g.page/r/test/review',
    );
    assert.equal(normalizeReviewUrl('invalid'), DEFAULT_GOOGLE_REVIEW_URL);
  });

  it('4. provides complete print layout dimensions', () => {
    const layout4x6 = REVIEW_LAYOUTS['4x6'];
    assert.equal(layout4x6.widthPx, 1200);
    assert.equal(layout4x6.heightPx, 1800);
    assert.equal(layout4x6.widthPt, 288);
    assert.equal(layout4x6.heightPt, 432);

    const layoutA6 = REVIEW_LAYOUTS['a6'];
    assert.equal(layoutA6.widthPx, 1240);
    assert.equal(layoutA6.heightPx, 1748);

    const layout5x5 = REVIEW_LAYOUTS['5x5'];
    assert.equal(layout5x5.widthPx, 1500);
    assert.equal(layout5x5.heightPx, 1500);
    assert.equal(layout5x5.widthPt, 360);
    assert.equal(layout5x5.heightPt, 360);
  });
});
