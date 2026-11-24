import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDetectedLanInfo } from '@/lib/network';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  // Extract actual port from Host header if present (e.g. localhost:3000 or 192.168.70.111:3000)
  const hostHeader = request.headers.get('host') || '';
  const portMatch = hostHeader.match(/:(\d+)$/);
  const detectedPort = portMatch
    ? parseInt(portMatch[1], 10)
    : process.env.PORT
    ? parseInt(process.env.PORT, 10)
    : 3000;

  const lanInfo = getDetectedLanInfo(detectedPort);

  // Check for active public tunnel URL (Cloudflare Tunnel or custom domain)
  let tunnelUrl: string | null = null;
  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envAppUrl && envAppUrl.startsWith('https://') && !envAppUrl.includes('localhost')) {
    tunnelUrl = envAppUrl.trim().replace(/\/+$/, '');
  } else {
    try {
      const tunnelFile = path.join(process.cwd(), 'public-tunnel-url.txt');
      if (fs.existsSync(tunnelFile)) {
        const content = fs.readFileSync(tunnelFile, 'utf8').trim();
        if (content.startsWith('https://')) {
          tunnelUrl = content.replace(/\/+$/, '');
        }
      }
    } catch {}
  }

  return NextResponse.json({
    ...lanInfo,
    tunnelUrl,
    isProduction: process.env.NODE_ENV === 'production',
  });
}
