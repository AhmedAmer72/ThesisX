import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { THESISX_LOGO_SRC } from "@/lib/brand";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { TrustBanner } from "@/components/layout/trust-banner";
import { HashScroll } from "@/components/layout/hash-scroll";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ThesisX - Launch Your AI Hedge Fund",
  description:
    "AI-native autonomous on-chain fund operating system powered by SoSoValue intelligence and SoDEX execution.",
  icons: {
    icon: [{ url: THESISX_LOGO_SRC, type: "image/svg+xml" }],
    apple: [{ url: THESISX_LOGO_SRC, type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="flex min-h-screen flex-col bg-page-background antialiased">
        <AppProviders>
          <SiteHeader />
          <TrustBanner />
          <HashScroll />
          <main className="grow flex-1">{children}</main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
