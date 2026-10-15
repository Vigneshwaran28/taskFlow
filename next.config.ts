import path from "node:path";
import type { NextConfig } from "next";

// The Express API (server/) stays the backend. In development and `next start`, /api/* is proxied to it so the
// browser sees one origin: the session cookie works and there is no CORS.
const API_ORIGIN = (process.env.TASKFLOW_API_ORIGIN ?? "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // A separate build folder lets a test build run next to a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Test builds may skip type errors (other work in progress); real builds always type-check.
  typescript: { ignoreBuildErrors: process.env.NEXT_IGNORE_TS === "1" },
  // This folder is the app root (the repository root has its own lockfile for the dev scripts).
  turbopack: { root: path.resolve(__dirname) },
  outputFileTracingRoot: path.resolve(__dirname),
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_ORIGIN}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
