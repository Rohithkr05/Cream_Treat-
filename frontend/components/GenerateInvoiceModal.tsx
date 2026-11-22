'use client';

import React, { useState, useEffect } from 'react';
import { X, ReceiptText, Eye, AlertTriangle, CheckCircle, FileCheck } from 'lucide-react';
import { AdminOrder } from '@/types/admin';
import {
  CreateInvoiceInput,
  GstSettings,
  Invoice,
  fetchGstSettings,
  generateAdminInvoice,
  previewAdminInvoice,
  formatCurrency,
} from '@/lib/api';

interface GenerateInvoiceModalProps {
  order: AdminOrder;
  isOpen: boolean;
  onClose: () => void;
  onInvoiceGenerated: (invoice: Invoice) => void;
  onOpenSettings: () => void;
  onPreview: (draft: any) => void;
}

export function GenerateInvoiceModal({
  order,
  isOpen,
  onClose,
  onInvoiceGenerated,
  onOpenSettings,
  onPreview,
}: GenerateInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gstSettings, setGstSettings] = useState<GstSettings | null>(null);
  const [formData, setFormData] = useState<Partial<CreateInvoiceInput>>({
    customerName: '',
    customerPhone: '',
    customerGstin: '',
    customerAddress: '',
    customerState: '',
    customerStateCode: '',
    paymentStatus: 'PAID',
    paymentMode: 'UPI',
    notes: '',
  });

  const [calculatedPreview, setCalculatedPreview] = useState<any>(null);

  const orderId = order.id || (order as any)._id;

  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    fetchGstSettings()
      .then((settings) => {
        setGstSettings(settings);
        // Load initial preview
        previewAdminInvoice({
          orderId,
          ...formData,
        } as CreateInvoiceInput)
          .then((prev) => setCalculatedPreview(prev))
          .catch(() => {});
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch GST configuration');
      });
  }, [isOpen, orderId]);

  const handleFieldChange = (field: string, val: string) => {
    const next = { ...formData, [field]: val };
    setFormData(next);

    // Refresh live preview calculation
    previewAdminInvoice({
      orderId,
      ...next,
    } as CreateInvoiceInput)
      .then((prev) => setCalculatedPreview(prev))
      .catch(() => {});
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gstSettings?.isConfigured) {
      setError('GST configuration is incomplete. Please configure business details first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const invoice = await generateAdminInvoice({
        orderId,
        customerName: formData.customerName?.trim() || undefined,
        customerPhone: formData.customerPhone?.trim() || undefined,
        customerGstin: formData.customerGstin?.trim().toUpperCase() || undefined,
        customerAddress: formData.customerAddress?.trim() || undefined,
        customerState: formData.customerState?.trim() || undefined,
        customerStateCode: formData.customerStateCode?.trim() || undefined,
        paymentStatus: formData.paymentStatus,
        paymentMode: formData.paymentMode,
        notes: formData.notes?.trim() || undefined,
      });

      onInvoiceGenerated(invoice);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to generate tax invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleFullPreview = async () => {
    setPreviewLoading(true);
    try {
      const draft = await previewAdminInvoice({
        orderId,
        ...formData,
      } as CreateInvoiceInput);
      onPreview(draft);
    } catch (err: any) {
      setError(err.message || 'Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl border border-[#E8DFD8] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FBF7F2] border-b border-[#E8DFD8]">
          <div className="flex items-center gap-2.5">
            <ReceiptText className="w-5 h-5 text-[#6A0019]" />
            <div>
              <h2 className="font-display font-bold text-sm tracking-wide uppercase text-[#6A0019]">
                Generate GST Tax Invoice
              </h2>
              <p className="text-[11px] text-[#2C1810]/70">
                Order {order.orderNumber} &bull; Table {order.tableNumber} &bull; Total: {formatCurrency(order.total)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#2C1810]/60 hover:text-[#2C1810] hover:bg-[#2C1810]/5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* GST Configuration Status Banner */}
        {gstSettings && !gstSettings.isConfigured && (
          <div className="p-4 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">GST Configuration Incomplete</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Before generating official tax invoices, you must configure your business GSTIN, state code, and tax rates in Settings.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[11px] shrink-0 transition-colors cursor-pointer"
            >
              Configure GST
            </button>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleGenerate} className="overflow-y-auto p-6 space-y-4 text-xs font-body text-[#2C1810]">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {error}
            </div>
          )}

          {/* Customer Information (Optional for dine-in) */}
          <div className="p-3.5 bg-[#FBF7F2] rounded-xl border border-[#E8DFD8] space-y-3">
            <div className="flex items-center justify-between border-b border-[#E8DFD8] pb-1.5">
              <span className="font-bold text-[#6A0019] uppercase tracking-wider text-[11px]">
                Customer Details (Optional for Dine-in)
              </span>
              <span className="text-[10px] text-[#2C1810]/60">Leave blank for Counter/Table guest</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#2C1810]/70 mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleFieldChange('customerName', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#2C1810]/70 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => handleFieldChange('customerPhone', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#2C1810]/70 mb-1">
                  Customer GSTIN (B2B)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={formData.customerGstin}
                  onChange={(e) => handleFieldChange('customerGstin', e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none font-mono uppercase"
                  placeholder="15-digit GSTIN"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#2C1810]/70 mb-1">
                  State & Code (for Inter-State)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.customerState}
                    onChange={(e) => handleFieldChange('customerState', e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none"
                    placeholder="State"
                  />
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.customerStateCode}
                    onChange={(e) => handleFieldChange('customerStateCode', e.target.value)}
                    className="w-14 px-2 py-1.5 rounded-lg border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none font-mono text-center"
                    placeholder="Code"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Payment & Settlement */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#2C1810]/70 mb-1">
                Payment Method
              </label>
              <select
                value={formData.paymentMode}
                onChange={(e) => handleFieldChange('paymentMode', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none bg-white"
              >
                <option value="UPI">UPI (Google Pay / PhonePe)</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Credit / Debit Card</option>
                <option value="ONLINE">Online Portal</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#2C1810]/70 mb-1">
                Payment Status
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => handleFieldChange('paymentStatus', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none bg-white"
              >
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid / Counter Pending</option>
              </select>
            </div>
          </div>

          {/* Real-time Tax Breakdown Card */}
          {calculatedPreview && (
            <div className="p-3.5 bg-white rounded-xl border border-[#D1D5DB] space-y-1.5">
              <div className="flex justify-between text-[#6B7280]">
                <span>Taxable Value:</span>
                <span className="font-medium text-[#111827]">{formatCurrency(calculatedPreview.taxableAmount)}</span>
              </div>
              {calculatedPreview.supplyType === 'INTER_STATE' ? (
                <div className="flex justify-between text-[#6B7280]">
                  <span>IGST ({gstSettings?.gstRate || 0}%):</span>
                  <span className="font-medium text-[#111827]">{formatCurrency(calculatedPreview.igstTotal)}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-[#6B7280]">
                    <span>CGST ({(gstSettings?.gstRate || 0) / 2}%):</span>
                    <span className="font-medium text-[#111827]">{formatCurrency(calculatedPreview.cgstTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#6B7280]">
                    <span>SGST ({(gstSettings?.gstRate || 0) / 2}%):</span>
                    <span className="font-medium text-[#111827]">{formatCurrency(calculatedPreview.sgstTotal)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-xs font-semibold text-[#6A0019] pt-1.5 border-t border-[#E8DFD8]">
                <span>Total GST:</span>
                <span>{formatCurrency(calculatedPreview.totalGst)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-[#6A0019] pt-1 border-t-2 border-[#6A0019]">
                <span>Final Payable:</span>
                <span>{formatCurrency(calculatedPreview.grandTotal)}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E8DFD8]">
            <button
              type="button"
              onClick={handleFullPreview}
              disabled={previewLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E8DFD8] hover:border-[#6A0019] text-[#2C1810] hover:text-[#6A0019] text-xs font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Full Preview</span>
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#E8DFD8] hover:bg-[#2C1810]/5 text-[#2C1810] font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !gstSettings?.isConfigured}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] font-semibold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>{loading ? 'Issuing...' : 'Generate Tax Invoice'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

