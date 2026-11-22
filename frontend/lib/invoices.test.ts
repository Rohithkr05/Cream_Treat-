import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Frontend GST Billing & Invoice Calculation Logic', () => {
  // Helper implementing the exact mathematical calculation used by the app
  function calculateGst(
    unitPricePaise: number,
    quantity: number,
    gstRate: number,
    isTaxInclusive: boolean,
    isInterState: boolean,
  ) {
    const itemGross = unitPricePaise * quantity;
    let taxableAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;
    let totalAmount = 0;

    if (isTaxInclusive) {
      // Base = (Gross * 10000) / (10000 + Rate * 100)
      taxableAmount = Math.round((itemGross * 10000) / (10000 + Math.round(gstRate * 100)));
      const itemTax = itemGross - taxableAmount;

      if (!isInterState) {
        cgstAmount = Math.floor(itemTax / 2);
        sgstAmount = itemTax - cgstAmount;
      } else {
        igstAmount = itemTax;
      }
      totalAmount = itemGross;
    } else {
      taxableAmount = itemGross;
      if (!isInterState) {
        const cgstRate = gstRate / 2;
        const sgstRate = gstRate / 2;
        cgstAmount = Math.round(taxableAmount * (cgstRate / 100));
        sgstAmount = Math.round(taxableAmount * (sgstRate / 100));
        totalAmount = taxableAmount + cgstAmount + sgstAmount;
      } else {
        igstAmount = Math.round(taxableAmount * (gstRate / 100));
        totalAmount = taxableAmount + igstAmount;
      }
    }

    return {
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalGst: cgstAmount + sgstAmount + igstAmount,
      totalAmount,
    };
  }

  it('1. computes exact integer paise for 5% tax-inclusive intra-state dining', () => {
    // 2 x ₹110 items = ₹220 (22000 paise)
    // Taxable = 22000 * 10000 / 10500 = 20952 paise (₹209.52)
    // Total Tax = 1048 paise (₹10.48)
    // CGST (2.5%) = 524 paise, SGST (2.5%) = 524 paise
    const res = calculateGst(11000, 2, 5, true, false);

    assert.equal(res.taxableAmount, 20952);
    assert.equal(res.cgstAmount, 524);
    assert.equal(res.sgstAmount, 524);
    assert.equal(res.igstAmount, 0);
    assert.equal(res.totalGst, 1048);
    assert.equal(res.totalAmount, 22000);
    assert.equal(res.taxableAmount + res.totalGst, res.totalAmount);
  });

  it('2. computes exact integer paise for 5% tax-inclusive inter-state dining (IGST)', () => {
    // ₹105 (10500 paise)
    // Taxable = 10000 paise
    // IGST = 500 paise
    const res = calculateGst(10500, 1, 5, true, true);

    assert.equal(res.taxableAmount, 10000);
    assert.equal(res.cgstAmount, 0);
    assert.equal(res.sgstAmount, 0);
    assert.equal(res.igstAmount, 500);
    assert.equal(res.totalGst, 500);
    assert.equal(res.totalAmount, 10500);
  });

  it('3. computes exact integer paise for 5% tax-exclusive supply', () => {
    // Base ₹1000 (100000 paise), 5% tax added on top
    // CGST 2.5% = 2500 paise, SGST 2.5% = 2500 paise
    // Total = 105000 paise
    const res = calculateGst(100000, 1, 5, false, false);

    assert.equal(res.taxableAmount, 100000);
    assert.equal(res.cgstAmount, 2500);
    assert.equal(res.sgstAmount, 2500);
    assert.equal(res.totalGst, 5000);
    assert.equal(res.totalAmount, 105000);
  });

  it('4. never loses odd paise due to integer balancing', () => {
    // ₹101 (10100 paise) with 5% inclusive
    // Taxable = round(10100 * 10000 / 10500) = 9619 paise
    // Tax = 481 paise
    // CGST = floor(481 / 2) = 240 paise
    // SGST = 481 - 240 = 241 paise
    // Total = 9619 + 240 + 241 = 10100 paise (exact zero difference!)
    const res = calculateGst(10100, 1, 5, true, false);

    assert.equal(res.taxableAmount, 9619);
    assert.equal(res.cgstAmount, 240);
    assert.equal(res.sgstAmount, 241);
    assert.equal(res.totalGst, 481);
    assert.equal(res.totalAmount, 10100);
    assert.equal(res.taxableAmount + res.cgstAmount + res.sgstAmount, res.totalAmount);
  });
});

