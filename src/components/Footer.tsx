import Link from "next/link";
import { Zap, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--color-border)", padding: "24px 0", marginTop: 80 }}>
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={16} style={{ color: "var(--color-accent)" }} />
            <span style={{ fontWeight: 700, color: "var(--color-text)" }}>ChessStream Africa</span>
            <span style={{ color: "var(--color-text-faint)" }}>·</span>
            <span>Live chess broadcasts for African federations</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <Link href="/broadcasts" style={{ color: "var(--color-text-muted)" }}>Broadcasts</Link>
            <Link href="/schools" style={{ color: "var(--color-text-muted)" }}>Schools</Link>
            <Link href="/about" style={{ color: "var(--color-text-muted)" }}>About</Link>
            <Link
              href="https://prochess-v2-ashen.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 4 }}
            >
              Prochess Academy <ExternalLink size={12} />
            </Link>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, borderTop: "1px solid var(--color-border-muted)", paddingTop: 14, fontSize: 12, color: "var(--color-text-faint)" }}>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/privacy" style={{ color: "var(--color-text-faint)" }}>Privacy</Link>
            <Link href="/terms" style={{ color: "var(--color-text-faint)" }}>Terms</Link>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span>Powered by <a href="https://prochess-v2-ashen.vercel.app" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-accent)", fontWeight: 700 }}>Prochess</a></span>
            <a href="https://lichess.org" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-faint)" }}>Broadcast data via Lichess</a>
            <a href="https://fide.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-faint)" }}>FIDE</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
