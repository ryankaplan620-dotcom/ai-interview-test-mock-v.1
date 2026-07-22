import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { CookieBanner } from "@/components/legal/cookie-banner";
import "./globals.css";

// ==========================================
// Font loading — Open Sauce (self-hosted, OFL)
// One = text/UI · Two = display headlines
// ==========================================
const openSauceOne = localFont({
  src: [
    { path: "./fonts/OpenSauceOne-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/OpenSauceOne-Italic.ttf", weight: "400", style: "italic" },
    { path: "./fonts/OpenSauceOne-Medium.ttf", weight: "500", style: "normal" },
    { path: "./fonts/OpenSauceOne-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/OpenSauceOne-Bold.ttf", weight: "700", style: "normal" },
  ],
  display: "swap",
  variable: "--font-sans",
});

const openSauceTwo = localFont({
  src: [
    { path: "./fonts/OpenSauceTwo-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "./fonts/OpenSauceTwo-Bold.ttf", weight: "700", style: "normal" },
    { path: "./fonts/OpenSauceTwo-ExtraBold.ttf", weight: "800", style: "normal" },
    { path: "./fonts/OpenSauceTwo-Black.ttf", weight: "900", style: "normal" },
  ],
  display: "swap",
  variable: "--font-display",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

// ==========================================
// Metadata
// ==========================================
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://prepspace.example";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PrepSpace — The interview before the interview",
    template: "%s · PrepSpace",
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
    "PrepSpace",
  ],
  authors: [{ name: "PrepSpace" }],
  creator: "PrepSpace",
  publisher: "PrepSpace",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "PrepSpace",
    title: "PrepSpace — The interview before the interview",
    description: "Live video interview practice, indistinguishable from the real thing.",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrepSpace — The interview before the interview",
    description: "Live video interview practice, indistinguishable from the real thing.",
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
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVariables = [
    openSauceOne.variable,
    openSauceTwo.variable,
    jetbrainsMono.variable,
  ].join(" ");

  return (
    <html lang="en" className={fontVariables}>
      <body>
        <a href="#main-content" className="skip-to-content">Skip to content</a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: "PrepSpace",
                url: SITE_URL,
                logo: `${SITE_URL}/favicon-96.png`,
                description:
                  "Live voice interview practice, indistinguishable from the real thing.",
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: "PrepSpace",
                url: SITE_URL,
              },
            ]),
          }}
        />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
