'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ReceiptText,
  Search,
  Calendar,
  Filter,
  Eye,
  Printer,
  Download,
  ShieldCheck,
  AlertTriangle,
  Settings,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { AdminUser } from '@/types/admin';
import {
  GstSettings,
  Invoice,
  InvoiceListResponse,
  adminGetProfile,
  downloadAdminInvoicePdf,
  fetchAdminInvoices,
  fetchGstSettings,
  formatCurrency,
  getAdminToken,
} from '@/lib/api';
import { InvoiceModal } from '@/components/InvoiceModal';
import { GstSettingsModal } from '@/components/GstSettingsModal';

function InvoicesContent() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // GST Settings
  const [gstSettings, setGstSettings] = useState<GstSettings | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active Invoice View Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  const loadData = async (isSilent = false) => {
    const token = getAdminToken();
    if (!token) {
      router.replace('/admin/login');
      return;
    }

    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setErrorMessage(null);

    try {
      const user = await adminGetProfile(token);
      setAdmin(user);

      const [invoicesRes, settings] = await Promise.all([
        fetchAdminInvoices(
          {
            search: searchTerm.trim() || undefined,
            startDate: selectedDate || undefined,
            endDate: selectedDate || undefined,
            status: (selectedStatus as any) || undefined,
            page,
            limit: 15,
          },
          token,
        ),
        fetchGstSettings(token).catch(() => null),
      ]);

      setInvoices(invoicesRes.invoices);
      setTotal(invoicesRes.total);
      setTotalPages(invoicesRes.totalPages);
      if (settings) setGstSettings(settings);
    } catch (err: any) {
      if (err.message === 'Unauthorized') {
        router.replace('/admin/login');
        return;
      }
      setErrorMessage(err.message || 'Failed to load invoices.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setPage(1);
    loadData();
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInvoiceModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 350);
  };

  const handleDownloadPdf = async (invoice: Invoice) => {
    try {
      await downloadAdminInvoicePdf(invoice._id, invoice.invoiceNumber);
    } catch (err: any) {
      alert(err.message || 'Failed to download PDF');
    }
  };

  return (
    <AdminLayout
      activeNav="invoices"
      title="GST Invoices & Billing"
      subtitle="View, search, print, and download itemized tax invoices with GST compliance"
      admin={admin}
      onRefresh={() => loadData(true)}
      isRefreshing={isRefreshing}
      headerActions={
        <div className="flex items-center gap-2.5">
          {gstSettings?.isConfigured ? (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>GST Active: {gstSettings.gstin} ({gstSettings.gstRate}%)</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>GST Incomplete</span>
            </div>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E8DFD8] hover:border-[#6A0019] text-[#2C1810] hover:text-[#6A0019] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>GST Settings</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* GST Configuration Status Alert Banner (when unconfigured) */}
        {gstSettings && !gstSettings.isConfigured && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-900">
                  GST Details Configuration Required
                </p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  Business GSTIN, state code, SAC code, and GST rate must be configured before generating final tax invoices.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
            >
              Configure GST Details
            </button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white border border-[#E8DFD8] rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#735A4C] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by invoice number, order #001, customer name, phone, or GSTIN..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none text-xs text-[#2C1810]"
              />
            </div>

            {/* Date Filter */}
            <div className="relative w-full md:w-48">
              <Calendar className="w-4 h-4 text-[#735A4C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full pl-9 pr-2.5 py-2.5 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none text-xs text-[#2C1810]"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-40">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD8] focus:border-[#6A0019] focus:outline-none text-xs text-[#2C1810] bg-white"
              >
                <option value="">All Statuses</option>
                <option value="ISSUED">Issued</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Submit / Reset Buttons */}
            <div className="flex gap-2 shrink-0">
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                Search
              </button>
              {(searchTerm || selectedDate || selectedStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedDate('');
                    setSelectedStatus('');
                    setPage(1);
                    loadData();
                  }}
                  className="px-3 py-2.5 rounded-xl border border-[#E8DFD8] hover:bg-[#FBF7F2] text-[#735A4C] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Error State */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs">
            {errorMessage}
          </div>
        )}

        {/* Invoices List / Table */}
        <div className="bg-white border border-[#E8DFD8] rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E8DFD8] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-[#6A0019]" />
              <h2 className="font-display font-bold text-xs uppercase tracking-wider text-[#6A0019]">
                Generated Invoices ({total})
              </h2>
            </div>
            <span className="text-[11px] text-[#735A4C]">
              Page {page} of {totalPages}
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-[#735A4C] space-y-2">
              <div className="w-6 h-6 border-2 border-[#6A0019] border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading invoice records...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#735A4C] space-y-2">
              <ReceiptText className="w-8 h-8 text-[#A8988C] mx-auto stroke-[1.5]" />
              <p className="font-semibold text-sm text-[#2C1810]">No invoices found</p>
              <p className="text-[11px] text-[#A8988C]">
                {searchTerm || selectedDate || selectedStatus
                  ? 'No invoices match your current search or date filters.'
                  : 'Invoices generated for completed restaurant orders will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FBF7F2] text-[#735A4C] font-semibold border-b border-[#E8DFD8]">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-3">Order Ref</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3 text-right">Taxable</th>
                    <th className="py-3 px-3 text-right">Total GST</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DFD8]">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-[#FBF7F2]/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#6A0019]">
                        <button
                          onClick={() => handleViewInvoice(inv)}
                          className="hover:underline cursor-pointer"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>
                      <td className="py-3 px-3">
                        <Link
                          href={`/admin/orders/${inv.orderId}`}
                          className="inline-flex items-center gap-1 font-semibold text-[#2C1810] hover:text-[#6A0019]"
                        >
                          <span>{inv.orderNumber} (T{inv.tableNumber})</span>
                          <ExternalLink className="w-3 h-3 text-[#A8988C]" />
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-[#735A4C]">
                        {new Date(inv.issuedAt).toLocaleString('en-IN', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-3 text-[#2C1810]">
                        {inv.customerInfo?.name || (
                          <span className="text-[#A8988C] italic">Table Guest</span>
                        )}
                        {inv.customerInfo?.gstin && (
                          <span className="block font-mono text-[10px] text-[#6A0019]">
                            {inv.customerInfo.gstin}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#735A4C]">
                        {formatCurrency(inv.taxableAmount)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[#6A0019] font-medium">
                        {formatCurrency(inv.totalGst)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-extrabold text-[#2C1810]">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="Preview Invoice"
                            onClick={() => handleViewInvoice(inv)}
                            className="p-1.5 rounded-lg border border-[#E8DFD8] hover:border-[#6A0019] text-[#735A4C] hover:text-[#6A0019] transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Print Invoice"
                            onClick={() => handlePrintInvoice(inv)}
                            className="p-1.5 rounded-lg border border-[#E8DFD8] hover:border-[#6A0019] text-[#735A4C] hover:text-[#6A0019] transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Download PDF"
                            onClick={() => handleDownloadPdf(inv)}
                            className="p-1.5 rounded-lg bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#E8DFD8] flex items-center justify-between">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E8DFD8] text-xs font-semibold text-[#2C1810] hover:bg-[#FBF7F2] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="text-xs text-[#735A4C]">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E8DFD8] text-xs font-semibold text-[#2C1810] hover:bg-[#FBF7F2] disabled:opacity-40 transition-colors cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invoice View / Print Modal */}
      <InvoiceModal
        invoice={selectedInvoice}
        isOpen={isInvoiceModalOpen}
        onClose={() => {
          setIsInvoiceModalOpen(false);
          setSelectedInvoice(null);
        }}
      />

      {/* GST Settings Modal */}
      <GstSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={(updated) => {
          setGstSettings(updated);
        }}
      />
    </AdminLayout>
  );
}

export default function AdminInvoicesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FBF7F2] flex items-center justify-center p-6 text-xs text-[#735A4C]">
          Loading Invoices...
        </div>
      }
    >
      <InvoicesContent />
    </Suspense>
  );
}

