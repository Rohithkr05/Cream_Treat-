'use client';

import React, { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  Wifi,
  Server,
  Database,
  Radio,
  QrCode,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import {
  adminGetProfile,
  adminLogout,
  getAdminToken,
  getStoredAdminUser,
  getApiBaseUrl,
  fetchBackendHealth,
  type BackendHealthResponse,
} from '@/lib/api';
import { createOrderSocket, getSocketServerUrl } from '@/lib/socket';
import { buildTableOrderUrl } from '@/lib/qr';
import { AdminUser } from '@/types/admin';
import { AdminLayout } from '@/components/AdminLayout';
import { TableQRCode } from '@/components/TableQRCode';

export default function AdminDiagnosticsPage() {
  const router = useRouter();

  // If in production, strictly forbid access
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Network State
  const [lanInfo, setLanInfo] = useState<{
    primaryIp: string;
    allIps: string[];
    frontendLanUrl: string;
    backendLanUrl: string;
  } | null>(null);

  // Health State
  const [backendHealth, setBackendHealth] = useState<BackendHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  // Socket State
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  // Load diagnostics data
  const runDiagnostics = async () => {
    setIsRefreshing(true);
    setHealthError(null);

    // 1. Fetch LAN IP info
    try {
      const res = await fetch('/api/lan-ip');
      if (res.ok) {
        const data = await res.json();
        setLanInfo(data);
      }
    } catch {
      // Ignore failure
    }

    // 2. Fetch Backend Health
    try {
      const health = await fetchBackendHealth();
      setBackendHealth(health);
    } catch (err: unknown) {
      setBackendHealth(null);
      setHealthError(err instanceof Error ? err.message : 'Backend unreachable');
    }

    setIsRefreshing(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  // Test Socket.IO Connectivity
  useEffect(() => {
    const token = getAdminToken();
    const socket = createOrderSocket(token);

    socket.on('connect', () => {
      setSocketStatus('connected');
    });

    socket.on('disconnect', () => {
      setSocketStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setSocketStatus('disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    adminLogout();
    router.replace('/admin/login');
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
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

  const detectedFrontendUrl = lanInfo?.frontendLanUrl || 'http://localhost:3000';
  const configuredBackendUrl = getApiBaseUrl();
  const socketUrl = getSocketServerUrl();
  const table1Url = buildTableOrderUrl(1, detectedFrontendUrl);

  return (
    <AdminLayout
      activeNav="diagnostics"
      title="LAN & Mobile Connectivity Diagnostics"
      subtitle="Verify that mobile phones on the same Wi-Fi can reach the frontend, backend, and database."
      admin={admin}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
      headerActions={
        <button
          type="button"
          onClick={runDiagnostics}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] rounded-xl text-xs font-display uppercase tracking-wider font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Rerun Tests</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Status Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Laptop Wi-Fi IP */}
          <div className="bg-white p-5 rounded-2xl border border-[#6A0019]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6A0019]/80 font-display">
                Laptop Wi-Fi IPv4
              </span>
              <Wifi className="w-4 h-4 text-[#6A0019]" />
            </div>
            <div className="font-mono text-base font-bold text-[#2C1810] truncate">
              {lanInfo?.primaryIp || 'Detecting...'}
            </div>
            <p className="text-[11px] text-[#2C1810]/60 mt-1">
              Active LAN address for mobile phones
            </p>
          </div>

          {/* Card 2: Backend REST API */}
          <div className="bg-white p-5 rounded-2xl border border-[#6A0019]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6A0019]/80 font-display">
                Backend REST API
              </span>
              <Server className="w-4 h-4 text-[#6A0019]" />
            </div>
            <div className="flex items-center gap-2">
              {backendHealth?.status === 'ok' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm text-emerald-800">Healthy (Port 3001)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span className="font-bold text-sm text-rose-800">
                    {healthError || 'Unreachable'}
                  </span>
                </>
              )}
            </div>
            <p className="text-[11px] text-[#2C1810]/60 mt-1 truncate font-mono">
              {configuredBackendUrl}
            </p>
          </div>

          {/* Card 3: Database Connectivity */}
          <div className="bg-white p-5 rounded-2xl border border-[#6A0019]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6A0019]/80 font-display">
                MongoDB Status
              </span>
              <Database className="w-4 h-4 text-[#6A0019]" />
            </div>
            <div className="flex items-center gap-2">
              {backendHealth?.database === 'connected' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm text-emerald-800">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="font-bold text-sm text-amber-800">Connecting/Disconnected</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-[#2C1810]/60 mt-1">
              MongoDB Atlas cluster connection active
            </p>
          </div>

          {/* Card 4: Socket.IO Gateway */}
          <div className="bg-white p-5 rounded-2xl border border-[#6A0019]/15 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6A0019]/80 font-display">
                Socket.IO Gateway
              </span>
              <Radio className="w-4 h-4 text-[#6A0019]" />
            </div>
            <div className="flex items-center gap-2">
              {socketStatus === 'connected' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm text-emerald-800">Real-Time Connected</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 border-2 border-[#6A0019] border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="font-bold text-sm text-[#6A0019]/70">Connecting...</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-[#2C1810]/60 mt-1 truncate font-mono">
              {socketUrl}
            </p>
          </div>
        </div>

        {/* Live Mobile QR Preview for Table 1 */}
        <div className="bg-white p-6 rounded-3xl border border-[#6A0019]/15 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#6A0019]/10">
            <div>
              <h2 className="font-display font-bold text-sm uppercase tracking-wider text-[#6A0019] flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#6A0019]" />
                <span>Table 1 Live Scannable QR (Same Wi-Fi)</span>
              </h2>
              <p className="text-xs text-[#2C1810]/70 mt-0.5">
                Scan this QR code from your phone (connected to the same Wi-Fi) to test menu browsing and checkout.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyUrl(table1Url)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FBF7F2] hover:bg-[#EFE6DC] border border-[#6A0019]/20 text-xs font-semibold rounded-xl text-[#6A0019] transition cursor-pointer"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy Customer URL'}</span>
              </button>
              <a
                href={table1Url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#6A0019] hover:bg-[#520013] text-[#EFE6DC] text-xs font-bold font-display uppercase tracking-wider rounded-xl transition shadow-2xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6 items-center">
            <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#FBF7F2] rounded-2xl border border-[#6A0019]/15">
              <TableQRCode tableNumber={1} size={180} urlOverride={table1Url} />
              <span className="font-mono text-xs font-bold text-[#6A0019] mt-3 bg-white px-2.5 py-1 rounded-full border border-[#6A0019]/15">
                TABLE 1
              </span>
            </div>

            <div className="md:col-span-8 space-y-3 font-body">
              <div>
                <span className="text-xs uppercase tracking-wider font-bold text-[#6A0019] block mb-1">
                  Target Customer Destination:
                </span>
                <div className="p-2.5 bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl font-mono text-xs text-[#2C1810] break-all select-all font-semibold">
                  {table1Url}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[#2C1810]/80">
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span><strong>Step 1:</strong> Connect your smartphone to the same Wi-Fi router as this laptop.</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span><strong>Step 2:</strong> Open your smartphone camera or Google Lens and point it at the QR code.</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span><strong>Step 3:</strong> The full Cream Treat menu will open with Table 1 automatically pre-selected.</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span><strong>Step 4:</strong> Add any dish to cart and place an order to see it appear on <Link href="/admin" className="text-[#6A0019] font-bold underline">Live Orders</Link> in real time!</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Windows Troubleshooting & Network Guide Card */}
        <div className="bg-white p-6 rounded-3xl border border-[#6A0019]/15 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#6A0019]/10">
            <ShieldAlert className="w-5 h-5 text-[#6A0019]" />
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-[#6A0019]">
              Local Wi-Fi Connection Troubleshooting
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-body text-[#2C1810]/80">
            <div className="p-4 bg-[#FBF7F2] rounded-2xl border border-[#6A0019]/15 space-y-2">
              <h4 className="font-bold text-[#6A0019] uppercase tracking-wider">
                1. Windows Firewall TCP Inbound Rules
              </h4>
              <p className="leading-relaxed">
                If your phone shows <em>&quot;This site can&apos;t be reached (ERR_CONNECTION_TIMED_OUT)&quot;</em>, Windows Firewall may be blocking inbound traffic on ports 3000 and 3001.
              </p>
              <p className="leading-relaxed font-semibold text-[#6A0019]">
                Run PowerShell as Administrator to allow inbound TCP on ports 3000 & 3001:
              </p>
              <pre className="p-2.5 bg-black/85 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto whitespace-pre-wrap select-all">
{`New-NetFirewallRule -DisplayName "Cream Treat Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private
New-NetFirewallRule -DisplayName "Cream Treat Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow -Profile Private`}
              </pre>
            </div>

            <div className="p-4 bg-[#FBF7F2] rounded-2xl border border-[#6A0019]/15 space-y-2">
              <h4 className="font-bold text-[#6A0019] uppercase tracking-wider">
                2. Windows Wi-Fi Network Profile & AP Isolation
              </h4>
              <p className="leading-relaxed">
                Ensure your laptop&apos;s Wi-Fi network profile is set to <strong>Private</strong> (not Public):
              </p>
              <ul className="list-disc list-inside space-y-1 text-[#2C1810]/70">
                <li>Go to <em>Windows Settings &gt; Network &amp; Internet &gt; Wi-Fi &gt; [Your Wi-Fi network]</em>.</li>
                <li>Set Network profile type to <strong>Private network</strong>.</li>
              </ul>
              <p className="leading-relaxed mt-2">
                <strong>Router AP Client Isolation:</strong> Some guest Wi-Fi networks (e.g. at hotels or public cafés) block communication between Wi-Fi clients. If so, connect laptop and phone to a personal mobile hotspot.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
