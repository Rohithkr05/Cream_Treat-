'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UtensilsCrossed, QrCode, ArrowRight } from 'lucide-react';

function HomeContent() {
  const searchParams = useSearchParams();
  const table = searchParams.get('table');
  const orderUrl = table ? `/order?table=${encodeURIComponent(table)}` : '/order';

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between p-6 max-w-md mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-600 flex items-center justify-center text-white shadow-xs">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg text-stone-900 tracking-tight">
            Cream Treat
          </span>
        </div>
        {table && (
          <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full border border-amber-200">
            Table {table}
          </span>
        )}
      </div>

      {/* Hero Content */}
      <div className="my-auto py-12 text-center flex flex-col items-center">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-6 border border-amber-500/20 shadow-xs">
          <QrCode className="w-10 h-10" />
        </div>

        <h1 className="text-3xl font-bold text-stone-900 tracking-tight leading-tight">
          Welcome to <br />
          <span className="text-amber-600">Cream Treat</span>
        </h1>

        <p className="mt-3 text-sm text-stone-500 max-w-xs leading-relaxed">
          {table
            ? `Ordering directly from Table ${table}. Browse our menu and enjoy fresh food prepared for you.`
            : 'Explore our digital dine-in menu, customize your order, and receive it right at your table.'}
        </p>

        <div className="mt-8 w-full">
          <Link
            href={orderUrl}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-amber-600/25 transition-all text-sm group"
          >
            <span>{table ? `View Table ${table} Menu` : 'Open Digital Menu'}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center pb-4 text-xs text-stone-400">
        <p>Cream Treat • Fresh Food • Dine-In QR Ordering</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-amber-600 border-t-transparent animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
