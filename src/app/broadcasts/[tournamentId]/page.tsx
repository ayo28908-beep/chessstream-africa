import Link from "next/link";
import BroadcastViewer from "@/components/BroadcastViewer";
import StandingsPanel from "@/components/StandingsPanel";
import StreamerPanel from "@/components/StreamerPanel";

export function generateMetadata({ params }: { params: Promise<{ tournamentId: string }> }) {
  // We need to handle this asynchronously for Next.js 15+
  return {
    title: "Tournament",
    description: "Live chess broadcast on ChessStream Africa",
  };
}

export default async function BroadcastDetailPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const { tournamentId } = await params;

  // In production, fetch tournament data from Lichess API
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

      {/* Main layout: boards + sidebar */}
      <div className="wrap" style={{
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 20,
        alignItems: "start",
      }}>
        {/* Boards */}
        <div>
          <BroadcastViewer tournamentId={tournamentId} />
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 72 }}>
          <StreamerPanel />
          <StandingsPanel />
        </div>
      </div>
    </div>
  );
}
