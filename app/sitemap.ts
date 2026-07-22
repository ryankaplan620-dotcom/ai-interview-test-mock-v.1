import type { MetadataRoute } from "next";

type Route = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
};

// Public, indexable routes only (the authed app is noindex).
const routes: Route[] = [
  { path: "", priority: 1.0, changeFrequency: "weekly" },
  { path: "/how-it-works", priority: 0.9, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" },
  { path: "/about", priority: 0.7, changeFrequency: "monthly" },
  { path: "/security", priority: 0.7, changeFrequency: "monthly" },
  { path: "/faq", priority: 0.7, changeFrequency: "monthly" },
  { path: "/careers", priority: 0.6, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.6, changeFrequency: "yearly" },
  { path: "/signup", priority: 0.8, changeFrequency: "monthly" },
  { path: "/login", priority: 0.4, changeFrequency: "yearly" },
  { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/cookies", priority: 0.3, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://prepspace.example";
  const lastModified = new Date();

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
