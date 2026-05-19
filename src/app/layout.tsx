import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Providers } from "@/components/providers";

import "./globals.css";

/**
 * Instrument Serif — the brand voice. Italic-only, used in exactly two
 * places: the wordmark and the hero sub-heading. A single elegant moment
 * inside an otherwise sans-only system. See DESIGN.md §2.
 */
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://forecast.social",
  ),
  title: {
    default: "forecast.social · be right. get famous.",
    template: "%s · forecast.social",
  },
  description:
    "Predict in public. forecast.social is the track-record social network — call probabilities on anything, build a permanent Forecast Score, no money involved.",
  applicationName: "forecast.social",
  openGraph: {
    title: "forecast.social — predict in public.",
    description:
      "The track-record social network. Call a probability on anything. No money, no house — just a permanent, public Forecast Score.",
    type: "website",
    siteName: "forecast.social",
  },
  twitter: {
    card: "summary_large_image",
    title: "forecast.social — predict in public.",
    description:
      "The track-record social network. Call a probability on anything. No money, no house — just a permanent, public Forecast Score.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
