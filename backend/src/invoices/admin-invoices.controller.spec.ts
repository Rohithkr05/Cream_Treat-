import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminInvoicesController } from './admin-invoices.controller.js';
import { InvoicesService } from './invoices.service.js';
import { GstSettingsService } from './gst-settings.service.js';
import { InvoicePdfService } from './invoice-pdf.service.js';

describe('AdminInvoicesController', () => {
  let controller: AdminInvoicesController;

  const mockInvoicesService = {
    previewInvoice: vi.fn(),
    findByOrderId: vi.fn(),
    findAll: vi.fn(),
    generateInvoice: vi.fn(),
    findById: vi.fn(),
  };

  const mockGstSettingsService = {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  };

  const mockInvoicePdfService = {
    generateInvoicePdf: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminInvoicesController],
      providers: [
        { provide: InvoicesService, useValue: mockInvoicesService },
        { provide: GstSettingsService, useValue: mockGstSettingsService },
        { provide: InvoicePdfService, useValue: mockInvoicePdfService },
      ],
    }).compile();

    controller = module.get<AdminInvoicesController>(AdminInvoicesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /admin/invoices/settings', () => {
    it('should retrieve active GST settings', async () => {
      mockGstSettingsService.getSettings.mockResolvedValue({ isConfigured: false });
      const res = await controller.getSettings();
      expect(mockGstSettingsService.getSettings).toHaveBeenCalled();
      expect(res.isConfigured).toBe(false);
    });
  });

  describe('POST /admin/invoices', () => {
    it('should delegate generation to InvoicesService with admin ID', async () => {
      const dto = { orderId: '507f1f77bcf86cd799439011' };
      const req: any = { user: { id: 'admin123', role: 'ADMIN' } };
      mockInvoicesService.generateInvoice.mockResolvedValue({ invoiceNumber: 'CT/2026-27/0001' });

      const res = await controller.createInvoice(dto as any, req);
      expect(mockInvoicesService.generateInvoice).toHaveBeenCalledWith(dto, 'admin123');
      expect(res.invoiceNumber).toBe('CT/2026-27/0001');
    });
  });

  describe('GET /admin/invoices/:id/pdf', () => {
    it('should generate binary PDF buffer and stream with proper headers', async () => {
      const dummyInvoice: any = { invoiceNumber: 'CT/2026-27/0001' };
      const dummyBuffer = Buffer.from('%PDF-1.4 test stream');
      mockInvoicesService.findById.mockResolvedValue(dummyInvoice);
      mockInvoicePdfService.generateInvoicePdf.mockResolvedValue(dummyBuffer);

      const mockRes: any = {
        set: vi.fn(),
        end: vi.fn(),
      };

      await controller.downloadInvoicePdf('inv123', mockRes);

      expect(mockRes.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="Invoice-CT-2026-27-0001.pdf"',
          'Content-Length': dummyBuffer.length,
        }),
      );
      expect(mockRes.end).toHaveBeenCalledWith(dummyBuffer);
    });
  });
});

