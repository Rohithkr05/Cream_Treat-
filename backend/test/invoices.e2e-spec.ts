import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { InvoicesService } from '../src/invoices/invoices.service.js';
import { GstSettingsService } from '../src/invoices/gst-settings.service.js';
import { InvoicePdfService } from '../src/invoices/invoice-pdf.service.js';

describe('Admin Invoices & GST Management (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let customerToken: string;

  const sampleOrderId = '670d00000000000000000999';

  const mockSettings = {
    shopName: 'Cream Treat',
    legalName: 'Cream Treat Cafe',
    gstin: '29AAAAA0000A1Z5',
    pan: 'AAAAA0000A',
    phone: '9876543210',
    email: 'admin@creamtreat.local',
    address: {
      line1: '123 Baker Street',
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
    termsAndConditions: ['Thank you for visiting!'],
  };

  const sampleInvoice = {
    _id: '670d00000000000000000888',
    invoiceNumber: 'CT/2026-27/0001',
    sequence: 1,
    orderId: sampleOrderId,
    orderNumber: '#001',
    orderDate: '2026-11-13',
    tableNumber: 2,
    shopInfo: mockSettings,
    customerInfo: { name: 'Alice' },
    supplyType: 'INTRA_STATE',
    isTaxInclusive: true,
    defaultHsnSac: '996331',
    items: [
      {
        nameSnapshot: 'Hazelnut Bubble Milk',
        quantity: 1,
        unitPrice: 19000,
        taxableAmount: 18095,
        gstRate: 5,
        cgstRate: 2.5,
        cgstAmount: 452,
        sgstRate: 2.5,
        sgstAmount: 453,
        totalAmount: 19000,
      },
    ],
    taxableAmount: 18095,
    cgstTotal: 452,
    sgstTotal: 453,
    igstTotal: 0,
    totalGst: 905,
    rounding: 0,
    grandTotal: 19000,
    paymentStatus: 'PAID',
    paymentMode: 'UPI',
    status: 'ISSUED',
    issuedAt: new Date().toISOString(),
  };

  const mockInvoicesService = {
    findAll: vi.fn().mockResolvedValue({
      invoices: [sampleInvoice],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    }),
    findById: vi.fn().mockResolvedValue(sampleInvoice),
    findByOrderId: vi.fn().mockResolvedValue(sampleInvoice),
    previewInvoice: vi.fn().mockResolvedValue({
      previewNumber: 'CT/2026-27/DRAFT',
      ...sampleInvoice,
    }),
    generateInvoice: vi.fn().mockResolvedValue(sampleInvoice),
  };

  const mockGstSettingsService = {
    getSettings: vi.fn().mockResolvedValue(mockSettings),
    updateSettings: vi.fn().mockResolvedValue(mockSettings),
  };

  const mockPdfService = {
    generateInvoicePdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 Mock Stream')),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InvoicesService)
      .useValue(mockInvoicesService)
      .overrideProvider(GstSettingsService)
      .useValue(mockGstSettingsService)
      .overrideProvider(InvoicePdfService)
      .useValue(mockPdfService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();

    const jwtService = app.get(JwtService);
    adminToken = jwtService.sign({
      sub: 'admin123',
      email: 'admin@creamtreat.local',
      role: 'ADMIN',
    });

    customerToken = jwtService.sign({
      sub: 'cust123',
      email: 'customer@creamtreat.local',
      role: 'CUSTOMER',
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Security & Access Control', () => {
    it('1. should reject unauthenticated request to /admin/invoices with 401', async () => {
      await request(app.getHttpServer()).get('/admin/invoices').expect(401);
    });

    it('2. should reject non-admin user request to /admin/invoices with 403', async () => {
      await request(app.getHttpServer())
        .get('/admin/invoices')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('3. should allow authenticated administrator to access /admin/invoices', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.invoices).toBeDefined();
      expect(res.body.invoices.length).toBe(1);
    });
  });

  describe('GST Settings & Invoice Generation', () => {
    it('4. should retrieve active GST settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/invoices/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.shopName).toBe('Cream Treat');
      expect(res.body.gstin).toBe('29AAAAA0000A1Z5');
      expect(res.body.isConfigured).toBe(true);
    });

    it('5. should generate a tax invoice for valid order', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/invoices')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ orderId: sampleOrderId, customerName: 'Alice' })
        .expect(201);

      expect(res.body.invoiceNumber).toBe('CT/2026-27/0001');
      expect(res.body.grandTotal).toBe(19000);
    });

    it('6. should stream generated PDF with application/pdf Content-Type', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/invoices/670d00000000000000000888/pdf')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('Invoice-CT-2026-27-0001.pdf');
    });
  });
});

