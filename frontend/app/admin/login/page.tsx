'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { adminLogin, getAdminToken } from '@/lib/api';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // If already authenticated with a valid token, redirect directly to /admin
    const token = getAdminToken();
    if (token) {
      router.replace('/admin');
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      await adminLogin(trimmedEmail, password);
      // On success, redirect to /admin
      router.replace('/admin');
    } catch (err: unknown) {
      setIsLoading(false);
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Invalid email or password.');
      }
    }
  };

  if (isCheckingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#FBF7F2] p-4 font-body">
        <div className="text-center">
          <Loader2 className="w-7 h-7 text-[#6A0019] animate-spin mx-auto mb-3" />
          <p className="text-xs uppercase tracking-widest text-[#2C1810]/70 font-semibold">
            Verifying Session...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-[#FBF7F2] px-4 py-12 font-body selection:bg-[#6A0019] selection:text-[#EFE6DC]">
      <div className="w-full max-w-sm bg-white border border-[#6A0019]/15 rounded-3xl shadow-xs p-6 sm:p-8">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="relative w-14 h-14 rounded-full overflow-hidden border border-[#6A0019]/30 p-0.5 bg-[#EFE6DC] mx-auto mb-3 shadow-2xs">
            <Image
              src="/images/cream-treat-logo.jpg"
              alt="Cream Treat Brand Logo"
              fill
              sizes="56px"
              className="object-cover rounded-full"
              priority
            />
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-[#6A0019]">
            Cream Treat
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#2C1810]/60 mt-1 font-body">
            Staff Counter Portal
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            role="alert"
            id="login-error"
            className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block font-display text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#2C1810]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@creamtreat.local"
                required
                autoComplete="email"
                autoCapitalize="none"
                disabled={isLoading}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl text-[#2C1810] text-sm placeholder:text-[#2C1810]/40 focus:outline-none focus:ring-2 focus:ring-[#6A0019] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block font-display text-xs uppercase tracking-wider font-bold text-[#6A0019] mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#2C1810]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                disabled={isLoading}
                className="w-full pl-10 pr-3.5 py-2.5 bg-[#FBF7F2] border border-[#6A0019]/20 rounded-xl text-[#2C1810] text-sm placeholder:text-[#2C1810]/40 focus:outline-none focus:ring-2 focus:ring-[#6A0019] focus:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            id="admin-login-submit"
            disabled={isLoading}
            className="w-full min-h-[44px] py-2.5 px-4 bg-[#6A0019] hover:bg-[#520013] active:scale-[0.99] text-[#EFE6DC] font-display text-xs uppercase tracking-[0.18em] font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In to Counter'
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="mt-6 pt-5 border-t border-[#6A0019]/10 text-center">
          <Link
            href="/order"
            className="text-xs text-[#6A0019]/70 hover:text-[#6A0019] font-medium transition"
          >
            ← Back to Customer Menu
          </Link>
        </div>
      </div>
    </main>
  );
}
