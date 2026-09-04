import Link from "next/link";
import { Zap, ExternalLink } from "lucide-react";

export default function Footer() {
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
          <Zap size={16} style={{ color: "var(--color-accent)" }} />
          <span style={{ fontWeight: 700, color: "var(--color-text)" }}>ChessStream Africa</span>
          <span style={{ color: "var(--color-text-faint)" }}>·</span>
          <span>Live chess broadcasts for African federations</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <Link
            href="https://prochess-v2-ashen.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-accent)", display: "flex", alignItems: "center", gap: 4 }}
          >
            Prochess Academy <ExternalLink size={12} />
          </Link>
          <a
            href="https://lichess.org"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-text-muted)" }}
          >
            Powered by Lichess
          </a>
          <a
            href="https://fide.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-text-muted)" }}
          >
            FIDE
          </a>
        </div>
      </div>
    </footer>
  );
}
