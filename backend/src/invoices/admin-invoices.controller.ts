import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { InvoicesService } from './invoices.service.js';
import { GstSettingsService } from './gst-settings.service.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { CreateInvoiceDto, PreviewInvoiceDto } from './dto/create-invoice.dto.js';
import { UpdateGstSettingsDto } from './dto/update-gst-settings.dto.js';
import { QueryInvoicesDto } from './dto/query-invoices.dto.js';

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('admin/invoices')
export class AdminInvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly gstSettingsService: GstSettingsService,
    private readonly invoicePdfService: InvoicePdfService,
  ) {}

  /**
   * Protected Admin API: Retrieve active GST settings
   */
  @Get('settings')
  async getSettings() {
    return this.gstSettingsService.getSettings();
  }

  /**
   * Protected Admin API: Update GST settings and business details
   */
  @Put('settings')
  async updateSettings(
    @Body() dto: UpdateGstSettingsDto,
    @Req() req: RequestWithUser,
  ) {
    const adminId = req.user?.id;
    return this.gstSettingsService.updateSettings(dto, adminId);
  }

  /**
   * Protected Admin API: Preview invoice calculation without persisting
   */
  @Post('preview')
  async previewInvoice(@Body() dto: PreviewInvoiceDto) {
    return this.invoicesService.previewInvoice(dto);
  }

  /**
   * Protected Admin API: Find active invoice for an order
   */
  @Get('by-order/:orderId')
  async getInvoiceByOrderId(@Param('orderId') orderId: string) {
    return this.invoicesService.findByOrderId(orderId);
  }

  /**
   * Protected Admin API: List paginated invoices with search & filters
   */
  @Get()
  async getInvoices(@Query() query: QueryInvoicesDto) {
    return this.invoicesService.findAll(query);
  }

  /**
   * Protected Admin API: Generate final GST Tax Invoice
   */
  @Post()
  async createInvoice(
    @Body() dto: CreateInvoiceDto,
    @Req() req: RequestWithUser,
  ) {
    const adminId = req.user?.id;
    return this.invoicesService.generateInvoice(dto, adminId);
  }

  /**
   * Protected Admin API: Retrieve full single invoice details
   */
  @Get(':id')
  async getInvoiceById(@Param('id') id: string) {
    return this.invoicesService.findById(id);
  }

  /**
   * Protected Admin API: Stream/Download binary A4 PDF invoice
   */
  @Get(':id/pdf')
  async downloadInvoicePdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const invoice = await this.invoicesService.findById(id);
    const pdfBuffer = await this.invoicePdfService.generateInvoicePdf(invoice);

    const cleanNumber = invoice.invoiceNumber.replace(/[\/\\]/g, '-');
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Invoice-${cleanNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(pdfBuffer);
  }
}

