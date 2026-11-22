import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Invoice,
  InvoiceCustomerSnapshot,
  InvoiceDocument,
  InvoiceItemSnapshot,
  InvoiceShopSnapshot,
  InvoiceStatus,
  PaymentMode,
  PaymentStatus,
  SupplyType,
} from './schemas/invoice.schema.js';
import {
  InvoiceCounter,
  InvoiceCounterDocument,
} from './schemas/invoice-counter.schema.js';
import { Order, OrderDocument } from '../orders/schemas/order.schema.js';
import { GstSettingsService } from './gst-settings.service.js';
import { CreateInvoiceDto, PreviewInvoiceDto } from './dto/create-invoice.dto.js';
import { QueryInvoicesDto } from './dto/query-invoices.dto.js';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel(InvoiceCounter.name)
    private readonly invoiceCounterModel: Model<InvoiceCounterDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly gstSettingsService: GstSettingsService,
  ) {}

  /**
   * Calculates itemized and aggregate GST tax details with integer paise arithmetic
   */
  calculateInvoiceTotals(
    order: OrderDocument,
    gstRate: number,
    isTaxInclusive: boolean,
    hsnSacCode: string,
    supplyType: SupplyType,
  ) {
    let aggregateTaxable = 0;
    let aggregateCgst = 0;
    let aggregateSgst = 0;
    let aggregateIgst = 0;

    const items: InvoiceItemSnapshot[] = order.items.map((item) => {
      const quantity = item.quantity;
      const unitPrice = item.priceSnapshot; // in paise
      const itemGross = item.itemTotal || quantity * unitPrice; // in paise

      let taxableAmount = 0;
      let cgstRate = 0;
      let cgstAmount = 0;
      let sgstRate = 0;
      let sgstAmount = 0;
      let igstRate = 0;
      let igstAmount = 0;
      let totalAmount = 0;

      if (isTaxInclusive) {
        // Price includes GST: Base = (Gross * 100) / (100 + Rate)
        taxableAmount = Math.round(
          (itemGross * 10000) / (10000 + Math.round(gstRate * 100)),
        );
        const itemTax = itemGross - taxableAmount;

        if (supplyType === SupplyType.INTRA_STATE) {
          cgstRate = gstRate / 2;
          sgstRate = gstRate / 2;
          cgstAmount = Math.floor(itemTax / 2);
          sgstAmount = itemTax - cgstAmount; // Balance exact paise
          totalAmount = itemGross;
        } else {
          igstRate = gstRate;
          igstAmount = itemTax;
          totalAmount = itemGross;
        }
      } else {
        // Price is exclusive of GST: Base = Gross, GST is added on top
        taxableAmount = itemGross;

        if (supplyType === SupplyType.INTRA_STATE) {
          cgstRate = gstRate / 2;
          sgstRate = gstRate / 2;
          cgstAmount = Math.round(taxableAmount * (cgstRate / 100));
          sgstAmount = Math.round(taxableAmount * (sgstRate / 100));
          totalAmount = taxableAmount + cgstAmount + sgstAmount;
        } else {
          igstRate = gstRate;
          igstAmount = Math.round(taxableAmount * (igstRate / 100));
          totalAmount = taxableAmount + igstAmount;
        }
      }

      aggregateTaxable += taxableAmount;
      aggregateCgst += cgstAmount;
      aggregateSgst += sgstAmount;
      aggregateIgst += igstAmount;

      return {
        foodItemId: item.foodItemId,
        nameSnapshot: item.nameSnapshot,
        quantity,
        unitPrice,
        taxableAmount,
        hsnSacCode,
        gstRate,
        cgstRate,
        cgstAmount,
        sgstRate,
        sgstAmount,
        igstRate,
        igstAmount,
        totalAmount,
      };
    });

    const totalGst = aggregateCgst + aggregateSgst + aggregateIgst;
    const grandTotal = aggregateTaxable + totalGst;

    return {
      items,
      taxableAmount: aggregateTaxable,
      cgstTotal: aggregateCgst,
      sgstTotal: aggregateSgst,
      igstTotal: aggregateIgst,
      totalGst,
      rounding: 0,
      grandTotal,
    };
  }

  /**
   * Preview calculation for an order without persisting or allocating invoice numbers
   */
  async previewInvoice(dto: PreviewInvoiceDto) {
    if (!Types.ObjectId.isValid(dto.orderId)) {
      throw new BadRequestException('Invalid orderId format');
    }

    const order = await this.orderModel.findById(dto.orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order not found with ID ${dto.orderId}`);
    }

    const settings = await this.gstSettingsService.getSettings();

    // Check supply type
    const shopStateCode = settings.address?.stateCode || '';
    const custStateCode = dto.customerStateCode || '';
    const supplyType =
      custStateCode && shopStateCode && custStateCode !== shopStateCode
        ? SupplyType.INTER_STATE
        : SupplyType.INTRA_STATE;

    const rate = settings.gstRate || 0;
    const totals = this.calculateInvoiceTotals(
      order,
      rate,
      settings.isTaxInclusive,
      settings.defaultHsnSac || '',
      supplyType,
    );

    return {
      isConfigured: settings.isConfigured,
      previewNumber: `${settings.invoicePrefix || 'CT'}/${settings.financialYear || '2026-27'}/DRAFT`,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        orderDate: order.orderDate,
        tableNumber: order.tableNumber,
        subtotal: order.subtotal,
        total: order.total,
      },
      shopInfo: {
        shopName: settings.shopName,
        legalName: settings.legalName,
        gstin: settings.gstin,
        phone: settings.phone,
        email: settings.email,
        address: settings.address,
      },
      customerInfo: {
        name: dto.customerName || '',
        phone: dto.customerPhone || '',
        gstin: dto.customerGstin || '',
        address: dto.customerAddress || '',
        state: dto.customerState || '',
        stateCode: dto.customerStateCode || '',
      },
      supplyType,
      isTaxInclusive: settings.isTaxInclusive,
      defaultHsnSac: settings.defaultHsnSac,
      ...totals,
      paymentStatus: dto.paymentStatus || PaymentStatus.PAID,
      paymentMode: dto.paymentMode || PaymentMode.UPI,
      termsAndConditions: settings.termsAndConditions,
      issuedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a final, permanent GST Tax Invoice with atomic sequential numbering
   */
  async generateInvoice(
    dto: CreateInvoiceDto,
    adminId?: string,
  ): Promise<InvoiceDocument> {
    if (!Types.ObjectId.isValid(dto.orderId)) {
      throw new BadRequestException('Invalid orderId format');
    }

    const settings = await this.gstSettingsService.getSettings();

    // 1. Enforce GST configuration completeness
    if (!settings.isConfigured) {
      throw new BadRequestException({
        message:
          'GST configuration is incomplete. Please configure business GSTIN, state code, SAC code, and GST rate in Settings before generating tax invoices.',
        code: 'GST_CONFIG_INCOMPLETE',
      });
    }

    // 2. Fetch Order
    const order = await this.orderModel.findById(dto.orderId).exec();
    if (!order) {
      throw new NotFoundException(`Order not found with ID: ${dto.orderId}`);
    }

    // 2b. Disallow invoice generation for cancelled orders
    if (order.status === 'CANCELLED') {
      throw new BadRequestException({
        message: 'Cannot generate tax invoice for a cancelled order.',
        code: 'ORDER_CANCELLED',
      });
    }

    // 3. Prevent duplicate invoices for the same order
    const existing = await this.invoiceModel
      .findOne({
        orderId: order._id,
        status: InvoiceStatus.ISSUED,
      })
      .exec();

    if (existing) {
      throw new ConflictException({
        message: `An invoice (${existing.invoiceNumber}) has already been generated for order ${order.orderNumber}.`,
        code: 'INVOICE_ALREADY_EXISTS',
        invoiceId: existing._id,
        invoiceNumber: existing.invoiceNumber,
      });
    }

    // 4. Determine supply type
    const shopStateCode = settings.address?.stateCode || '';
    const custStateCode = dto.customerStateCode || '';
    const supplyType =
      custStateCode && shopStateCode && custStateCode !== shopStateCode
        ? SupplyType.INTER_STATE
        : SupplyType.INTRA_STATE;

    // 5. Calculate itemized totals using integer paise
    const totals = this.calculateInvoiceTotals(
      order,
      settings.gstRate,
      settings.isTaxInclusive,
      settings.defaultHsnSac,
      supplyType,
    );

    // 6. Concurrency-safe atomic sequence allocation
    const sequenceKey = `INVOICE-${settings.invoicePrefix}-${settings.financialYear}`;
    const counterDoc = await this.invoiceCounterModel
      .findOneAndUpdate(
        { key: sequenceKey },
        { $inc: { sequence: 1 } },
        { returnDocument: 'after', upsert: true },
      )
      .exec();

    const sequence = counterDoc.sequence;
    const paddedSeq = String(sequence).padStart(4, '0');
    const invoiceNumber = `${settings.invoicePrefix}/${settings.financialYear}/${paddedSeq}`;

    // 7. Assemble immutable snapshots
    const shopSnapshot: InvoiceShopSnapshot = {
      shopName: settings.shopName,
      legalName: settings.legalName,
      gstin: settings.gstin,
      pan: settings.pan,
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
    };

    const customerSnapshot: InvoiceCustomerSnapshot = {
      name: dto.customerName?.trim() || '',
      phone: dto.customerPhone?.trim() || '',
      gstin: dto.customerGstin?.trim().toUpperCase() || '',
      address: dto.customerAddress?.trim() || '',
      state: dto.customerState?.trim() || '',
      stateCode: dto.customerStateCode?.trim() || '',
    };

    // 8. Persist new Invoice
    const invoice = await this.invoiceModel.create({
      invoiceNumber,
      sequence,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      tableNumber: order.tableNumber,
      shopInfo: shopSnapshot,
      customerInfo: customerSnapshot,
      supplyType,
      isTaxInclusive: settings.isTaxInclusive,
      defaultHsnSac: settings.defaultHsnSac,
      items: totals.items,
      taxableAmount: totals.taxableAmount,
      cgstTotal: totals.cgstTotal,
      sgstTotal: totals.sgstTotal,
      igstTotal: totals.igstTotal,
      totalGst: totals.totalGst,
      rounding: totals.rounding,
      grandTotal: totals.grandTotal,
      paymentStatus: dto.paymentStatus || PaymentStatus.PAID,
      paymentMode: dto.paymentMode || PaymentMode.UPI,
      status: InvoiceStatus.ISSUED,
      notes: dto.notes?.trim() || '',
      termsAndConditions: settings.termsAndConditions,
      issuedAt: new Date(),
      issuedBy: adminId && Types.ObjectId.isValid(adminId) ? new Types.ObjectId(adminId) : undefined,
    });

    this.logger.log(
      `Generated Tax Invoice ${invoiceNumber} for Order ${order.orderNumber} (Grand Total: ${totals.grandTotal} paise)`,
    );

    return invoice;
  }

  /**
   * Retrieve single invoice by MongoDB ObjectId or invoiceNumber
   */
  async findById(idOrNumber: string): Promise<InvoiceDocument> {
    let invoice: InvoiceDocument | null = null;
    if (Types.ObjectId.isValid(idOrNumber)) {
      invoice = await this.invoiceModel.findById(idOrNumber).exec();
    }
    if (!invoice) {
      invoice = await this.invoiceModel
        .findOne({ invoiceNumber: idOrNumber })
        .exec();
    }
    if (!invoice) {
      throw new NotFoundException(`Invoice not found with ID/Number: ${idOrNumber}`);
    }
    return invoice;
  }

  /**
   * Retrieve active invoice associated with an order ID
   */
  async findByOrderId(orderId: string): Promise<InvoiceDocument | null> {
    if (!Types.ObjectId.isValid(orderId)) {
      return null;
    }
    return this.invoiceModel
      .findOne({ orderId: new Types.ObjectId(orderId), status: InvoiceStatus.ISSUED })
      .exec();
  }

  /**
   * Paginated and filtered retrieval of invoices
   */
  async findAll(query: QueryInvoicesDto) {
    const filter: Record<string, any> = {};

    if (query.status) {
      filter.status = query.status;
    }

    if (query.orderId && Types.ObjectId.isValid(query.orderId)) {
      filter.orderId = new Types.ObjectId(query.orderId);
    }

    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { invoiceNumber: searchRegex },
        { orderNumber: searchRegex },
        { 'customerInfo.name': searchRegex },
        { 'customerInfo.phone': searchRegex },
        { 'customerInfo.gstin': searchRegex },
      ];
    }

    if (query.startDate || query.endDate) {
      filter.issuedAt = {};
      if (query.startDate) {
        filter.issuedAt.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.issuedAt.$lte = end;
      }
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ issuedAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
