import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Playfair_Display, Spectral, Crimson_Text, Cinzel } from "next/font/google";
import { CookieBanner } from "@/components/legal/cookie-banner";
import "./globals.css";

// ==========================================
// Font loading — all brand fonts via next/font
// ==========================================
// Note: Inter Display isn't on Google Fonts yet, so we use Inter with display setting.
// When Inter Display lands on Google Fonts, swap here.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const interDisplay = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-display",
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

// Wordmark-style serifs for the proof row
const cinzel = Cinzel({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cinzel",
  weight: ["600", "700"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  weight: ["500", "600"],
});

const spectral = Spectral({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-spectral",
  weight: ["400", "500"],
});

const crimson = Crimson_Text({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-crimson",
  weight: ["400", "600"],
  style: ["normal", "italic"],
});

// ==========================================
// Metadata
// ==========================================
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://folio.io";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Folio — The interview before the interview",
    template: "%s · Folio",
  },
  description: "Live video interview practice, indistinguishable from the real thing.",
  keywords: [
    "interview practice",
    "mock interview",
    "job interview prep",
    "behavioral interview",
    "technical interview",
    "career preparation",
    "interview prep",
    "tech interview prep",
    "consulting interview prep",
    "Folio",
  ],
  authors: [{ name: "Folio" }],
  creator: "Folio",
  publisher: "Folio",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Folio",
    title: "Folio — The interview before the interview",
    description: "Live video interview practice, indistinguishable from the real thing.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Folio — The interview before the interview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Folio — The interview before the interview",
    description: "Live video interview practice, indistinguishable from the real thing.",
    images: ["/og-default.png"],
    creator: "@folio",
  },
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0D1117",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVariables = [
    inter.variable,
    interDisplay.variable,
    jetbrainsMono.variable,
    cinzel.variable,
    playfair.variable,
    spectral.variable,
    crimson.variable,
  ].join(" ");

  return (
    <html lang="en" className={fontVariables}>
      <body>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
