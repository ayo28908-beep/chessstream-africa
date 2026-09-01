import { Metadata } from "next";
import Link from "next/link";
import { Zap, ExternalLink, Globe, Users, Tv } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "About ChessStream Africa — live chess broadcasting for African tournaments and federations.",
  openGraph: {
    title: "About | ChessStream Africa",
    description: "Live chess broadcasting for African tournaments and federations.",
  },
};

export default function AboutPage() {
  return (
    <div className="wrap" style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>About ChessStream Africa</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 32, fontSize: 16, maxWidth: 640 }}>
        The definitive platform for live chess broadcasting across Africa.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 48 }}>
        <div className="card" style={{ padding: 24 }}>
          <Zap size={24} style={{ color: "var(--color-accent)", marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Real-time Broadcasting</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14, lineHeight: 1.6 }}>
            Live boards, moves, and evaluations from tournaments across Africa, powered by Lichess.
          </p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <Tv size={24} style={{ color: "var(--color-gold)", marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Built for Africa</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14, lineHeight: 1.6 }}>
            Designed specifically for African chess federations and schools, not a generic streaming platform.
          </p>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <Users size={24} style={{ color: "var(--color-accent)", marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Free for All</h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14, lineHeight: 1.6 }}>
            Free to watch, free to broadcast. Making chess accessible to everyone.
          </p>
        </div>
      </div>

      <div className="card" style={{ padding: 32, marginBottom: 32 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Our Mission</h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1.8, marginBottom: 16 }}>
          ChessStream Africa was created to give African chess tournaments the same level of broadcast quality 
          that top-level events in Europe and Asia receive. Every move, every board, every player — live and accessible.
        </p>
        <p style={{ color: "var(--color-text-muted)", fontSize: 16, lineHeight: 1.8 }}>
          We pull real-time game data from Lichess broadcasts and present it in a clean, modern interface. 
          Whether you&apos;re a federation looking to broadcast your event, or a fan wanting to follow your favorite player, 
          ChessStream Africa is built for you.
        </p>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link href="/broadcasts" className="btn btn-primary">
          Watch Broadcasts
        </Link>
        <Link href="https://prochess-lovat.vercel.app" target="_blank" rel="noopener noreferrer" className="btn btn-outline">
          Prochess Academy <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
