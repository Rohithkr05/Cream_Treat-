'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  QrCode,
  Printer,
  Sparkles,
  AlertCircle,
  LogOut,
  RefreshCw,
  UtensilsCrossed,
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

  // Handle Logout
  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    adminLogout();
    router.replace('/admin/login');
  };

  // Handle Generate QR Codes submission
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

  // Trigger browser print dialog with printable layout
  const handlePrint = () => {
    window.print();
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
          <p className="text-xs font-semibold text-stone-500">
            Verifying staff credentials...
          </p>
        </div>
      </div>
    );
  }

  // Generate array of table numbers 1..N
  const tableNumbers = Array.from(
    { length: activeTableCount },
    (_, i) => i + 1,
  );

  const isLocalhostUrl =
    baseUrlInput.includes('localhost') || baseUrlInput.includes('127.0.0.1');

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col">
      {/* Top Header Navigation (Part 14) - Hidden on print */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-base sm:text-lg text-stone-900 uppercase">
                CREAM TREAT
              </h1>
              <p className="text-[11px] font-medium text-stone-500 -mt-1 hidden sm:block">
                Table QR Management
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs font-medium text-stone-600">
            <Link
              href="/admin"
              className="px-3 py-1 text-stone-600 hover:text-stone-900 hover:bg-white/60 rounded-lg transition-colors font-medium"
            >
              Dashboard
            </Link>
            <Link
              href="/admin"
              className="px-3 py-1 text-stone-600 hover:text-stone-900 hover:bg-white/60 rounded-lg transition-colors font-medium"
            >
              Orders
            </Link>
            <Link
              href="/admin/menu"
              className="px-3 py-1 text-stone-600 hover:text-stone-900 hover:bg-white/60 rounded-lg transition-colors font-medium"
            >
              Menu
            </Link>
            <span className="px-3 py-1 bg-white text-stone-900 rounded-lg shadow-xs font-semibold">
              QR Codes
            </span>
          </nav>

          {/* Right Action: Admin Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {admin && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-stone-800">
                  {admin.name}
                </span>
                <span className="text-[10px] text-stone-400 -mt-0.5">
                  {admin.email}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="p-2 sm:px-3 sm:py-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl transition-all flex items-center gap-1.5 disabled:opacity-50"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-20">
        {/* Page Title & Overview Banner (Hidden on Print) */}
        <div className="mb-6 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold mb-2">
                <QrCode className="w-3.5 h-3.5 text-amber-600" />
                <span>Physical Table QR System</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                Table QR Codes
              </h2>
              <p className="text-xs text-stone-500 mt-1 max-w-xl leading-relaxed">
                Generate high-resolution printable QR codes for restaurant dining tables.
                Customers scanning a table QR are automatically routed to the digital menu
                with their table number assigned.
              </p>
            </div>

            {/* Quick Print Action */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-2"
                id="print-qr-codes-button"
              >
                <Printer className="w-4 h-4" />
                <span>Print QR Codes</span>
              </button>
            </div>
          </div>
        </div>

        {/* Generator Controls Card (Part 4) - Hidden on Print */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs p-5 mb-6 print:hidden">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-end gap-3 sm:gap-4">
              <div className="w-full lg:w-48">
                <label
                  htmlFor="tableCountInput"
                  className="block text-xs font-bold text-stone-800 uppercase tracking-wider mb-1.5"
                >
                  Number of tables:
                </label>
                <div className="relative">
                  <input
                    id="tableCountInput"
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={tableCountInput}
                    onChange={(e) => {
                      setTableCountInput(e.target.value);
                      if (inputError) setInputError(null);
                    }}
                    placeholder="e.g. 10"
                    className={`w-full px-3.5 py-2 text-sm font-bold text-stone-900 bg-stone-50 border rounded-xl focus:outline-none focus:ring-2 ${
                      inputError
                        ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-500 text-rose-900'
                        : 'border-stone-200 focus:bg-white focus:ring-amber-500'
                    }`}
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-stone-400 pointer-events-none">
                    tables (1–100)
                  </span>
                </div>
              </div>

              {/* Target Base URL Configuration (Mobile / Production Support) */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="baseUrlInput"
                    className="block text-xs font-bold text-stone-800 uppercase tracking-wider"
                  >
                    Target Base URL:
                  </label>
                  {isLocalhostUrl ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full" title="Phones cannot connect to localhost. Use your computer's LAN IP for mobile testing.">
                      PC Only (localhost)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full" title="Phones on the same Wi-Fi can scan this QR code and order.">
                      Mobile / Network Ready
                    </span>
                  )}
                </div>
                <input
                  id="baseUrlInput"
                  type="text"
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  placeholder="e.g. http://192.168.1.10:3000 or https://creamtreat.example.com"
                  className="w-full px-3.5 py-2 text-xs font-mono font-medium text-stone-800 bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  id="generate-qr-button"
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white text-xs font-bold rounded-xl shadow-xs shadow-amber-600/20 transition-all flex items-center gap-2 shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate QR Codes</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTableCountInput('10');
                    setActiveTableCount(10);
                    const defaultUrl = getFrontendAppUrl();
                    setBaseUrlInput(defaultUrl);
                    setActiveBaseUrl(defaultUrl);
                    setInputError(null);
                  }}
                  className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-semibold transition-colors shrink-0"
                  title="Reset to 10 tables & detected URL"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Validation Error Message */}
            {inputError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-medium">{inputError}</span>
              </div>
            )}

            <p className="text-[11px] text-stone-400">
              Enter the total count of dining tables in your restaurant (supported range: 1 to 100).
              Each table will receive a unique, permanent QR code pointing to{' '}
              <span className="font-mono text-stone-600">
                {activeBaseUrl || 'http://localhost:3000'}/order?table=X
              </span>.
            </p>
          </form>
        </div>

        {/* Section Header with Stats (Hidden on Print) */}
        <div className="flex items-center justify-between mb-4 px-1 print:hidden">
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Generated Cards ({tableNumbers.length} Tables)
          </h3>
          <span className="text-xs text-stone-500 font-medium">
            Tables 1 to {activeTableCount}
          </span>
        </div>

        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block mb-8 text-center border-b pb-4">
          <h1 className="text-2xl font-black tracking-tight uppercase text-stone-900">
            Cream Treat — Table QR Codes
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Cut along the borders and place on designated dining tables.
          </p>
        </div>

        {/* QR Codes Grid (Screen & Print Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2 print:gap-6 print:m-0">
          {tableNumbers.map((tableNum) => (
            <TableQRCard
              key={tableNum}
              tableNumber={tableNum}
              baseUrlOverride={activeBaseUrl || undefined}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
