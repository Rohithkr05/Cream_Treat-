import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  GstSettings,
  GstSettingsDocument,
} from './schemas/gst-settings.schema.js';
import { UpdateGstSettingsDto } from './dto/update-gst-settings.dto.js';

@Injectable()
export class GstSettingsService {
  private readonly logger = new Logger(GstSettingsService.name);

  constructor(
    @InjectModel(GstSettings.name)
    private readonly gstSettingsModel: Model<GstSettingsDocument>,
  ) {}

  /**
   * Helper to compute the current Indian Financial Year (e.g., April 2026 -> "2026-27")
   */
  getDefaultFinancialYear(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12
    if (month >= 4) {
      const nextYearTwoDigits = String((year + 1) % 100).padStart(2, '0');
      return `${year}-${nextYearTwoDigits}`;
    } else {
      const currentYearTwoDigits = String(year % 100).padStart(2, '0');
      return `${year - 1}-${currentYearTwoDigits}`;
    }
  }

  /**
   * Evaluates if GST configuration contains all legally required fields
   */
  checkIsConfigured(settings: GstSettings): boolean {
    if (!settings.gstin || settings.gstin.trim().length !== 15) {
      return false;
    }
    if (
      !settings.address?.stateCode ||
      settings.address.stateCode.trim().length !== 2
    ) {
      return false;
    }
    if (!settings.defaultHsnSac || settings.defaultHsnSac.trim().length === 0) {
      return false;
    }
    if (typeof settings.gstRate !== 'number' || settings.gstRate <= 0) {
      return false;
    }
    return true;
  }

  /**
   * Retrieve active GST settings, creating initial unconfigured record if absent
   */
  async getSettings(): Promise<GstSettingsDocument> {
    let settings = await this.gstSettingsModel.findOne().exec();
    if (!settings) {
      settings = await this.gstSettingsModel.create({
        shopName: 'Cream Treat',
        legalName: 'Kokila Gayathri B K',
        gstin: '',
        pan: '',
        phone: '8904922648',
        email: '',
        address: {
          line1: 'No. 1424, Ground Floor, 14th Main Road, 1st Stage, Kumaraswamy Layout',
          line2: 'Jayanagar, B.B.M.P South',
          city: 'Bangalore',
          state: 'Karnataka',
          stateCode: '29',
          pincode: '560111',
        },
        defaultHsnSac: '996331',
        gstRate: 0,
        isTaxInclusive: true,
        invoicePrefix: 'CT',
        financialYear: this.getDefaultFinancialYear(),
        isConfigured: false,
        termsAndConditions: [
          'Goods/Services once sold cannot be returned or exchanged.',
          'All disputes are subject to local jurisdiction.',
          'Thank you for dining with Cream Treat!',
        ],
      });
      this.logger.log('Initialized empty unconfigured GST settings document');
    }
    return settings;
  }

  /**
   * Update GST and shop details
   */
  async updateSettings(
    dto: UpdateGstSettingsDto,
    adminId?: string,
  ): Promise<GstSettingsDocument> {
    const current = await this.getSettings();

    // Cross-validate that state code matches first 2 digits of GSTIN when provided
    if (dto.gstin && dto.address?.stateCode) {
      const gstinPrefix = dto.gstin.trim().slice(0, 2);
      const stateCode = dto.address.stateCode.trim();
      if (gstinPrefix !== stateCode) {
        throw new BadRequestException(
          `State code (${stateCode}) must match the 2-digit state prefix of the GSTIN (${gstinPrefix}).`,
        );
      }
    }

    current.shopName = dto.shopName.trim();
    current.legalName = dto.legalName?.trim() || '';
    current.gstin = dto.gstin.trim().toUpperCase();
    current.pan = dto.pan?.trim().toUpperCase() || current.gstin.slice(2, 12);
    current.phone = dto.phone.trim();
    current.email = dto.email?.trim().toLowerCase() || '';

    current.address = {
      line1: dto.address.line1.trim(),
      line2: dto.address.line2?.trim() || '',
      city: dto.address.city.trim(),
      state: dto.address.state.trim(),
      stateCode: dto.address.stateCode.trim(),
      pincode: dto.address.pincode.trim(),
    };

    current.defaultHsnSac = dto.defaultHsnSac.trim();
    current.gstRate = dto.gstRate;
    current.isTaxInclusive = dto.isTaxInclusive;
    if (dto.invoicePrefix) {
      current.invoicePrefix = dto.invoicePrefix.trim().toUpperCase();
    }
    if (dto.financialYear) {
      current.financialYear = dto.financialYear.trim();
    }
    if (dto.termsAndConditions && Array.isArray(dto.termsAndConditions)) {
      current.termsAndConditions = dto.termsAndConditions;
    }
    if (adminId && Types.ObjectId.isValid(adminId)) {
      current.updatedBy = new Types.ObjectId(adminId);
    }

    // Determine compliance readiness
    current.isConfigured = this.checkIsConfigured(current);

    await current.save();
    this.logger.log(
      `GST settings updated. isConfigured=${current.isConfigured}, GSTIN=${current.gstin || 'None'}`,
    );
    return current;
  }
}

