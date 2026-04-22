/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
      // Legal page consolidation: the canonical ToS/Privacy/Cookies policies
      // live under /legal/*. The old /privacy and /terms paths were
      // pre-Phase-Legal placeholders. 308 preserves the HTTP method and
      // signals permanence to search engines.
      { source: "/privacy", destination: "/legal/privacy", permanent: true },
      { source: "/terms", destination: "/legal/terms", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=*, microphone=*" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
