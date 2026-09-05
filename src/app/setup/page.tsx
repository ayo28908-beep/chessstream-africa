import type { Metadata } from "next";
import Link from "next/link";
import SetupClient from "./setup-client";

export const metadata: Metadata = {
  title: "Set Up Your Broadcast",
  description: "Broadcast your own chess tournament on ChessStream Africa. Live boards from a DGT board PGN file or a Lichess broadcast, with standings, commentary, and analysis.",
  alternates: { canonical: "/setup" },
  openGraph: {
    title: "Set Up Your Broadcast | ChessStream Africa",
    description: "Broadcast your own tournament live with ChessStream Africa.",
  },
};

export default function SetupPage() {
  return (
    <div>
      <div className="wrap" style={{ paddingTop: 24 }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
          <Link href="/" style={{ color: "var(--color-text-muted)" }}>Home</Link>
          <span>›</span>
          <Link href="/broadcasts" style={{ color: "var(--color-text-muted)" }}>Broadcasts</Link>
          <span>›</span>
          <span style={{ color: "var(--color-text)" }}>Set Up Your Broadcast</span>
        </nav>
      </div>
      <SetupClient />
    </div>
  );
}
