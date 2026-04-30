import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/dashboard", "/session/", "/sessions", "/settings", "/practice"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
