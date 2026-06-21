import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
        ],
      },
    ];
  },
};

export default nextConfig;
