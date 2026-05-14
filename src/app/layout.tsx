import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";

import { Providers } from "@/components/providers";

import "./globals.css";

/**
 * Fraunces — the "expressive" face. Variable optical-sized serif used in
 * just two places: the wordmark and the hero sub-heading. Roman weights
 * only (no italic) so it reads as modern editorial-display, not as
 * newspaper. Everything else is Geist. See DESIGN.md §2.
 */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz", "SOFT"],
  weight: "variable",
});

export const metadata: Metadata = {
  title: {
    default: "forecast.social — be right. get famous.",
    template: "%s · forecast.social",
  },
  description:
    "The track-record social network. Predict anything. Build a permanent, public Forecast Score. Receipts for everything.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} h-full`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
