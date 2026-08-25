import Link from "next/link";
import type { BroadcastTournament } from "@/lib/lichess";

function getStartDate(dates?: BroadcastTournament["dates"]): number | undefined {
  if (!dates) return undefined;
  if (Array.isArray(dates)) return dates[0];
  return dates.start;
}

export default function BroadcastCard({ tournament }: { tournament: BroadcastTournament }) {
  const isLive = tournament.tier && tournament.tier >= 1;
  const now = Date.now();
  const startDate = getStartDate(tournament.dates);
  const isUpcoming = startDate && startDate > now;

  return (
    <Link
      href={`/broadcasts/${tournament.id}`}
      className="card board-card"
      style={{ padding: 0, cursor: "pointer" }}
    >
      {/* Thumbnail area */}
      <div style={{
        height: 120,
        background: `linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg-overlay) 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}>
        <span style={{ fontSize: 48, opacity: 0.3 }}>♟</span>
        {tournament.official && (
          <span style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "var(--color-accent-muted)",
            color: "var(--color-accent)",
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 4,
          }}>
            OFFICIAL
          </span>
        )}
        {tournament.tier && tournament.tier >= 1 && (
          <span className="chip chip-live" style={{ position: "absolute", top: 10, left: 10 }}>
            LIVE
          </span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: "14px 16px" }}>
        <h3 style={{
          fontSize: 15,
          fontWeight: 700,
          lineHeight: 1.3,
          marginBottom: 6,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {tournament.name}
        </h3>

        {tournament.description && (
          <p style={{
            fontSize: 12.5,
            color: "var(--color-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 10,
          }}>
            {tournament.description}
          </p>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
          {startDate && (
            <span>{new Date(startDate).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}</span>
          )}
          {tournament.tier && (
            <>
              <span>·</span>
              <span style={{ color: "var(--color-gold)" }}>Tier {tournament.tier}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
