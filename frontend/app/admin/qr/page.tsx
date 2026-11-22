'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Printer,
  Sparkles,
  AlertCircle,
  RefreshCw,
  QrCode,
  Info,
} from 'lucide-react';
import {
  adminGetProfile,
  adminLogout,
  getAdminToken,
  getStoredAdminUser,
} from '@/lib/api';
import { AdminUser } from '@/types/admin';
import { TableQRCard } from '@/components/TableQRCard';
import { getFrontendAppUrl, validateQRTableCount } from '@/lib/qr';
import { AdminLayout } from '@/components/AdminLayout';

export default function AdminQRManagementPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Table Generator Form State
  const [tableCountInput, setTableCountInput] = useState('10');
  const [activeTableCount, setActiveTableCount] = useState(10);
  const [baseUrlInput, setBaseUrlInput] = useState('');
  const [activeBaseUrl, setActiveBaseUrl] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);

  // Initialize Base URL on client mount
  useEffect(() => {
    const defaultUrl = getFrontendAppUrl();
    setBaseUrlInput(defaultUrl);
    setActiveBaseUrl(defaultUrl);
  }, []);

  // Verify Admin Session on Mount
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      const token = getAdminToken();
      if (!token) {
        router.replace('/admin/login');
        return;
      }

      const cached = getStoredAdminUser();
      if (cached && isMounted) {
        setAdmin(cached);
      }

      try {
        const verifiedUser = await adminGetProfile(token);
        if (isMounted) {
          setAdmin(verifiedUser);
          setIsAuthChecking(false);
        }
      } catch {
        if (isMounted) {
          router.replace('/admin/login');
        }
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    adminLogout();
    router.replace('/admin/login');
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateQRTableCount(tableCountInput);

    if (!validation.isValid || validation.value === undefined) {
      setInputError(
        validation.error || 'Please enter a valid number of tables (1–100).',
      );
      return;
    }

    setInputError(null);
    setActiveTableCount(validation.value);
    if (baseUrlInput.trim()) {
      setActiveBaseUrl(baseUrlInput.trim().replace(/\/+$/, ''));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isAuthChecking) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FBF7F2] p-4 font-body">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-[#6A0019] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs uppercase tracking-widest text-[#2C1810]/70 font-semibold">
            Verifying Admin Session...
          </p>
        </div>
      </main>
    );
  }

  const tableNumbers = Array.from(
    { length: activeTableCount },
    (_, i) => i + 1,
  );

  const isLocalhostUrl =
    baseUrlInput.includes('localhost') || baseUrlInput.includes('127.0.0.1');

  return (
    <AdminLayout
      activeNav="qr"
      title="Table QR Standees"
      subtitle="Generate, preview, and print dine-in ordering QR cards for café tables."
      admin={admin}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
      headerActions={
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] rounded-xl text-xs font-display uppercase tracking-wider font-bold transition shadow-2xs cursor-pointer"
        >
          <Printer className="w-4 h-4 stroke-[2]" />
          <span>Print All Standees</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Generator Configuration Form Card (Hidden in Print) */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#6A0019]/15 shadow-2xs print:hidden space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#6A0019]/10">
            <div>
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-[#6A0019]">
                QR Generator Controls
              </h2>
              <p className="text-xs text-[#2C1810]/60 mt-0.5 font-body">
                Adjust how many table cards to generate and verify your local network IP for phone testing.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[#6A0019] bg-[#EFE6DC] px-2.5 py-1 rounded-full border border-[#6A0019]/15">
              {activeTableCount} Active Tables
            </span>
          </div>

          <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            {/* Number of Tables */}
            <div className="sm:col-span-4">
              <label
                htmlFor="tableCount"
                className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1.5 font-display"
              >
                Table Count (1–100)
              </label>
              <input
                id="tableCount"
                type="number"
                min="1"
                max="100"
                value={tableCountInput}
                onChange={(e) => {
                  setTableCountInput(e.target.value);
                  if (inputError) setInputError(null);
                }}
                className="w-full px-3.5 py-2.5 bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#6A0019] focus:bg-white"
              />
            </div>

            {/* Base URL Override */}
            <div className="sm:col-span-5">
              <label
                htmlFor="baseUrl"
                className="block text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1.5 font-display"
              >
                Target Base URL
              </label>
              <input
                id="baseUrl"
                type="text"
                value={baseUrlInput}
                onChange={(e) => setBaseUrlInput(e.target.value)}
                placeholder="http://192.168.70.110:3000"
                className="w-full px-3.5 py-2.5 bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl text-xs font-mono text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#6A0019] focus:bg-white"
              />
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="w-full min-h-[42px] py-2.5 px-4 bg-[#6A0019] hover:bg-[#520013] active:scale-95 text-[#EFE6DC] font-display text-xs uppercase tracking-wider font-bold rounded-xl transition shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
            </div>
          </form>

          {inputError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{inputError}</span>
            </div>
          )}

          {isLocalhostUrl && (
            <div className="p-3 bg-[#FDF6E2] border border-[#E8D194] text-[#8C5D00] text-xs rounded-xl flex items-start gap-2.5 font-body">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Phone Testing Tip: </span>
                <span>
                  Scanning a QR with <code className="font-mono bg-white/60 px-1 py-0.5 rounded">localhost</code> from your phone won't connect. For phone cameras, use your Wi-Fi LAN IP (e.g. <code className="font-mono bg-white/60 px-1 py-0.5 rounded">http://192.168.70.110:3000</code>).
                </span>
              </div>
            </div>
          )}
        </div>

        {/* QR Code Cards Grid */}
        <div>
          <div className="flex items-center justify-between pb-3 print:hidden">
            <h3 className="font-display font-bold text-xs uppercase tracking-[0.2em] text-[#6A0019]">
              Generated Standees ({tableNumbers.length})
            </h3>
            <span className="text-xs text-[#2C1810]/60 font-body">
              Ready for table placement
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-2 print:gap-6">
            {tableNumbers.map((tableNum) => (
              <TableQRCard
                key={tableNum}
                tableNumber={tableNum}
                baseUrlOverride={activeBaseUrl}
              />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
