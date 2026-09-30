import type { NextConfig } from "next";

// The browser only ever talks to this Next.js server. /api/* is forwarded to the ASP.NET Core
// API, so the session cookie is first-party, no CORS is needed, and the API address is a
// server-side setting that never reaches the bundle.
const apiUrl = process.env.API_URL ?? "http://localhost:5080";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // The dev badge sits bottom-left, exactly over the sidebar's collapse and sign-out controls.
  devIndicators: false,
  experimental: {
    // The _rsc cache-busting check exists to protect CDN caches. GrowDesk has no CDN (Caddy
    // doesn't cache), and the check's 307 redirect was silently cancelling router.push() to
    // freshly created pages, e.g. opening a customer right after adding them.
    validateRSCRequestHeaders: false,
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
