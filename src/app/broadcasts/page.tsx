import Link from "next/link";
import BroadcastViewer from "@/components/BroadcastViewer";

export const metadata = {
  title: "Live Broadcasts — ChessStream Africa",
  description: "Watch live chess broadcasts from tournaments around the world. Every board, every move, real-time.",
};

interface BroadcastEntry {
  id: string;
  name: string;
  location?: string;
  tier?: number;
  dates?: number[];
  roundCount?: number;
}

async function fetchBroadcasts(): Promise<{ featured: Record<string, unknown> | null; recent: BroadcastEntry[] }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/lichess/broadcasts`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return { featured: null, recent: [] };
    const data = await res.json();
    return { featured: data.featured || null, recent: data.recent || [] };
  } catch {
    return { featured: null, recent: [] };
  }
}

function formatDate(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TierBadge({ tier }: { tier?: number }) {
  if (!tier || tier < 3) return null;
  const colors: Record<number, string> = {
    3: "var(--color-text-muted)",
    4: "var(--color-gold)",
    5: "#f59e0b",
  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, color: colors[tier] || "var(--color-text-muted)",
      padding: "1px 6px", borderRadius: 3,
      border: `1px solid ${colors[tier] || "var(--color-border)"}`,
    }}>
      T{tier}
    </span>
  );
}

export default async function BroadcastsPage() {
  const { featured, recent } = await fetchBroadcasts();

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Live Broadcasts</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
          Watch tournaments in real-time — every board, every move, powered by Lichess.
        </p>
      </div>

      {/* Live Now section */}
      <section style={{ marginBottom: 48 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--color-live)",
            animation: "pulse 1.5s ease-in-out infinite",
          }} />
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Live Now</h2>
        </div>
        <BroadcastViewer />
      </section>

      {/* Recent broadcasts */}
      {recent.length > 0 && (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Broadcasts</h2>
          <div style={{ display: "grid", gap: 2 }}>
            {recent.slice(0, 20).map((b) => (
              <Link
                key={b.id}
                href={`/broadcasts/${b.id}`}
                className="card"
                style={{
                  padding: "14px 20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  borderRadius: 0,
                  borderLeft: "none",
                  borderRight: "none",
                  textDecoration: "none",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{b.name}</span>
                    <TierBadge tier={b.tier} />
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
                    {b.location && <span>{b.location}</span>}
                    {b.dates?.[0] && <span> · {formatDate(b.dates[0])}</span>}
                    {b.roundCount && b.roundCount > 0 && <span> · {b.roundCount} rounds</span>}
                  </div>
                </div>
                <span className="chip chip-finished" style={{ fontSize: 11 }}>
                  View →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state for recent */}
      {recent.length === 0 && (
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Broadcasts</h2>
          <div className="card" style={{ padding: "40px 20px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>♟</div>
            <div>Broadcast data loads from Lichess in real-time.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Check back during major tournaments.</div>
          </div>
        </section>
      )}
    </div>
  );
}
