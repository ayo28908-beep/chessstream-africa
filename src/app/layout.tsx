import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: {
    default: "ChessStream Africa — Live Chess Broadcasts",
    template: "%s · ChessStream Africa",
  },
  description:
    "Live chess broadcasting for African tournaments and federations. Real-time boards, per-game commentary, AI analysis, and player head-to-head data.",
  keywords: ["chess", "africa", "live", "broadcast", "tournament", "fide", "lichess"],
  openGraph: {
    title: "ChessStream Africa — Live Chess Broadcasts",
    description: "Live chess broadcasting for African tournaments and federations.",
    type: "website",
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
        <Nav />
        <main style={{ flex: 1 }}>{children}</main>
        <Footer />
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--color-border)",
      padding: "24px 0",
      marginTop: 80,
    }}>
      <div className="wrap" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        fontSize: 13,
        color: "var(--color-text-muted)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>♟</span>
          <span style={{ fontWeight: 700, color: "var(--color-text)" }}>ChessStream Africa</span>
          <span style={{ color: "var(--color-text-faint)" }}>·</span>
          <span>Live chess broadcasts for African federations</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="http://127.0.0.1:3000" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent)" }}>
            ♟ Prochess Academy
          </a>
          <a href="https://lichess.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)" }}>
            Powered by Lichess
          </a>
          <a href="https://fide.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)" }}>
            FIDE
          </a>
        </div>
      </div>
    </footer>
  );
}
