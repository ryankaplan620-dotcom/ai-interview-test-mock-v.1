const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async redirects() {
    return [
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

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  disableLogger: true,
  hideSourceMaps: true,
  tunnelRoute: "/monitoring",
});
