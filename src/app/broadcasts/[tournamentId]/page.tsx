import type { Metadata } from "next";
import Link from "next/link";
import BroadcastDetailClient from "@/components/BroadcastDetailClient";

export function generateMetadata({ params }: { params: Promise<{ tournamentId: string }> }): Metadata {
  const tournamentId = "";
  return {
    title: "Tournament Broadcast",
    description: "Live chess broadcast on ChessStream Africa with per-board commentary, standings, and analysis.",
    alternates: { canonical: `/broadcasts/${tournamentId}` },
  };
}

export default async function BroadcastDetailPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;

  const tournamentName = tournamentId
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div style={{ paddingTop: 32, paddingBottom: 60 }}>
      {/* Breadcrumb */}
      <div className="wrap" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)" }}>
          <Link href="/broadcasts" style={{ color: "var(--color-text-muted)" }}>Broadcasts</Link>
          <span>›</span>
          <span style={{ color: "var(--color-text)" }}>{tournamentName}</span>
        </div>
      </div>

      {/* Tournament header */}
      <div className="wrap" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{tournamentName}</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
              ChessStream Africa · Live broadcast
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="chip chip-live">LIVE</span>
          </div>
        </div>
      </div>

      <BroadcastDetailClient tournamentId={tournamentId} tournamentName={tournamentName} />
    </div>
  );
}
