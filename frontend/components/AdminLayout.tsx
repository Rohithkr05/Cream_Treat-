'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ClipboardList,
  ReceiptText,
  BarChart3,
  BookOpen,
  QrCode,
  LogOut,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { AdminUser } from '@/types/admin';
import { SocketConnectionState } from '@/lib/socket';

interface AdminLayoutProps {
  activeNav: 'orders' | 'invoices' | 'analytics' | 'menu' | 'qr';
  title: string;
  subtitle: string;
  headerActions?: React.ReactNode;
  admin?: AdminUser | null;
  socketStatus?: SocketConnectionState;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onLogout?: () => void;
  isLoggingOut?: boolean;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { id: 'orders', label: 'Live Orders', href: '/admin', icon: ClipboardList },
  { id: 'invoices', label: 'GST Invoices', href: '/admin/invoices', icon: ReceiptText },
  { id: 'analytics', label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { id: 'menu', label: 'Menu & Prices', href: '/admin/menu', icon: BookOpen },
  { id: 'qr', label: 'Table QRs', href: '/admin/qr', icon: QrCode },
] as const;

export function AdminLayout({
  activeNav,
  title,
  subtitle,
  headerActions,
  admin,
  socketStatus,
  onRefresh,
  isRefreshing = false,
  onLogout,
  isLoggingOut = false,
  children,
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#FBF7F2] text-[#2C1810] font-body selection:bg-[#6A0019] selection:text-[#EFE6DC] overflow-x-hidden">
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP SLIM LEFT SIDEBAR
          ───────────────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col justify-between w-60 fixed inset-y-0 left-0 bg-[#EFE6DC]/40 border-r border-[#6A0019]/15 z-30">
        <div>
          {/* Brand Masthead */}
          <div className="p-4 border-b border-[#6A0019]/15">
            <div className="flex items-center gap-2.5">
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-[#6A0019]/30 p-0.5 bg-[#EFE6DC] shrink-0 shadow-2xs">
                <Image
                  src="/images/cream-treat-logo.jpg"
                  alt="Cream Treat Logo"
                  fill
                  sizes="36px"
                  className="object-cover rounded-full"
                  priority
                />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-display font-bold text-sm tracking-wide uppercase text-[#6A0019] block leading-tight whitespace-nowrap">
                  Cream Treat
                </span>
                <span className="font-body text-[9px] uppercase tracking-[0.2em] font-semibold text-[#6A0019]/70 block">
                  Staff Counter
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1" aria-label="Admin Navigation">
            {NAV_ITEMS.map((item) => {
              const isActive = activeNav === item.id;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
                    isActive
                      ? 'bg-[#6A0019] text-[#EFE6DC] shadow-2xs'
                      : 'text-[#2C1810]/75 hover:text-[#6A0019] hover:bg-[#6A0019]/5'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0 stroke-[2.2]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Status, User, Logout */}
        <div className="p-4 border-t border-[#6A0019]/15 space-y-3 bg-[#EFE6DC]/30">
          {/* Socket Connection Status */}
          {socketStatus && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium border ${
                socketStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  socketStatus === 'connected'
                    ? 'bg-emerald-600 animate-pulse'
                    : 'bg-amber-500 animate-ping'
                }`}
              />
              <span className="truncate">
                {socketStatus === 'connected' ? 'Live Gateway Active' : 'Connecting...'}
              </span>
            </div>
          )}

          {/* Admin User Chip */}
          {admin && (
            <div className="px-1 text-[11px] text-[#2C1810]/70 truncate font-mono">
              Signed in as <span className="font-bold text-[#6A0019]">{admin.name || admin.email}</span>
            </div>
          )}

          {/* Quick links & Logout */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <Link
              href="/order"
              target="_blank"
              className="inline-flex items-center gap-1 text-[11px] text-[#6A0019]/80 hover:text-[#6A0019] transition-colors"
              title="Open customer menu in new tab"
            >
              <span>Customer Menu</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 hover:text-rose-950 px-2.5 py-1 rounded-lg hover:bg-rose-50 border border-rose-200/60 transition cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE TOP BAR
          ───────────────────────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-30 bg-[#FBF7F2]/95 backdrop-blur-md border-b border-[#6A0019]/15 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-[#6A0019]/30 p-0.5 bg-[#EFE6DC] shrink-0">
            <Image
              src="/images/cream-treat-logo.jpg"
              alt="Cream Treat Logo"
              fill
              sizes="32px"
              className="object-cover rounded-full"
            />
          </div>
          <div>
            <span className="font-display font-extrabold text-sm uppercase text-[#6A0019] leading-none block">
              Cream Treat
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[#6A0019]/70 font-semibold">
              Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-[#6A0019] hover:bg-[#6A0019]/10 border border-[#6A0019]/20 transition disabled:opacity-50 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="p-2 rounded-xl text-rose-800 hover:bg-rose-50 border border-rose-200 transition disabled:opacity-50 cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. MAIN CONTENT CONTAINER (PADDED ON DESKTOP, FITS 100% SCREEN)
          ───────────────────────────────────────────────────────────── */}
      <div className="md:pl-60 flex flex-col min-w-0 w-full">
        <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-12 min-w-0">
          {/* Page Heading and Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-6 border-b border-[#6A0019]/15">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#6A0019]">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-[#2C1810]/70 mt-0.5 font-body">
                {subtitle}
              </p>
            </div>

            {headerActions && (
              <div className="flex items-center gap-2.5 shrink-0">
                {headerActions}
              </div>
            )}
          </div>

          {/* Page Specific Body */}
          {children}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MOBILE BOTTOM TAB BAR
          ───────────────────────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FBF7F2]/95 backdrop-blur-md border-t border-[#6A0019]/15 py-1 px-2 flex justify-around items-center gap-1"
        aria-label="Mobile Bottom Navigation"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id;
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 min-h-[48px] py-1 px-1 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? 'text-[#6A0019] font-bold'
                  : 'text-[#2C1810]/60 hover:text-[#6A0019]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.8]'
                }`}
              />
              <span className="text-[10px] mt-0.5 font-medium leading-none truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default AdminLayout;

