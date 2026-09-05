import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { OrganizationJsonLd, WebsiteJsonLd, LocalBusinessJsonLd } from "@/components/JsonLd";

const SITE_URL = "https://chessstream-africa.vercel.app";

export const metadata: Metadata = {
  title: {
    default: "ChessStream Africa | Live Chess Broadcasts",
    template: "%s | ChessStream Africa",
  },
  description:
    "Live chess broadcasting for African tournaments and federations. Real-time boards, per-game commentary, engine analysis, and player head-to-head data.",
  keywords: ["chess", "africa", "live", "broadcast", "tournament", "fide", "lichess"],
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "ChessStream Africa | Live Chess Broadcasts",
    description: "Live chess broadcasting for African tournaments and federations.",
    url: SITE_URL,
    siteName: "ChessStream Africa",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ChessStream Africa: live chess broadcasting for Africa",
      },
    ],
    locale: "en_NG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChessStream Africa | Live Chess Broadcasts",
    description: "Live chess broadcasting for African tournaments and federations.",
    images: ["/og-image.png"],
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ paddingTop: 56, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
        <LocalBusinessJsonLd />
        <Nav />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
