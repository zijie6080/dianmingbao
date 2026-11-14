import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const nonIndexablePaths = [
      "/login", "/register", "/forgot-password",
      "/dashboard/:path*", "/courses/:path*", "/admin/:path*",
      "/attend/:path*", "/quiz/:path*", "/api/:path*",
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      ...nonIndexablePaths.map((source) => ({
        source,
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      })),
    ];
  },
};

export default nextConfig;
