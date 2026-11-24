import type { NextConfig } from "next";
import os from "os";

function getLocalDevOrigins(): string[] {
  const origins: string[] = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "*.local",
    "*.lan",
    "*.trycloudflare.com",
  ];

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === "IPv4" && !iface.internal) {
          if (!origins.includes(iface.address)) {
            origins.push(iface.address);
          }
        }
      }
    }
  } catch {
    // Ignore network interface lookup errors in restricted environments
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const host = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
      if (host && !origins.includes(host)) {
        origins.push(host);
      }
    } catch {
      // ignore invalid URL
    }
  }

  return origins;
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getLocalDevOrigins(),
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001';
    return [
      {
        source: '/menu/:path*',
        destination: `${backendUrl}/menu/:path*`,
      },
      {
        source: '/orders/:path*',
        destination: `${backendUrl}/orders/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${backendUrl}/auth/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
      {
        source: '/admin/orders/:path*',
        destination: `${backendUrl}/admin/orders/:path*`,
      },
      {
        source: '/admin/categories/:path*',
        destination: `${backendUrl}/admin/categories/:path*`,
      },
      {
        source: '/admin/items/:path*',
        destination: `${backendUrl}/admin/items/:path*`,
      },
      {
        source: '/admin/invoices/:path*',
        destination: `${backendUrl}/admin/invoices/:path*`,
      },
      {
        source: '/admin/analytics/:path*',
        destination: `${backendUrl}/admin/analytics/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
