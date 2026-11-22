import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InvoicesService } from './invoices.service.js';
import { GstSettingsService } from './gst-settings.service.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { InvoiceStatus, PaymentMode, PaymentStatus, SupplyType } from './schemas/invoice.schema.js';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let mockInvoiceModel: any;
  let mockInvoiceCounterModel: any;
  let mockOrderModel: any;
  let mockGstSettingsService: any;
  let pdfService: InvoicePdfService;

  const validOrderId = new Types.ObjectId().toHexString();

  const mockOrder: any = {
    _id: new Types.ObjectId(validOrderId),
    orderNumber: '#001',
    orderDate: '2026-11-13',
    tableNumber: 3,
    subtotal: 20000, // ₹200.00
    total: 20000,
    items: [
      {
        foodItemId: new Types.ObjectId(),
        nameSnapshot: 'Classic Cold Coffee',
        priceSnapshot: 11000, // ₹110
        quantity: 1,
        itemTotal: 11000,
      },
      {
        foodItemId: new Types.ObjectId(),
        nameSnapshot: 'Strawberry Milkshake',
        priceSnapshot: 9000, // ₹90
        quantity: 1,
        itemTotal: 9000,
      },
    ],
  };

  const configuredSettings: any = {
    shopName: 'Cream Treat',
    legalName: 'Cream Treat Cafe LLP',
    gstin: '29AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    phone: '9876543210',
    email: 'contact@creamtreat.local',
    address: {
      line1: '123 Dessert Street',
      city: 'Bengaluru',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '560001',
    },
    defaultHsnSac: '996331',
    gstRate: 5,
    isTaxInclusive: true,
    invoicePrefix: 'CT',
    financialYear: '2026-27',
    isConfigured: true,
    termsAndConditions: ['Goods once sold cannot be returned.'],
  };

  const unconfiguredSettings: any = {
    ...configuredSettings,
    gstin: '',
    address: { stateCode: '' },
    defaultHsnSac: '',
    gstRate: 0,
    isConfigured: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockInvoiceModel = {
      findOne: vi.fn(),
      findById: vi.fn(),
      find: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      exec: vi.fn(),
      countDocuments: vi.fn().mockReturnThis(),
      create: vi.fn().mockImplementation((data) => Promise.resolve({ _id: new Types.ObjectId(), ...data })),
    };

    mockInvoiceCounterModel = {
      findOneAndUpdate: vi.fn(),
    };

    mockOrderModel = {
      findById: vi.fn(),
    };

    mockGstSettingsService = {
      getSettings: vi.fn(),
      checkIsConfigured: vi.fn(),
    };

    pdfService = new InvoicePdfService();
    service = new InvoicesService(
      mockInvoiceModel,
      mockInvoiceCounterModel,
      mockOrderModel,
      mockGstSettingsService,
    );
  });

  describe('1. GST Configuration Enforcement', () => {
    it('should throw BadRequestException when GST configuration is incomplete', async () => {
      mockGstSettingsService.getSettings.mockResolvedValue(unconfiguredSettings);

      await expect(
        service.generateInvoice({ orderId: validOrderId }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Order Existence & Validation', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockGstSettingsService.getSettings.mockResolvedValue(configuredSettings);
      mockOrderModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });

      await expect(
        service.generateInvoice({ orderId: validOrderId }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject invalid MongoDB ObjectId strings', async () => {
      await expect(
        service.generateInvoice({ orderId: 'invalid-id' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Duplicate Invoice Prevention', () => {
    it('should prevent generating a duplicate invoice for the same order', async () => {
      mockGstSettingsService.getSettings.mockResolvedValue(configuredSettings);
      mockOrderModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockOrder) });
      mockInvoiceModel.findOne.mockReturnValue({
        exec: vi.fn().mockResolvedValue({
          _id: new Types.ObjectId(),
          invoiceNumber: 'CT/2026-27/0001',
          status: InvoiceStatus.ISSUED,
        }),
      });

      await expect(
        service.generateInvoice({ orderId: validOrderId }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('4. Sequential Numbering & Concurrency Safety', () => {
    it('should generate sequential invoice number atomically via InvoiceCounter', async () => {
      mockGstSettingsService.getSettings.mockResolvedValue(configuredSettings);
      mockOrderModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockOrder) });
      mockInvoiceModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      mockInvoiceCounterModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ sequence: 42 }),
      });

      const invoice = await service.generateInvoice({ orderId: validOrderId });

      expect(mockInvoiceCounterModel.findOneAndUpdate).toHaveBeenCalledWith(
        { key: 'INVOICE-CT-2026-27' },
        { $inc: { sequence: 1 } },
        { returnDocument: 'after', upsert: true },
      );
      expect(invoice.invoiceNumber).toBe('CT/2026-27/0042');
      expect(invoice.sequence).toBe(42);
    });
  });

  describe('5. Tax-Inclusive Calculation (Intra-State: CGST + SGST)', () => {
    it('should compute accurate CGST and SGST using integer paise without rounding loss', () => {
      // 5% GST tax-inclusive on ₹105 (10500 paise)
      // Taxable = 10500 * 10000 / 10500 = 10000 paise (₹100)
      // Total tax = 500 paise (₹5) -> CGST 250 paise (₹2.50), SGST 250 paise (₹2.50)
      const singleOrder: any = {
        items: [
          {
            foodItemId: new Types.ObjectId(),
            nameSnapshot: 'Brownie',
            priceSnapshot: 10500,
            quantity: 1,
            itemTotal: 10500,
          },
        ],
      };

      const result = service.calculateInvoiceTotals(
        singleOrder,
        5,
        true,
        '996331',
        SupplyType.INTRA_STATE,
      );

      expect(result.taxableAmount).toBe(10000);
      expect(result.cgstTotal).toBe(250);
      expect(result.sgstTotal).toBe(250);
      expect(result.igstTotal).toBe(0);
      expect(result.totalGst).toBe(500);
      expect(result.grandTotal).toBe(10500);
      expect(result.taxableAmount + result.totalGst).toBe(result.grandTotal);
    });
  });

  describe('6. Tax-Exclusive Calculation (Intra-State: CGST + SGST)', () => {
    it('should calculate GST added on top of base menu prices', () => {
      // 5% GST tax-exclusive on ₹100 base (10000 paise)
      // CGST 2.5% = 250 paise, SGST 2.5% = 250 paise
      // Grand Total = 10500 paise
      const singleOrder: any = {
        items: [
          {
            foodItemId: new Types.ObjectId(),
            nameSnapshot: 'Burger',
            priceSnapshot: 10000,
            quantity: 1,
            itemTotal: 10000,
          },
        ],
      };

      const result = service.calculateInvoiceTotals(
        singleOrder,
        5,
        false,
        '996331',
        SupplyType.INTRA_STATE,
      );

      expect(result.taxableAmount).toBe(10000);
      expect(result.cgstTotal).toBe(250);
      expect(result.sgstTotal).toBe(250);
      expect(result.igstTotal).toBe(0);
      expect(result.totalGst).toBe(500);
      expect(result.grandTotal).toBe(10500);
    });
  });

  describe('7. Inter-State Supply (IGST)', () => {
    it('should apply 100% IGST when customer state code differs from shop state code', () => {
      const singleOrder: any = {
        items: [
          {
            foodItemId: new Types.ObjectId(),
            nameSnapshot: 'Hazelnut Milk',
            priceSnapshot: 20000,
            quantity: 1,
            itemTotal: 20000,
          },
        ],
      };

      const result = service.calculateInvoiceTotals(
        singleOrder,
        5,
        true,
        '996331',
        SupplyType.INTER_STATE,
      );

      expect(result.cgstTotal).toBe(0);
      expect(result.sgstTotal).toBe(0);
      expect(result.igstTotal).toBe(result.totalGst);
      expect(result.grandTotal).toBe(20000);
    });
  });

  describe('8. Historical Price Preservation', () => {
    it('should use priceSnapshot from order rather than current prices', async () => {
      mockGstSettingsService.getSettings.mockResolvedValue(configuredSettings);
      mockOrderModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockOrder) });
      mockInvoiceModel.findOne.mockReturnValue({ exec: vi.fn().mockResolvedValue(null) });
      mockInvoiceCounterModel.findOneAndUpdate.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ sequence: 1 }),
      });

      const invoice = await service.generateInvoice({ orderId: validOrderId });

      expect(invoice.items[0].unitPrice).toBe(11000);
      expect(invoice.items[1].unitPrice).toBe(9000);
      expect(invoice.items[0].nameSnapshot).toBe('Classic Cold Coffee');
    });
  });

  describe('9. Preview Invoice', () => {
    it('should generate draft preview without modifying sequence or creating document', async () => {
      mockGstSettingsService.getSettings.mockResolvedValue(configuredSettings);
      mockOrderModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(mockOrder) });

      const preview = await service.previewInvoice({ orderId: validOrderId });

      expect(preview.previewNumber).toContain('DRAFT');
      expect(mockInvoiceModel.create).not.toHaveBeenCalled();
      expect(mockInvoiceCounterModel.findOneAndUpdate).not.toHaveBeenCalled();
    });
  });

  describe('10. PDF Generation', () => {
    it('should format paise into readable currency string and convert to words', () => {
      expect(pdfService.formatPaise(10500)).toBe('₹105.00');
      expect(pdfService.formatPaise(150000)).toBe('₹1,500.00');

      expect(pdfService.amountToWords(10500)).toBe('One Hundred and Five Rupees Only');
      expect(pdfService.amountToWords(25050)).toBe('Two Hundred and Fifty Rupees and Fifty Paise Only');
    });

    it('should generate non-empty binary PDF buffer for valid invoice', async () => {
      const dummyInvoice: any = {
        invoiceNumber: 'CT/2026-27/0001',
        sequence: 1,
        orderNumber: '#001',
        orderDate: '2026-11-13',
        tableNumber: 1,
        shopInfo: configuredSettings,
        customerInfo: { name: 'John Doe', phone: '9999999999' },
        supplyType: SupplyType.INTRA_STATE,
        isTaxInclusive: true,
        defaultHsnSac: '996331',
        items: [
          {
            foodItemId: new Types.ObjectId(),
            nameSnapshot: 'Classic Cold Coffee',
            quantity: 1,
            unitPrice: 11000,
            taxableAmount: 10476,
            hsnSacCode: '996331',
            gstRate: 5,
            cgstRate: 2.5,
            cgstAmount: 262,
            sgstRate: 2.5,
            sgstAmount: 262,
            igstRate: 0,
            igstAmount: 0,
            totalAmount: 11000,
          },
        ],
        taxableAmount: 10476,
        cgstTotal: 262,
        sgstTotal: 262,
        igstTotal: 0,
        totalGst: 524,
        rounding: 0,
        grandTotal: 11000,
        paymentStatus: PaymentStatus.PAID,
        paymentMode: PaymentMode.UPI,
        status: InvoiceStatus.ISSUED,
        issuedAt: new Date(),
        termsAndConditions: ['Thank you!'],
      };

      const pdfBuffer = await pdfService.generateInvoicePdf(dummyInvoice);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(1000);
      expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
    });
  });
});

