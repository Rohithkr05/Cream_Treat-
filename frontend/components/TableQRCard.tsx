'use client';

import React, { useCallback, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, ExternalLink, Check, Copy } from 'lucide-react';
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

      // Create a high-res offscreen canvas for print quality (800 x 1100 px @ 2x DPI)
      const canvas = document.createElement('canvas');
      const width = 800;
      const height = 1100;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Clean white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // 2. Outer decorative dashed border
      ctx.strokeStyle = '#d6d3d1';
      ctx.lineWidth = 4;
      ctx.strokeRect(40, 40, width - 80, height - 80);

      // Inner card solid border
      ctx.strokeStyle = '#e7e5e4';
      ctx.lineWidth = 2;
      ctx.strokeRect(52, 52, width - 104, height - 104);

      // 3. Header Restaurant Title: Cream Treat
      ctx.textAlign = 'center';
      ctx.fillStyle = '#92400e'; // Warm amber tone
      ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Cream Treat', width / 2, 140);

      ctx.fillStyle = '#78716c';
      ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('DIGITAL DINE-IN MENU', width / 2, 175);
      ctx.letterSpacing = '0px';

      // 4. Accent divider line
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 80, 205);
      ctx.lineTo(width / 2 + 80, 205);
      ctx.stroke();

      // 5. Table Title
      ctx.fillStyle = '#1c1917';
      ctx.font = '900 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`TABLE ${tableNumber}`, width / 2, 290);

      // 6. Generate QR Code image into offscreen canvas
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, targetUrl, {
        width: 440,
        margin: 1,
        color: {
          dark: '#1c1917',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });

      // Draw QR Code centered
      const qrX = (width - 440) / 2;
      const qrY = 340;
      ctx.drawImage(qrCanvas, qrX, qrY, 440, 440);

      // 7. Instructions: Scan to Order
      ctx.fillStyle = '#1c1917';
      ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Scan to Order', width / 2, 850);

      ctx.fillStyle = '#78716c';
      ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Point your phone camera at this QR code', width / 2, 895);
      ctx.fillText('to view our digital menu and order instantly', width / 2, 925);

      // 8. Target URL for staff reference
      ctx.fillStyle = '#a8a29e';
      ctx.font = '14px monospace';
      ctx.fillText(targetUrl, width / 2, 1010);

      // 9. Trigger browser download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = `cream-treat-table-${tableNumber}-qr.png`;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
      }, 'image/png');
    } catch {
      // Ignore download errors
    } finally {
      setIsDownloading(false);
    }
  }, [tableNumber, targetUrl]);

  // Copy target URL to clipboard for admin testing
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
      className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 flex flex-col items-center text-center transition-all hover:shadow-md print:shadow-none print:border-2 print:border-stone-800 print:rounded-xl print:p-6 print:break-inside-avoid print:page-break-inside-avoid"
      id={`table-card-${tableNumber}`}
    >
      {/* Brand Header */}
      <div className="mb-2">
        <h3 className="font-bold text-amber-900 text-sm tracking-tight uppercase">
          Cream Treat
        </h3>
        <p className="text-[10px] text-stone-400 font-medium tracking-wider uppercase">
          Dine-In
        </p>
      </div>

      {/* TABLE NUMBER */}
      <div className="my-1.5 py-1 px-4 bg-stone-100 rounded-lg print:bg-white print:border print:border-stone-400">
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          TABLE {tableNumber}
        </h2>
      </div>

      {/* QR CODE DISPLAY */}
      <div className="my-3 p-1.5 bg-stone-50 border border-stone-200/80 rounded-xl print:bg-white print:border-0 print:p-0">
        <TableQRCode tableNumber={tableNumber} size={180} urlOverride={targetUrl} />
      </div>

      {/* Instruction */}
      <p className="text-xs font-bold text-stone-800 tracking-wide uppercase">
        Scan to Order
      </p>
      <p className="text-[11px] text-stone-500 mt-0.5 print:hidden">
        Point phone camera to view menu
      </p>

      {/* URL Verification Preview (Part 17) */}
      <div className="mt-3 pt-2.5 border-t border-stone-100 w-full text-left print:hidden">
        <div className="flex items-center justify-between text-[10px] text-stone-400 mb-1">
          <span>Destination URL</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyUrl}
              className="p-1 hover:text-stone-700 rounded transition-colors"
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
              className="p-1 hover:text-stone-700 rounded transition-colors"
              title="Open URL in new tab"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
        <p className="text-[11px] font-mono text-stone-600 truncate bg-stone-50 p-1.5 rounded border border-stone-200">
          {targetUrl}
        </p>
      </div>

      {/* Actions (Print: Hidden) */}
      <div className="mt-3 w-full print:hidden">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          id={`download-qr-${tableNumber}`}
          className="w-full py-2 px-3 bg-stone-900 hover:bg-stone-800 active:scale-98 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{isDownloading ? 'Preparing...' : 'Download QR'}</span>
        </button>
      </div>
    </div>
  );
}
