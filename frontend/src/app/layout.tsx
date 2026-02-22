import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CookieConsent } from "@/components/CookieConsent";

import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://opensuite.io"),
  title: {
    default: "OpenSuite – Free Online PDF Tools | Convert, Edit, Compress & Secure PDFs",
    template: "%s | OpenSuite – Free PDF Tools",
  },
  description:
    "OpenSuite is the fastest free online PDF toolkit. Convert PDF to Word, Excel, JPG, PNG. Merge, split, compress, rotate, watermark, and secure your PDFs. No signup required. 100% free.",
  keywords: [
    "PDF tools", "free PDF converter", "PDF to Word", "PDF to Excel",
    "merge PDF", "split PDF", "compress PDF", "online PDF editor",
    "PDF to JPG", "convert PDF free", "PDF toolkit online", "secure PDF",
  ],
  authors: [{ name: "OpenSuite" }],
  creator: "OpenSuite",
  publisher: "OpenSuite",
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://opensuite.io",
    siteName: "OpenSuite",
    title: "OpenSuite – Free Online PDF Tools",
    description: "Professional PDF processing tools, completely free. Convert, edit, compress, and secure your documents.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "OpenSuite PDF Tools" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenSuite – Free Online PDF Tools",
    description: "Professional PDF processing tools, completely free.",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://opensuite.io",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        {/* Google AdSense - Replace ca-pub-XXXXXXXXXXXXXXXX with your real publisher ID */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {/* Google Analytics 4 - Replace G-XXXXXXXXXX with your real GA4 Measurement ID */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX"}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX"}', {
              anonymize_ip: true
            });
          `}
        </Script>
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
