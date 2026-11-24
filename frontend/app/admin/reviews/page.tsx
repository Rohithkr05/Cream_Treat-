'use client';

import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import {
  Star,
  Printer,
  Download,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import {
  adminGetProfile,
  adminLogout,
  getAdminToken,
  getStoredAdminUser,
} from '@/lib/api';
import { AdminUser } from '@/types/admin';
import {
  REVIEW_LAYOUTS,
  ReviewBoardLayout,
  DEFAULT_GOOGLE_REVIEW_URL,
  isValidReviewUrl,
} from '@/lib/google-reviews';

export default function AdminReviewsPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Form state
  const [reviewUrl, setReviewUrl] = useState(DEFAULT_GOOGLE_REVIEW_URL);
  const [selectedFormat, setSelectedFormat] = useState<'4x6' | 'a6' | '5x5'>('4x6');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [urlTouched, setUrlTouched] = useState(false);

  const isUrlValid = isValidReviewUrl(reviewUrl);
  const currentLayout: ReviewBoardLayout = REVIEW_LAYOUTS[selectedFormat];

  // Auth verification
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

  // Generate QR Code data URL whenever reviewUrl changes
  useEffect(() => {
    let isMounted = true;
    async function updateQr() {
      const urlToEncode = isUrlValid ? reviewUrl.trim() : DEFAULT_GOOGLE_REVIEW_URL;
      try {
        const dataUrl = await QRCode.toDataURL(urlToEncode, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 800,
          color: {
            dark: '#2C1810',
            light: '#FFFFFF',
          },
        });
        if (isMounted) {
          setQrDataUrl(dataUrl);
        }
      } catch (err) {
        console.error('Failed to generate review QR code:', err);
      }
    }
    updateQr();
    return () => {
      isMounted = false;
    };
  }, [reviewUrl, isUrlValid]);

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    adminLogout();
    router.replace('/admin/login');
  };

  /**
   * Generates a 300 DPI high-resolution PNG on an offscreen canvas and triggers download
   */
  const handleDownloadPng = async () => {
    setIsGeneratingPng(true);
    try {
      const canvas = document.createElement('canvas');
      const layout = REVIEW_LAYOUTS[selectedFormat];
      canvas.width = layout.widthPx;
      canvas.height = layout.heightPx;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background Cream
      ctx.fillStyle = '#FAF5ED';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Borders
      const m1 = 40;
      const m2 = 56;
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 5;
      ctx.strokeRect(m1, m1, canvas.width - m1 * 2, canvas.height - m1 * 2);

      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 2;
      ctx.strokeRect(m2, m2, canvas.width - m2 * 2, canvas.height - m2 * 2);

      // Corner flourishes
      const cSize = 25;
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 4;
      // top-left
      ctx.beginPath();
      ctx.moveTo(m1 + 8, m1 + 8);
      ctx.lineTo(m1 + 8 + cSize, m1 + 8);
      ctx.moveTo(m1 + 8, m1 + 8);
      ctx.lineTo(m1 + 8, m1 + 8 + cSize);
      // top-right
      ctx.moveTo(canvas.width - m1 - 8, m1 + 8);
      ctx.lineTo(canvas.width - m1 - 8 - cSize, m1 + 8);
      ctx.moveTo(canvas.width - m1 - 8, m1 + 8);
      ctx.lineTo(canvas.width - m1 - 8, m1 + 8 + cSize);
      // bottom-left
      ctx.moveTo(m1 + 8, canvas.height - m1 - 8);
      ctx.lineTo(m1 + 8 + cSize, canvas.height - m1 - 8);
      ctx.moveTo(m1 + 8, canvas.height - m1 - 8);
      ctx.lineTo(m1 + 8, canvas.height - m1 - 8 - cSize);
      // bottom-right
      ctx.moveTo(canvas.width - m1 - 8, canvas.height - m1 - 8);
      ctx.lineTo(canvas.width - m1 - 8 - cSize, canvas.height - m1 - 8);
      ctx.moveTo(canvas.width - m1 - 8, canvas.height - m1 - 8);
      ctx.lineTo(canvas.width - m1 - 8, canvas.height - m1 - 8 - cSize);
      ctx.stroke();

      const centerX = canvas.width / 2;
      let y = selectedFormat === '5x5' ? 100 : 120;

      // 3. Load & Draw Logo
      const logoImg = new window.Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = '/images/cream-treat-logo.jpg';
      });

      const logoSize = selectedFormat === '5x5' ? 200 : 220;
      if (logoImg.width > 0) {
        ctx.drawImage(logoImg, centerX - logoSize / 2, y, logoSize, logoSize);
        y += logoSize + (selectedFormat === '5x5' ? 25 : 35);
      } else {
        y += 40;
      }

      // 4. "CREAM TREAT" Header
      ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#2C1810';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '6px';
      ctx.fillText('CREAM TREAT', centerX, y);
      y += (selectedFormat === '5x5' ? 65 : 75);

      // 5. "ENJOYED YOUR TREAT?"
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6A0019';
      ctx.letterSpacing = '3px';
      ctx.fillText('ENJOYED YOUR TREAT?', centerX, y);
      y += (selectedFormat === '5x5' ? 60 : 70);

      // 6. "We'd Love Your Feedback!"
      ctx.font = 'italic 46px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#2C1810';
      ctx.letterSpacing = '1px';
      ctx.fillText("We'd Love Your Feedback!", centerX, y);
      y += (selectedFormat === '5x5' ? 65 : 75);

      // 7. Five Gold Stars
      ctx.font = '48px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = '#D4AF37';
      ctx.letterSpacing = '12px';
      ctx.fillText('★ ★ ★ ★ ★', centerX, y);
      y += (selectedFormat === '5x5' ? 55 : 65);

      // 8. White QR Container Box & QR Code
      const qrPixelSize = selectedFormat === '5x5' ? 520 : 540;
      const qrBoxPad = 35;
      const totalBox = qrPixelSize + qrBoxPad * 2;
      const boxX = centerX - totalBox / 2;
      const boxY = y;

      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(44, 24, 16, 0.12)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 8;
      ctx.fillRect(boxX, boxY, totalBox, totalBox);

      // Border around QR container
      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 4;
      ctx.strokeRect(boxX, boxY, totalBox, totalBox);

      // Draw QR image
      const qrImg = new window.Image();
      await new Promise<void>((resolve) => {
        qrImg.onload = () => resolve();
        qrImg.src = qrDataUrl;
      });
      ctx.drawImage(qrImg, boxX + qrBoxPad, boxY + qrBoxPad, qrPixelSize, qrPixelSize);
      y += totalBox + (selectedFormat === '5x5' ? 45 : 55);

      // 9. Pill: "SCAN TO REVIEW US ON GOOGLE"
      const pillText = 'SCAN TO REVIEW US ON GOOGLE';
      ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '3px';
      const textMetrics = ctx.measureText(pillText);
      const pillWidth = textMetrics.width + 80;
      const pillHeight = 72;
      const pillX = centerX - pillWidth / 2;

      ctx.fillStyle = '#2C1810';
      // Rounded rect for pill
      ctx.beginPath();
      ctx.roundRect(pillX, y, pillWidth, pillHeight, 16);
      ctx.fill();

      ctx.fillStyle = '#FAF5ED';
      ctx.textAlign = 'center';
      ctx.fillText(pillText, centerX, y + 48);
      y += pillHeight + (selectedFormat === '5x5' ? 40 : 55);

      // 10. "Your feedback makes us sweeter!"
      ctx.font = 'italic 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#2C1810';
      ctx.letterSpacing = '1px';
      ctx.fillText('Your feedback makes us sweeter!', centerX, y);
      y += (selectedFormat === '5x5' ? 50 : 65);

      // 11. "Thank you for visiting Cream Treat ❤️"
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#6A0019';
      ctx.letterSpacing = '1px';
      ctx.fillText('Thank you for visiting Cream Treat  ❤', centerX, y);

      // Trigger file download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `cream-treat-google-review-${selectedFormat}-300dpi.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } catch (err) {
      console.error('PNG download failed:', err);
      alert('Could not generate PNG. Please try again.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AdminLayout
      activeNav="reviews"
      title="Google Review QR Board"
      subtitle="Generate high-resolution printable tabletop standees and stickers for Google customer reviews."
      admin={admin}
      onLogout={handleLogout}
      isLoggingOut={isLoggingOut}
    >
      <div className="space-y-8 pb-12">
        {/* Top Controls Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBE3D5] shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#F2ECE1]">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF5ED] text-[#B8860B] border border-[#E0D5C1]">
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Standee & Sticker Generator
                </span>
                <span className="text-xs text-[#8A7B70]">300 DPI Print-Ready</span>
              </div>
              <h2 className="text-xl font-bold text-[#2C1810] mt-1.5">
                Physical Google Review Standee
              </h2>
              <p className="text-sm text-[#665C54]">
                This is a physical tabletop board or sticker for your café. Customers scan it with their phone camera to open your Google review form directly.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-[#2C1810] bg-[#FAF5ED] border border-[#D4AF37] hover:bg-[#F2ECE1] transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4 text-[#D4AF37]" />
                Print / Save PDF
              </button>
              <button
                onClick={handleDownloadPng}
                disabled={isGeneratingPng}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-[#2C1810] hover:bg-[#43281C] transition-colors shadow-md disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-[#D4AF37]" />
                {isGeneratingPng ? 'Exporting 300 DPI...' : 'Download 300 DPI PNG'}
              </button>
            </div>
          </div>

          {/* Form Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
            {/* Google Review URL Input */}
            <div className="lg:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-[#2C1810]">
                  Your Google Business Review URL
                </label>
                <a
                  href={reviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#B8860B] hover:text-[#6A0019] transition-colors font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  Test Review Link
                </a>
              </div>
              <div className="relative">
                <input
                  type="url"
                  value={reviewUrl}
                  onChange={(e) => {
                    setReviewUrl(e.target.value);
                    setUrlTouched(true);
                  }}
                  placeholder="https://search.google.com/local/writereview?placeid=..."
                  className={`w-full px-4 py-3 rounded-xl border text-sm text-[#2C1810] bg-[#FAF5ED]/50 focus:bg-white focus:outline-none transition-all ${
                    urlTouched && !isUrlValid
                      ? 'border-red-400 focus:border-red-500 ring-2 ring-red-100'
                      : 'border-[#D4AF37]/50 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20'
                  }`}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[#8A7B70] pt-1">
                <span>
                  {isUrlValid ? (
                    <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Valid Google Review Destination
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Enter a valid http:// or https:// URL
                    </span>
                  )}
                </span>
                <span className="text-gray-400">Error Correction: Level H (High)</span>
              </div>
            </div>

            {/* Layout Format Selector */}
            <div className="lg:col-span-5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#2C1810]">
                Select Print Layout Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['4x6', 'a6', '5x5'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormat(fmt)}
                    className={`px-3 py-2.5 rounded-xl text-left border transition-all ${
                      selectedFormat === fmt
                        ? 'border-[#D4AF37] bg-[#FAF5ED] shadow-sm ring-2 ring-[#D4AF37]/20'
                        : 'border-[#EBE3D5] bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-xs font-bold text-[#2C1810]">
                      {fmt === '4x6' ? '4 × 6"' : fmt === 'a6' ? 'A6' : '5 × 5"'}
                    </div>
                    <div className="text-[10px] text-[#8A7B70] truncate mt-0.5">
                      {fmt === '4x6' ? 'Standee' : fmt === 'a6' ? 'Postcard' : 'Sticker'}
                    </div>
                  </button>
                ))}
              </div>
              <div className="text-xs text-[#665C54] bg-[#FAF5ED] p-2.5 rounded-lg border border-[#E0D5C1] mt-2">
                <span className="font-semibold text-[#2C1810]">{currentLayout.title}:</span>{' '}
                {currentLayout.bestFor}. Recommended stock: {currentLayout.recommendedStock}.
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Display Card */}
        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#2C1810]/5 to-transparent rounded-3xl border border-[#EBE3D5]">
          <div className="text-xs font-bold uppercase tracking-wider text-[#8A7B70] mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            Live Tabletop Standee Preview ({currentLayout.title})
          </div>

          {/* Printable Standee Board Container */}
          <div
            id="printable-review-board"
            className={`relative bg-[#FAF5ED] text-[#2C1810] rounded-2xl shadow-2xl overflow-hidden border-[6px] border-[#D4AF37] flex flex-col items-center justify-between text-center select-none transition-all ${
              selectedFormat === '5x5'
                ? 'w-[420px] h-[420px] p-6'
                : selectedFormat === 'a6'
                ? 'w-[360px] h-[508px] p-7'
                : 'w-[360px] h-[540px] p-8'
            }`}
          >
            {/* Inner Double Gold Border */}
            <div className="absolute inset-2.5 border border-[#B8860B] rounded-xl pointer-events-none" />

            {/* Corner Ornamental Accents */}
            <div className="absolute top-4 left-4 w-3 h-3 border-t-2 border-l-2 border-[#D4AF37]" />
            <div className="absolute top-4 right-4 w-3 h-3 border-t-2 border-r-2 border-[#D4AF37]" />
            <div className="absolute bottom-4 left-4 w-3 h-3 border-b-2 border-l-2 border-[#D4AF37]" />
            <div className="absolute bottom-4 right-4 w-3 h-3 border-b-2 border-r-2 border-[#D4AF37]" />

            {/* Header: Logo & Brand */}
            <div className="relative z-10 flex flex-col items-center space-y-1 mt-1">
              <div className="w-14 h-14 relative rounded-full overflow-hidden shadow-sm border border-[#D4AF37]/50">
                <Image
                  src="/images/cream-treat-logo.jpg"
                  alt="Cream Treat Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <h1 className="text-xl font-black tracking-[0.2em] text-[#2C1810] pt-1">
                CREAM TREAT
              </h1>
              <p className="text-xs font-black tracking-[0.12em] text-[#6A0019]">
                ENJOYED YOUR TREAT?
              </p>
              <p className="text-sm italic font-serif text-[#2C1810]">
                We&apos;d Love Your Feedback!
              </p>
              <div className="flex items-center gap-1 text-[#D4AF37] text-sm pt-0.5">
                {'★★★★★'}
              </div>
            </div>

            {/* QR Code Container */}
            <div className="relative z-10 bg-white p-3 rounded-2xl border-2 border-[#D4AF37] shadow-lg my-1">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Scan to Review Us on Google"
                  className={
                    selectedFormat === '5x5'
                      ? 'w-[130px] h-[130px]'
                      : 'w-[140px] h-[140px]'
                  }
                />
              ) : (
                <div className="w-[140px] h-[140px] flex items-center justify-center text-xs text-gray-400">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Footer Copy */}
            <div className="relative z-10 flex flex-col items-center space-y-1.5 mb-1">
              <div className="bg-[#2C1810] text-[#FAF5ED] px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm">
                SCAN TO REVIEW US ON GOOGLE
              </div>
              <p className="text-xs italic text-[#2C1810]">
                Your feedback makes us sweeter!
              </p>
              <p className="text-[11px] font-bold text-[#6A0019]">
                Thank you for visiting Cream Treat ❤️
              </p>
            </div>
          </div>

          {/* Dimension Details */}
          <div className="mt-4 text-xs text-[#8A7B70] text-center">
            Canvas Resolution: {currentLayout.widthPx} × {currentLayout.heightPx} px @ 300 DPI | PDF Point Dimensions: {currentLayout.widthPt.toFixed(0)} × {currentLayout.heightPt.toFixed(0)} pt
          </div>
        </div>

        {/* Printables Directory Reference Card */}
        <div className="bg-white rounded-2xl p-6 border border-[#EBE3D5] shadow-sm">
          <h3 className="text-base font-bold text-[#2C1810] flex items-center gap-2 mb-3">
            <FileCheck className="w-5 h-5 text-[#B8860B]" />
            Pre-Generated Print-Ready Files on Disk
          </h3>
          <p className="text-xs text-[#665C54] mb-4">
            Vector PDFs and standalone QR code PNGs have been compiled into your project directory for sending directly to print shops or acrylic manufacturers:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-[#EBE3D5] bg-[#FAF5ED]/30 space-y-2">
              <div className="text-xs font-bold text-[#2C1810]">4 × 6 Inches Acrylic Standee</div>
              <p className="text-[11px] text-[#8A7B70]">
                File: <code className="text-[#6A0019] bg-white px-1.5 py-0.5 rounded border border-[#E0D5C1]">printables/google-reviews/cream-treat-google-review-4x6.pdf</code>
              </p>
              <p className="text-[11px] text-[#665C54]">
                Best for clear acrylic L-shaped or T-shaped holders on dining tables.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#EBE3D5] bg-[#FAF5ED]/30 space-y-2">
              <div className="text-xs font-bold text-[#2C1810]">A6 Postcard / Bill Folder</div>
              <p className="text-[11px] text-[#8A7B70]">
                File: <code className="text-[#6A0019] bg-white px-1.5 py-0.5 rounded border border-[#E0D5C1]">printables/google-reviews/cream-treat-google-review-a6.pdf</code>
              </p>
              <p className="text-[11px] text-[#665C54]">
                Best for tucking inside leather bill presentation folders or trays.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-[#EBE3D5] bg-[#FAF5ED]/30 space-y-2">
              <div className="text-xs font-bold text-[#2C1810]">5 × 5 Inches Square Sticker</div>
              <p className="text-[11px] text-[#8A7B70]">
                File: <code className="text-[#6A0019] bg-white px-1.5 py-0.5 rounded border border-[#E0D5C1]">printables/google-reviews/cream-treat-google-review-5x5-sticker.pdf</code>
              </p>
              <p className="text-[11px] text-[#665C54]">
                Best for waterproof vinyl stickers on table corners, counters, and doors.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print CSS Styles for Browser Print */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-review-board,
          #printable-review-board * {
            visibility: visible;
          }
          #printable-review-board {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            border-radius: 0 !important;
            border-width: 8px !important;
            box-shadow: none !important;
            page-break-inside: avoid;
          }
          @page {
            size: ${currentLayout.cssPageSize};
            margin: 0;
          }
        }
      `}</style>
    </AdminLayout>
  );
}
