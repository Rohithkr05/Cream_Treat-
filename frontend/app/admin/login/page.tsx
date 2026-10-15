'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <main className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-stone-800 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-600">Verifying session...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-stone-100 px-4 py-12">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <div className="text-center mb-6">
          <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 bg-amber-50 rounded-full border border-amber-200 mb-2">
            Management Portal
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Cream Treat
          </h1>
          <h2 className="text-base text-stone-500 mt-1 font-medium">
            Admin Login
          </h2>
        </div>

        {errorMessage && (
          <div
            role="alert"
            id="login-error"
            className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
              autoCapitalize="none"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-stone-700 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              disabled={isLoading}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900 focus:bg-white transition"
            />
          </div>

          <button
            type="submit"
            id="admin-login-submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-stone-900 text-white font-medium text-sm rounded-xl hover:bg-stone-800 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              'Login'
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-stone-100 text-center">
          <Link
            href="/order"
            className="text-xs text-stone-500 hover:text-stone-900 underline underline-offset-4 transition"
          >
            ← Back to Customer Menu
          </Link>
        </div>
      </div>
    </main>
  );
}
