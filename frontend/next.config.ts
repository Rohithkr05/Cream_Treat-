import type { NextConfig } from "next";

const allowedDevOrigins: string[] = [
  "localhost",
  "127.0.0.1",
  "192.168.70.111",
  "*.local",
];

if (process.env.NEXT_PUBLIC_APP_URL) {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_APP_URL).hostname;
    if (host && !allowedDevOrigins.includes(host)) {
      allowedDevOrigins.push(host);
    }
  } catch {
    // ignore invalid URL
  }
}

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins,
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
