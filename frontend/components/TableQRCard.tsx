'use client';

import React, { useCallback, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Download, ExternalLink, Check, Copy, QrCode } from 'lucide-react';
import { TableQRCode } from './TableQRCode';
import { buildTableOrderUrl } from '@/lib/qr';

export interface TableQRCardProps {
  tableNumber: number;
  baseUrlOverride?: string;
}

export function TableQRCard({
  tableNumber,
  baseUrlOverride,
}: TableQRCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const targetUrl = buildTableOrderUrl(tableNumber, baseUrlOverride);

  // Download printable standalone QR card as high-resolution PNG
  const handleDownload = useCallback(async () => {
    try {
      setIsDownloading(true);

      const canvas = document.createElement('canvas');
      const width = 800;
      const height = 1100;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Warm off-white background
      ctx.fillStyle = '#FBF7F2';
      ctx.fillRect(0, 0, width, height);

      // 2. Outer decorative border in Burgundy
      ctx.strokeStyle = '#6A0019';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Inner thin border
      ctx.strokeStyle = '#EFE6DC';
      ctx.lineWidth = 2;
      ctx.strokeRect(52, 52, width - 104, height - 104);

      // 3. Header Restaurant Logo & Title: Cream Treat
      try {
        const logoImg = new (window.Image as any)();
        await new Promise<void>((resolve) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => resolve();
          logoImg.src = '/images/cream-treat-logo.jpg';
        });

        if (logoImg.width && logoImg.height) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(width / 2, 105, 36, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(logoImg, width / 2 - 36, 105 - 36, 72, 72);
          ctx.restore();

          // Border ring around logo
          ctx.strokeStyle = '#6A0019';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(width / 2, 105, 36, 0, Math.PI * 2);
          ctx.stroke();
        }
      } catch {
        // Fallback if image fails to load
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#6A0019';
      ctx.font = 'bold 38px "Syne", Georgia, serif';
      ctx.fillText('Cream Treat', width / 2, 185);

      ctx.fillStyle = '#6A0019';
      ctx.font = '600 15px "DM Sans", sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('DINE-IN ORDERING MENU', width / 2, 215);

      // 4. Prominent Table Number Pill
      ctx.fillStyle = '#6A0019';
      const pillW = 280;
      const pillH = 60;
      const pillX = (width - pillW) / 2;
      const pillY = 245;
      const radius = 30;

      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, radius);
      ctx.fill();

      ctx.fillStyle = '#EFE6DC';
      ctx.font = 'bold 28px "Syne", Georgia, serif';
      ctx.fillText(`TABLE ${tableNumber}`, width / 2, 286);

      // 5. Generate high-resolution QR code
      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 440,
        margin: 2,
        color: {
          dark: '#6A0019',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });

      const qrImg = new (window.Image as any)();
      await new Promise<void>((resolve, reject) => {
        qrImg.onload = () => resolve();
        qrImg.onerror = reject;
        qrImg.src = qrDataUrl;
      });

      // Draw white card backing for QR
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect((width - 480) / 2, 335, 480, 480, 24);
      ctx.fill();
      ctx.strokeStyle = '#EFE6DC';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.drawImage(qrImg, (width - 440) / 2, 355, 440, 440);

      // 6. Call to Action
      ctx.fillStyle = '#6A0019';
      ctx.font = 'bold 26px "Syne", Georgia, serif';
      ctx.fillText('Point Camera & Scan to Order', width / 2, 875);

      ctx.fillStyle = '#2C1810';
      ctx.font = 'normal 18px "DM Sans", sans-serif';
      ctx.fillText('Fresh desserts, cold shakes, and hot savoury snacks', width / 2, 915);
      ctx.fillText('delivered directly to your table.', width / 2, 945);

      // 7. Footer URL
      ctx.fillStyle = '#6A0019';
      ctx.font = '14px monospace';
      ctx.fillText(targetUrl, width / 2, 1010);

      // Trigger download
      const link = document.createElement('a');
      link.download = `cream-treat-table-${tableNumber}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setIsDownloading(false);
    }
  }, [tableNumber, targetUrl]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="bg-white rounded-3xl border border-[#6A0019]/15 shadow-2xs p-5 flex flex-col items-center text-center transition-all hover:shadow-xs hover:border-[#6A0019]/30 font-body print:shadow-none print:border-2 print:border-[#6A0019] print:rounded-2xl print:p-6 print:break-inside-avoid"
      id={`table-card-${tableNumber}`}
    >
      {/* Brand Header with Logo */}
      <div className="mb-2 flex flex-col items-center">
        <div className="relative w-12 h-12 rounded-full overflow-hidden border border-[#6A0019]/30 p-0.5 bg-[#EFE6DC] mb-1.5 shadow-2xs">
          <Image
            src="/images/cream-treat-logo.jpg"
            alt="Cream Treat Logo"
            width={48}
            height={48}
            className="object-cover rounded-full"
            priority
          />
        </div>
        <h3 className="font-display font-bold text-[#6A0019] text-base tracking-tight uppercase">
          Cream Treat
        </h3>
        <p className="text-[10px] text-[#6A0019]/70 font-semibold tracking-widest uppercase font-body">
          Table Dine-In
        </p>
      </div>

      {/* Prominent Table Badge */}
      <div className="my-2 py-1 px-4 bg-[#6A0019] text-[#EFE6DC] rounded-full shadow-2xs print:bg-white print:text-black print:border print:border-black">
        <h2 className="font-display text-lg sm:text-xl font-bold tracking-wider">
          TABLE {tableNumber}
        </h2>
      </div>

      {/* QR Code Container */}
      <div className="my-3 p-2 bg-[#FBF7F2] border border-[#6A0019]/15 rounded-2xl print:bg-white print:border-0 print:p-0">
        <TableQRCode tableNumber={tableNumber} size={170} urlOverride={targetUrl} />
      </div>

      {/* Instruction */}
      <p className="font-display text-xs uppercase tracking-wider font-bold text-[#6A0019]">
        Scan to Order
      </p>
      <p className="text-[11px] text-[#2C1810]/60 mt-0.5 print:hidden">
        Point phone camera to view menu
      </p>

      {/* URL Verification Preview */}
      <div className="mt-3 pt-2.5 border-t border-[#6A0019]/10 w-full text-left print:hidden">
        <div className="flex items-center justify-between text-[10px] text-[#2C1810]/60 mb-1">
          <span>Target Destination</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-1 hover:text-[#6A0019] rounded transition cursor-pointer"
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:text-[#6A0019] rounded transition cursor-pointer"
              title="Open URL in new tab"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <p className="text-[11px] font-mono text-[#6A0019] truncate bg-[#FBF7F2] p-1.5 rounded-lg border border-[#6A0019]/15">
          {targetUrl}
        </p>
      </div>

      {/* Download Action Button */}
      <div className="mt-3 w-full print:hidden">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          id={`download-qr-${tableNumber}`}
          className="w-full min-h-[38px] py-1.5 px-3 bg-[#6A0019] hover:bg-[#520013] active:scale-95 text-[#EFE6DC] text-xs font-display uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isDownloading ? 'Exporting...' : 'Download Standee'}</span>
        </button>
      </div>
    </div>
  );
}
