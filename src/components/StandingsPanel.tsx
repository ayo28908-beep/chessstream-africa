"use client";

import { useMemo } from "react";
import { Trophy, Info } from "lucide-react";
import { computeStandings, type StandingGame, type StandingRow } from "@/lib/standings";
import type { TiebreakSystem } from "@/lib/tournamentConfig";

const TIEBREAK_LABEL: Record<TiebreakSystem, string> = {
  "sonneborn-berger": "Sonneborn-Berger",
  buchholz: "Buchholz",
  "direct-encounter": "Direct Encounter",
  "most-wins": "Most Wins",
};

export default function StandingsPanel({
  games,
  tiebreakSystem = "sonneborn-berger",
  qualificationSpots = 4,
}: {
  games: StandingGame[];
  tiebreakSystem?: TiebreakSystem;
  qualificationSpots?: number;
}) {
  const standings = useMemo(
    () => computeStandings(games, tiebreakSystem, qualificationSpots),
    [games, tiebreakSystem, qualificationSpots]
  );

  // Qualification scenarios for players near the cut line
  const scenarios = useMemo(() => {
    if (standings.length === 0 || qualificationSpots >= standings.length) return [];
    const cutPoints = standings[Math.min(qualificationSpots, standings.length) - 1].points;
    return standings
      .filter((r) => !r.qualifies && r.points >= cutPoints - 1)
      .map((r) => ({
        name: r.name,
        points: r.points,
        cutPoints,
        gap: Math.round((cutPoints - r.points) * 2) / 2,
      }));
  }, [standings, qualificationSpots]);

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Trophy size={14} style={{ color: "var(--color-gold)" }} /> Standings
        </h3>
        <span style={{ fontSize: 10, color: "var(--color-text-faint)" }}>
          {TIEBREAK_LABEL[tiebreakSystem]}
        </span>
      </div>

      {standings.length === 0 ? (
        <div style={{ padding: 28, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
          Standings appear once round results are available.
          <div style={{ fontSize: 11, color: "var(--color-text-faint)", marginTop: 6 }}>
            Tiebreak: {TIEBREAK_LABEL[tiebreakSystem]} · Top {qualificationSpots} qualify
          </div>
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: "var(--color-text-faint)", fontSize: 10.5, textTransform: "uppercase", letterSpacing: 0.4 }}>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>#</th>
                <th style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600 }}>Player</th>
                <th style={{ padding: "6px 6px", textAlign: "center", fontWeight: 600 }}>Pts</th>
                <th style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>{tiebreakSystem === "most-wins" ? "Wins" : "TB"}</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row) => (
                <StandingRow row={row} key={row.name} cutLine={qualificationSpots} />
              ))}
            </tbody>
          </table>

          {/* Qualification scenarios */}
          {scenarios.length > 0 && (
            <div style={{ borderTop: "1px solid var(--color-border)", padding: "12px 16px", background: "var(--color-bg-overlay)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                <Info size={12} /> Qualification scenarios
              </div>
              <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
                {scenarios.map((s) => (
                  <div key={s.name} style={{ color: "var(--color-text-muted)", lineHeight: 1.45 }}>
                    <strong style={{ color: "var(--color-text)" }}>{s.name}</strong> is {s.gap === 0.5 ? "half a point" : `${s.gap} point${s.gap === 1 ? "" : "s"}`} behind the qualification line.
                    {s.gap <= 0.5
                      ? " A win in the next round would likely secure qualification."
                      : " Needs a strong result in the remaining rounds to qualify."}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-faint)", marginTop: 8 }}>
                Scenarios based on results from the loaded round. Top {qualificationSpots} qualify.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StandingRow({ row, cutLine }: { row: StandingRow; cutLine: number }) {
  return (
    <tr style={{ background: row.qualifies ? "rgba(46,160,67,0.08)" : "transparent", borderTop: "1px solid var(--color-border-muted)" }}>
      <td style={{ padding: "6px 10px", color: row.qualifies ? "var(--color-accent)" : "var(--color-text-muted)", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
        {row.rank}
        {row.rank === cutLine && <span style={{ color: "var(--color-gold)", marginLeft: 2 }}>▸</span>}
      </td>
      <td style={{ padding: "6px 10px", fontWeight: row.qualifies ? 700 : 500, color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
        {row.name}
      </td>
      <td style={{ padding: "6px 6px", textAlign: "center", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
        {row.points}
      </td>
      <td style={{ padding: "6px 10px", textAlign: "right", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>
        {row.tiebreak}
      </td>
    </tr>
  );
}
