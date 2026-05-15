import type { NextConfig } from "next";

const SECURITY_HEADERS = [
  // Browsers shouldn't sniff a misdeclared content-type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Block framing except by the same origin (allows our own embeds).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Send referrer when navigating same-origin; strip on cross-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Opt out of broad permissions we don't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS — only meaningful on HTTPS deploys; harmless in dev.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  // Avatars are served from our Supabase Storage bucket via the
  // <img> tags we render directly. Mark the host as allowed so we can
  // safely upgrade to next/image when we want.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
