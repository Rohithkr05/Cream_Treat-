import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema.js';
import {
  InvoiceCounter,
  InvoiceCounterSchema,
} from './schemas/invoice-counter.schema.js';
import {
  GstSettings,
  GstSettingsSchema,
} from './schemas/gst-settings.schema.js';
import { Order, OrderSchema } from '../orders/schemas/order.schema.js';
import { AuthModule } from '../auth/auth.module.js';
import { InvoicesService } from './invoices.service.js';
import { GstSettingsService } from './gst-settings.service.js';
import { InvoicePdfService } from './invoice-pdf.service.js';
import { AdminInvoicesController } from './admin-invoices.controller.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: InvoiceCounter.name, schema: InvoiceCounterSchema },
      { name: GstSettings.name, schema: GstSettingsSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    AuthModule,
  ],
  controllers: [AdminInvoicesController],
  providers: [InvoicesService, GstSettingsService, InvoicePdfService],
  exports: [InvoicesService, GstSettingsService, InvoicePdfService],
})
export class InvoicesModule {}

