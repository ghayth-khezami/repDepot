import type { NextConfig } from "next";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "https://repdepot-qgek.onrender.com").replace(/\/$/, "");

function isLocalApi(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function remotePatterns() {
  const cloudinary = [
    { protocol: "https" as const, hostname: "res.cloudinary.com", pathname: "/**" },
  ];
  try {
    const host = new URL(apiUrl).hostname;
    return [
      ...cloudinary,
      { protocol: "http" as const, hostname: host, pathname: "/uploads/**" },
      { protocol: "https" as const, hostname: host, pathname: "/uploads/**" },
    ];
  } catch {
    return [
      ...cloudinary,
      { protocol: "http" as const, hostname: "localhost", pathname: "/uploads/**" },
    ];
  }
}

const nextConfig: NextConfig = {
  // Vercel projects imported from the old Vite setup often keep Output Directory = "dist".
  // Next.js defaults to ".next"; align build output so deploy succeeds without dashboard changes.
  distDir: process.env.VERCEL ? "dist" : ".next",
  images: {
    remotePatterns: remotePatterns(),
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    // Local dev: proxy browser calls to remote Nest API (avoids CORS from localhost:3001)
    if (process.env.NODE_ENV === "development" && !isLocalApi(apiUrl)) {
      return [
        {
          source: "/api-proxy/:path*",
          destination: `${apiUrl}/:path*`,
        },
      ];
    }
    return [];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://accounts.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://res.cloudinary.com http://localhost:3000 https:",
              "font-src 'self' data:",
              "connect-src 'self' http://localhost:3000 https:",
              "frame-src 'self' https://accounts.google.com https://*.google.com https://maps.googleapis.com https://www.youtube.com https://www.youtube-nocookie.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
