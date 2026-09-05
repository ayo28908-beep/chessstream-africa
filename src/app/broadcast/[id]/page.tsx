import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCustomBroadcast } from "@/lib/customBroadcast";
import BroadcastDetailClient from "@/components/BroadcastDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const session = getCustomBroadcast(id);
  return {
    title: session ? `${session.name} | Live Broadcast` : "Broadcast",
    description: `Live chess broadcast: ${session?.name || "a tournament"} on ChessStream Africa. Real-time boards, eval bars, and standings.`,
    alternates: { canonical: `/broadcast/${id}` },
  };
}

export default async function BroadcastPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getCustomBroadcast(id);
  if (!session) notFound();

  const details = session.details;
  const meta = [
    details.format,
    details.rounds ? `${details.rounds} rounds` : null,
    details.timeControl,
    details.startDate ? new Date(details.startDate).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : null,
    details.venue,
    details.country,
  ].filter(Boolean);

  return (
    <div style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div className="wrap" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)" }}>
          <Link href="/broadcasts" style={{ color: "var(--color-text-muted)" }}>Broadcasts</Link>
          <span>›</span>
          <Link href="/setup" style={{ color: "var(--color-text-muted)" }}>Set Up</Link>
          <span>›</span>
          <span style={{ color: "var(--color-text)" }}>{session.name}</span>
        </div>
      </div>

      <div className="wrap" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{session.name}</h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
              ChessStream Africa · {meta.join(" · ") || "Live broadcast"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="chip chip-live">LIVE</span>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {session.source === "lichess" ? "Lichess source" : "DGT PGN source"}
            </span>
          </div>
        </div>
      </div>

      <BroadcastDetailClient customSessionId={id} tournamentId={id} tournamentName={session.name} />
    </div>
  );
}
