'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { buildTableOrderUrl } from '@/lib/qr';

export interface TableQRCodeProps {
  /**
   * Positive table number (e.g. 1, 2, 5, 100).
   */
  tableNumber: number;
  /**
   * Rendered square dimensions in pixels. Defaults to 200.
   */
  size?: number;
  /**
   * Optional URL override for preview or custom base environment.
   */
  urlOverride?: string;
  /**
   * Optional custom CSS class for canvas wrapper.
   */
  className?: string;
  /**
   * Optional callback when the canvas has rendered the QR code.
   */
  onCanvasReady?: (canvas: HTMLCanvasElement, url: string) => void;
}

export function TableQRCode({
  tableNumber,
  size = 200,
  urlOverride,
  className = '',
  onCanvasReady,
}: TableQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const targetUrl = urlOverride || buildTableOrderUrl(tableNumber);

  useEffect(() => {
    let isCancelled = false;

    if (!canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      targetUrl,
      {
        width: size,
        margin: 2,
        color: {
          dark: '#1c1917', // stone-900 high contrast
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      },
      (error) => {
        if (isCancelled) return;
        if (error) {
          setRenderError('Failed to generate QR code');
          return;
        }
        setRenderError(null);
        if (canvasRef.current && onCanvasReady) {
          onCanvasReady(canvasRef.current, targetUrl);
        }
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [targetUrl, size, onCanvasReady]);

  if (renderError) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-rose-50 text-rose-600 text-xs font-medium rounded-xl border border-rose-200 text-center p-2"
      >
        {renderError}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center bg-white p-2 rounded-xl ${className}`}
      data-table={tableNumber}
      data-url={targetUrl}
    >
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="block rounded-lg"
        aria-label={`QR code for Table ${tableNumber}`}
      />
    </div>
  );
}
