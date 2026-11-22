'use client';

import React from 'react';
import Image from 'next/image';
import { Download, Printer, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Invoice, downloadAdminInvoicePdf, formatCurrency } from '@/lib/api';

interface InvoiceModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  isDraftPreview?: boolean;
}

export function InvoiceModal({
  invoice,
  isOpen,
  onClose,
  isDraftPreview = false,
}: InvoiceModalProps) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!invoice._id || isDraftPreview) return;
    try {
      await downloadAdminInvoicePdf(invoice._id, invoice.invoiceNumber);
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF');
    }
  };

  const isInterState = invoice.supplyType === 'INTER_STATE';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-[#E8DFD8] overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#FBF7F2] border-b border-[#E8DFD8] print:hidden">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-sm tracking-wide uppercase text-[#6A0019]">
              {isDraftPreview ? 'Invoice Calculation Preview' : `Tax Invoice ${invoice.invoiceNumber}`}
            </span>
            {isDraftPreview ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <AlertCircle className="w-3 h-3" /> Draft Preview
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle className="w-3 h-3" /> Issued
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E8DFD8] hover:border-[#6A0019] text-[#2C1810] hover:text-[#6A0019] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            {!isDraftPreview && (
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-[#2C1810]/60 hover:text-[#2C1810] hover:bg-[#2C1810]/5 rounded-lg transition-colors cursor-pointer"
              aria-label="Close invoice modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Body */}
        <div className="overflow-y-auto p-6 sm:p-10 font-body text-[#1F2937] print:p-0 print:overflow-visible">
          {/* A4 Content Container */}
          <div className="max-w-3xl mx-auto border border-[#D1D5DB] p-6 sm:p-8 rounded-xl bg-white print:border-none print:p-0">
            {/* Header: Brand & GSTIN */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-[#6A0019]">
              <div className="flex items-center gap-3.5">
                <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[#6A0019]/30 bg-[#FBF7F2] shrink-0">
                  <Image
                    src="/images/cream-treat-logo.jpg"
                    alt="Cream Treat"
                    fill
                    sizes="56px"
                    className="object-cover"
                    priority
                  />
                </div>
                <div>
                  <h1 className="font-display font-bold text-xl uppercase tracking-wider text-[#6A0019] leading-tight">
                    {invoice.shopInfo.shopName || 'Cream Treat'}
                  </h1>
                  {invoice.shopInfo.legalName && (
                    <p className="text-[11px] text-[#4B5563]">
                      Legal Name: {invoice.shopInfo.legalName}
                    </p>
                  )}
                  <p className="text-xs text-[#374151] mt-0.5">
                    {[
                      invoice.shopInfo.address.line1,
                      invoice.shopInfo.address.city,
                      invoice.shopInfo.address.state
                        ? `${invoice.shopInfo.address.state} - ${invoice.shopInfo.address.pincode}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  <p className="text-[11px] text-[#4B5563] mt-0.5">
                    {[
                      invoice.shopInfo.phone ? `Phone: ${invoice.shopInfo.phone}` : '',
                      invoice.shopInfo.email ? `Email: ${invoice.shopInfo.email}` : '',
                    ]
                      .filter(Boolean)
                      .join(' | ')}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <span className="inline-block px-3 py-1 rounded bg-[#6A0019] text-[#EFE6DC] font-display font-bold text-xs uppercase tracking-widest">
                  TAX INVOICE
                </span>
                <p className="text-[10px] text-[#6B7280] mt-1">(Original for Recipient)</p>
                <p className="text-xs font-bold text-[#6A0019] mt-2">
                  GSTIN: {invoice.shopInfo.gstin || 'UNCONFIGURED'}
                </p>
                <p className="text-[11px] text-[#374151]">
                  State: {invoice.shopInfo.address.state || 'N/A'} (Code: {invoice.shopInfo.address.stateCode || 'N/A'})
                </p>
                {invoice.shopInfo.pan && (
                  <p className="text-[11px] text-[#6B7280]">PAN: {invoice.shopInfo.pan}</p>
                )}
              </div>
            </div>

            {/* Invoice & Customer Info Boxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              <div className="bg-[#FBF7F2] p-3.5 rounded-lg border border-[#E5E7EB] text-xs space-y-1">
                <p className="font-bold text-[#6A0019] uppercase tracking-wider text-[11px] mb-1.5 border-b border-[#E5E7EB] pb-1">
                  Invoice Details
                </p>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Invoice No:</span>
                  <span className="font-bold text-[#111827]">{invoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Invoice Date:</span>
                  <span className="font-medium text-[#111827]">{new Date(invoice.issuedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Order Ref:</span>
                  <span className="font-semibold text-[#111827]">
                    {invoice.orderNumber} (Table {invoice.tableNumber})
                  </span>
                </div>
                {invoice.orderDate && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Order Date:</span>
                    <span>{new Date(invoice.orderDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Payment:</span>
                  <span>{invoice.paymentMode} ({invoice.paymentStatus})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Supply Type:</span>
                  <span>{isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}</span>
                </div>
              </div>

              <div className="bg-[#FBF7F2] p-3.5 rounded-lg border border-[#E5E7EB] text-xs space-y-1">
                <p className="font-bold text-[#6A0019] uppercase tracking-wider text-[11px] mb-1.5 border-b border-[#E5E7EB] pb-1">
                  Billed To (Customer)
                </p>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Customer Name:</span>
                  <span className="font-semibold">{invoice.customerInfo?.name || 'Counter / Dine-in Guest'}</span>
                </div>
                {invoice.customerInfo?.phone && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">Phone:</span>
                    <span>{invoice.customerInfo.phone}</span>
                  </div>
                )}
                {invoice.customerInfo?.gstin && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">GSTIN:</span>
                    <span className="font-bold text-[#6A0019]">{invoice.customerInfo.gstin}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Place of Supply:</span>
                  <span>{invoice.customerInfo?.state || invoice.shopInfo.address.state || 'Local Dine-in'}</span>
                </div>
              </div>
            </div>

            {/* Itemized Food Bill Table */}
            <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] mb-4">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#6A0019] text-[#EFE6DC] font-semibold">
                    <th className="py-2 px-2.5 w-8">#</th>
                    <th className="py-2 px-2.5">Item Description</th>
                    <th className="py-2 px-2 text-center w-20">HSN/SAC</th>
                    <th className="py-2 px-2 text-center w-12">Qty</th>
                    <th className="py-2 px-2.5 text-right w-20">Unit Rate</th>
                    <th className="py-2 px-2.5 text-right w-24">Taxable</th>
                    {isInterState ? (
                      <th className="py-2 px-2.5 text-right w-24">IGST</th>
                    ) : (
                      <>
                        <th className="py-2 px-2 text-right w-20">CGST</th>
                        <th className="py-2 px-2 text-right w-20">SGST</th>
                      </>
                    )}
                    <th className="py-2 px-2.5 text-right w-24">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FBF7F2]/60'}>
                      <td className="py-2 px-2.5 text-[#6B7280]">{idx + 1}</td>
                      <td className="py-2 px-2.5 font-medium text-[#111827]">{item.nameSnapshot}</td>
                      <td className="py-2 px-2 text-center text-[#4B5563]">{item.hsnSacCode || invoice.defaultHsnSac || '-'}</td>
                      <td className="py-2 px-2 text-center font-semibold">{item.quantity}</td>
                      <td className="py-2 px-2.5 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-2 px-2.5 text-right">{formatCurrency(item.taxableAmount)}</td>
                      {isInterState ? (
                        <td className="py-2 px-2.5 text-right">
                          {formatCurrency(item.igstAmount)} <span className="text-[10px] text-[#6B7280]">({item.igstRate}%)</span>
                        </td>
                      ) : (
                        <>
                          <td className="py-2 px-2 text-right">{formatCurrency(item.cgstAmount)}</td>
                          <td className="py-2 px-2 text-right">{formatCurrency(item.sgstAmount)}</td>
                        </>
                      )}
                      <td className="py-2 px-2.5 text-right font-bold text-[#111827]">
                        {formatCurrency(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary & Tax Breakdown Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#FBF7F2] p-3.5 rounded-lg border border-[#E5E7EB] text-xs flex flex-col justify-between">
                <div>
                  <p className="font-bold text-[#6A0019] uppercase tracking-wider text-[11px] mb-1">
                    Invoice Notes
                  </p>
                  <p className="text-[11px] text-[#4B5563] italic">
                    {invoice.isTaxInclusive
                      ? '* Menu prices were tax-inclusive. Taxes were calculated accordingly.'
                      : '* GST was charged in addition to menu rates.'}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-[#E5E7EB]">
                  <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider mb-0.5">
                    Declaration
                  </p>
                  <p className="text-[10px] text-[#6B7280] leading-relaxed">
                    This is a computer generated invoice and does not require physical signature under the GST law.
                  </p>
                </div>
              </div>

              <div className="bg-[#FFFFFF] p-3.5 rounded-lg border border-[#E5E7EB] text-xs space-y-2">
                <div className="flex justify-between text-[#4B5563]">
                  <span>Total Taxable Value:</span>
                  <span className="font-medium text-[#111827]">{formatCurrency(invoice.taxableAmount)}</span>
                </div>

                {isInterState ? (
                  <div className="flex justify-between text-[#4B5563]">
                    <span>Total IGST:</span>
                    <span className="font-medium text-[#111827]">{formatCurrency(invoice.igstTotal)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-[#4B5563]">
                      <span>Total CGST:</span>
                      <span className="font-medium text-[#111827]">{formatCurrency(invoice.cgstTotal)}</span>
                    </div>
                    <div className="flex justify-between text-[#4B5563]">
                      <span>Total SGST:</span>
                      <span className="font-medium text-[#111827]">{formatCurrency(invoice.sgstTotal)}</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between text-[#4B5563] pt-1 border-t border-[#E5E7EB]">
                  <span>Total GST:</span>
                  <span className="font-semibold text-[#6A0019]">{formatCurrency(invoice.totalGst)}</span>
                </div>

                <div className="flex justify-between items-center p-2.5 rounded bg-[#6A0019] text-[#EFE6DC] font-bold text-sm">
                  <span>Grand Total:</span>
                  <span className="text-base">{formatCurrency(invoice.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Footer Declarations */}
            <div className="mt-6 pt-4 border-t border-[#D1D5DB] flex flex-col sm:flex-row justify-between items-end text-xs text-[#6B7280] gap-4">
              <div>
                <p className="font-semibold text-[#111827]">Terms & Conditions:</p>
                <ul className="list-disc list-inside text-[10px] space-y-0.5 mt-0.5">
                  {(invoice.termsAndConditions || ['Thank you for dining at Cream Treat!']).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>

              <div className="text-right shrink-0">
                <p className="font-bold text-[#6A0019] text-xs">For {invoice.shopInfo.shopName || 'Cream Treat'}</p>
                <p className="text-[10px] text-[#6B7280] mt-8">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

