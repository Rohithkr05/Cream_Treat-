'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Printer, X, CheckCircle, Percent } from 'lucide-react';
import { AdminOrder } from '@/types/admin';
import {
  formatCurrency,
  fetchGstSettings,
  GstSettings,
  generateAdminInvoice,
  fetchAdminInvoiceByOrderId,
  Invoice,
} from '@/lib/api';

interface TableInvoiceModalProps {
  order: AdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}

function formatInvoiceDateTime(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function TableInvoiceModal({
  order,
  isOpen,
  onClose,
}: TableInvoiceModalProps) {
  const [gstSettings, setGstSettings] = useState<GstSettings | null>(null);
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [persistedInvoice, setPersistedInvoice] = useState<Invoice | null>(null);

  // Load configured GST settings and ensure invoice is recorded in GST history
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const settings = await fetchGstSettings();
        if (isMounted && settings) {
          setGstSettings(settings);
          if (settings.isTaxInclusive !== undefined) {
            setIsTaxInclusive(settings.isTaxInclusive);
          }
        }
      } catch {
        // Fall back to standard defaults (5% restaurant GST: 2.5% CGST + 2.5% SGST)
      }

      // Check if invoice already exists in GST history or auto-create it
      if (order?.id) {
        try {
          const existing = await fetchAdminInvoiceByOrderId(order.id);
          if (isMounted && existing) {
            setPersistedInvoice(existing);
            return;
          }
        } catch {
          // Not created yet
        }

        try {
          const created = await generateAdminInvoice({
            orderId: order.id,
            customerName: `Table ${order.tableNumber} Guest`,
          });
          if (isMounted && created) {
            setPersistedInvoice(created);
          }
        } catch (err: any) {
          if (err?.code === 'INVOICE_ALREADY_EXISTS') {
            try {
              const existing = await fetchAdminInvoiceByOrderId(order.id);
              if (isMounted && existing) {
                setPersistedInvoice(existing);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    }

    if (isOpen) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, order?.id, order?.tableNumber]);

  if (!isOpen || !order) return null;

  const handlePrint = async () => {
    if (order?.id && !persistedInvoice) {
      try {
        const created = await generateAdminInvoice({
          orderId: order.id,
          customerName: `Table ${order.tableNumber} Guest`,
        });
        setPersistedInvoice(created);
      } catch {
        // ignore if already created
      }
    }
    window.print();
  };

  const gstRate = gstSettings?.gstRate && gstSettings.gstRate > 0 ? gstSettings.gstRate : 5;
  const cgstRate = gstRate / 2;
  const sgstRate = gstRate / 2;
  const sacCode = gstSettings?.defaultHsnSac || '996331';
  const gstin = gstSettings?.gstin || '';
  const shopName = gstSettings?.shopName || 'Cream Treat';

  const totalQuantity = order.items.reduce((sum, it) => sum + it.quantity, 0);
  const itemsSubtotal = order.items.reduce(
    (sum, it) => sum + (it.itemTotal || it.unitPrice * it.quantity),
    0
  );
  const baseSubtotal = itemsSubtotal > 0 ? itemsSubtotal : (order.subtotal || order.total);

  // Exact Indian GST Calculation (Paise integer math)
  let taxableAmount = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let totalTax = 0;
  let grandTotal = 0;

  if (isTaxInclusive) {
    // Menu prices include 5% GST (Café / Restaurant MRP dining)
    // Base = (Gross * 10000) / (10000 + Rate * 100)
    taxableAmount = Math.round((baseSubtotal * 10000) / (10000 + Math.round(gstRate * 100)));
    totalTax = baseSubtotal - taxableAmount;
    cgstAmount = Math.floor(totalTax / 2);
    sgstAmount = totalTax - cgstAmount;
    grandTotal = baseSubtotal;
  } else {
    // 5% GST calculated accurately on the total price of the ordered amount
    taxableAmount = baseSubtotal;
    totalTax = Math.round((taxableAmount * gstRate) / 100);
    cgstAmount = Math.floor(totalTax / 2);
    sgstAmount = totalTax - cgstAmount;
    grandTotal = taxableAmount + totalTax;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static print:z-auto print:overflow-visible">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#E8DFD8] overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:rounded-none print:w-full">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-[#FBF7F2] border-b border-[#E8DFD8] print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xs uppercase tracking-wider text-[#6A0019]">
              Table {order.tableNumber} GST Invoice
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Tax Mode Toggle */}
            <button
              type="button"
              onClick={() => setIsTaxInclusive(!isTaxInclusive)}
              className="text-[11px] font-semibold text-[#6A0019] hover:bg-[#6A0019]/10 px-2.5 py-1 rounded-lg border border-[#6A0019]/25 transition cursor-pointer flex items-center gap-1"
              title="Toggle between Tax Inclusive and Tax Exclusive calculation"
            >
              <Percent className="w-3 h-3" />
              <span>{isTaxInclusive ? 'Mode: Tax Included (5%)' : 'Mode: Tax Added (+5%)'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              id="btn-print-table-invoice"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#2C1810]/60 hover:text-[#2C1810] hover:bg-[#2C1810]/5 rounded-lg transition-colors cursor-pointer"
              aria-label="Close invoice"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Bill Area */}
        <div className="overflow-y-auto p-6 sm:p-8 font-body text-[#1F2937] print:p-0 print:overflow-visible">
          <div className="border border-[#E8DFD8] p-5 sm:p-6 rounded-2xl bg-white print:border-none print:p-0 text-center">
            {/* 1. Brand Masthead with GST Header */}
            <div className="flex flex-col items-center pb-3 border-b border-dashed border-[#6A0019]/25">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#6A0019]/30 p-0.5 bg-[#FBF7F2] mb-1.5 shadow-2xs">
                <Image
                  src="/images/cream-treat-logo.jpg"
                  alt="Cream Treat"
                  width={48}
                  height={48}
                  className="object-cover rounded-full"
                  priority
                />
              </div>
              <h1 className="font-display font-extrabold text-xl uppercase tracking-wider text-[#6A0019] leading-tight">
                {shopName}
              </h1>
              <p className="text-[10px] uppercase tracking-[0.25em] text-[#6A0019]/75 font-semibold mt-0.5">
                Desserts &amp; Savouries
              </p>
              {gstin && (
                <p className="text-[11px] font-mono font-bold text-[#6A0019] mt-0.5">
                  GSTIN: {gstin}
                </p>
              )}
              <p className="text-[11px] text-[#2C1810]/60 mt-0.5">
                GST Tax Invoice · Dine-In Bill
              </p>
            </div>

            {/* 2. Meta Info (Table, Order #, Date/Time, GST Type) */}
            <div className="py-3 border-b border-dashed border-[#6A0019]/25 text-xs text-left grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-[#2C1810]/60 uppercase tracking-wider block font-semibold">
                  Table Number
                </span>
                <span className="inline-block mt-0.5 px-2.5 py-0.5 bg-[#6A0019] text-[#EFE6DC] font-display font-bold text-xs uppercase rounded-md tracking-wider">
                  TABLE {order.tableNumber}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#2C1810]/60 uppercase tracking-wider block font-semibold">
                  {persistedInvoice?.invoiceNumber ? 'GST Invoice No' : 'Order Number'}
                </span>
                <span className="font-mono font-bold text-sm text-[#6A0019] mt-0.5 block">
                  {persistedInvoice?.invoiceNumber || order.orderNumber}
                </span>
                {persistedInvoice?.invoiceNumber && (
                  <span className="text-[10px] text-[#2C1810]/60 font-mono block">
                    Order Ref: {order.orderNumber}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-[#2C1810]/60 uppercase tracking-wider block font-semibold">
                  Date &amp; Time
                </span>
                <span className="text-[11px] text-[#2C1810] font-medium block">
                  {formatInvoiceDateTime(order.createdAt)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-[#2C1810]/60 uppercase tracking-wider block font-semibold">
                  GST SAC Code
                </span>
                <span className="text-[11px] font-mono font-bold text-[#6A0019] block">
                  {sacCode} (F&amp;B Services)
                </span>
              </div>
            </div>

            {/* 3. Items Table */}
            <div className="py-3 border-b border-dashed border-[#6A0019]/25 text-left text-xs">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-[#6A0019]/80 pb-1.5 border-b border-[#6A0019]/10">
                <span className="w-1/2">Item Description</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/6 text-right">Price</span>
                <span className="w-1/6 text-right">Amount</span>
              </div>

              <div className="space-y-2 pt-2">
                {order.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs font-body">
                    <span className="w-1/2 font-semibold text-[#2C1810] pr-1 leading-snug">
                      {it.name}
                    </span>
                    <span className="w-1/6 text-center font-mono font-bold text-[#6A0019]">
                      {it.quantity}
                    </span>
                    <span className="w-1/6 text-right font-mono text-[#2C1810]/70 tabular-nums">
                      {formatCurrency(it.unitPrice)}
                    </span>
                    <span className="w-1/6 text-right font-mono font-bold text-[#2C1810] tabular-nums">
                      {formatCurrency(it.itemTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Totals & Itemized GST Breakdown (CGST + SGST) */}
            <div className="py-3 border-b-2 border-[#6A0019] space-y-1.5 text-xs text-left">
              <div className="flex justify-between text-[#2C1810]/70 font-medium">
                <span>Total Items / Qty</span>
                <span className="font-mono">{totalQuantity} items</span>
              </div>

              {/* Total Ordered Amount / Subtotal */}
              <div className="flex justify-between text-[#2C1810]/70 font-medium pt-1 border-t border-dashed border-[#6A0019]/20">
                <span className="font-semibold text-[#2C1810]">
                  {isTaxInclusive ? 'Taxable Value (Food & Beverage)' : 'Total Ordered Price (Subtotal)'}
                </span>
                <span className="font-mono font-bold tabular-nums text-[#2C1810]">
                  {formatCurrency(taxableAmount)}
                </span>
              </div>

              {/* Central GST (CGST) */}
              <div className="flex justify-between text-[#2C1810]/80 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#6A0019]">CGST ({cgstRate}%)</span>
                  <span className="text-[10px] text-[#2C1810]/50 font-mono">SAC: {sacCode}</span>
                </span>
                <span className="font-mono tabular-nums font-semibold text-[#6A0019]">
                  {isTaxInclusive ? '' : '+'}{formatCurrency(cgstAmount)}
                </span>
              </div>

              {/* State GST (SGST) */}
              <div className="flex justify-between text-[#2C1810]/80 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#6A0019]">SGST ({sgstRate}%)</span>
                  <span className="text-[10px] text-[#2C1810]/50 font-mono">SAC: {sacCode}</span>
                </span>
                <span className="font-mono tabular-nums font-semibold text-[#6A0019]">
                  {isTaxInclusive ? '' : '+'}{formatCurrency(sgstAmount)}
                </span>
              </div>

              {/* Total GST */}
              <div className="flex justify-between text-[#2C1810]/90 font-semibold pt-1 border-t border-[#6A0019]/10">
                <span>Total GST ({gstRate}%)</span>
                <span className="font-mono tabular-nums text-[#6A0019]">
                  {isTaxInclusive ? '' : '+'}{formatCurrency(totalTax)}
                </span>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-baseline text-base font-bold text-[#6A0019] pt-2 border-t-2 border-[#6A0019]">
                <div>
                  <span className="font-display uppercase tracking-wider text-xs sm:text-sm block">
                    TOTAL BILL
                  </span>
                  <span className="text-[10px] text-[#2C1810]/60 font-body font-normal">
                    {isTaxInclusive
                      ? `(Inclusive of ${cgstRate}% CGST + ${sgstRate}% SGST)`
                      : `(Subtotal ${formatCurrency(taxableAmount)} + 5% GST ${formatCurrency(totalTax)})`}
                  </span>
                </div>
                <span className="font-mono text-xl sm:text-2xl font-extrabold tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* 5. Footer Greeting */}
            <div className="pt-4 text-center space-y-1 font-body">
              <p className="text-xs font-semibold text-[#6A0019]">
                Thank you for dining with Cream Treat!
              </p>
              <p className="text-[10px] text-[#2C1810]/60">
                Please visit again
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Print Button Bar (Hidden in Print) */}
        <div className="p-4 bg-[#FBF7F2] border-t border-[#E8DFD8] flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white hover:bg-[#EFE6DC]/50 border border-[#E8DFD8] text-[#2C1810] text-xs font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-2 px-4 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-semibold rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Bill</span>
          </button>
        </div>
      </div>
    </div>
  );
}
