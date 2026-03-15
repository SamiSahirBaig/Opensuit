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
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  other: {
    "theme-color": "#0a0a12",
  },
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
      <head>
        {/* Preconnect hints for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" />
        <meta name="theme-color" content="#0a0a12" />

        {/* Google AdSense - Replace with your publisher ID */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        ></script>

        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "OpenSuite",
              url: "https://opensuite.io",
              logo: "https://opensuite.io/og-image.png",
              sameAs: ["https://github.com/SamiSahirBaig/Opensuit"],
            }),
          }}
        />

        {/* WebSite Schema with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "OpenSuite",
              url: "https://opensuite.io",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://opensuite.io/?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
