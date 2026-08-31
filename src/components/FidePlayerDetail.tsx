"use client";

import { useState, useEffect } from "react";

interface Player {
  fideId: number;
  name: string;
  title?: string;
  rating: number;
  federation: string;
  school?: string;
}

interface H2HRecord {
  opponent: Player;
  wins: number;
  draws: number;
  losses: number;
  total: number;
}

export default function FidePlayerDetail({ player, allPlayers }: { player: Player; allPlayers: Player[] }) {
  const [h2hData, setH2hData] = useState<H2HRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [careerStats, setCareerStats] = useState<{ total: number; wins: number; draws: number; losses: number } | null>(null);

  useEffect(() => {
    if (!player.fideId) return;

    setLoading(true);

    // Fetch career stats
    fetch(`/api/fide/stats?id1=${player.fideId}&id2=0`)
      .then((r) => r.json())
      .then((data) => {
        if (data.stats) {
          setCareerStats({
            total: data.stats.totalGames,
            wins: data.stats.wins,
            draws: data.stats.draws,
            losses: data.stats.losses,
          });
        }
      })
      .catch(() => {
        // FIDE endpoint unavailable — show unavailable state (never fabricate stats)
        setCareerStats(null);
      });

    // Fetch top opponents' H2H records
    const opponents = allPlayers.filter((p) => p.fideId !== player.fideId).slice(0, 6);
    Promise.all(
      opponents.map((opp) =>
        fetch(`/api/fide/stats?id1=${player.fideId}&id2=${opp.fideId}`)
          .then((r) => r.json())
          .then((data) => ({
            opponent: opp,
            wins: data.stats?.wins ?? 0,
            draws: data.stats?.draws ?? 0,
            losses: data.stats?.losses ?? 0,
            total: data.stats?.totalGames ?? 0,
          }))
          .catch(() => ({
            opponent: opp,
            wins: 0,
            draws: 0,
            losses: 0,
            total: 0,
          }))
      )
    ).then((results) => {
      setH2hData(results.filter((r) => r.total > 0));
      setLoading(false);
    });
  }, [player.fideId, player.name]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="card" style={{ padding: 0 }}>
      {/* Player header */}
      <div style={{
        padding: "20px",
        background: "linear-gradient(135deg, var(--color-surface) 0%, var(--color-bg-overlay) 100%)",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: "var(--color-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
          }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L9 8H5l3 5-2 7h12l-2-7 3-5h-4L12 2z"/></svg>
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>
              {player.title && <span style={{ color: "var(--color-gold)", marginRight: 6, fontSize: 14 }}>{player.title}</span>}
              {player.name}
            </h2>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              {player.federation} · FIDE {player.fideId}
            </div>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 8,
          marginTop: 16,
        }}>
          <div style={{
            padding: "8px 12px",
            background: "var(--color-bg)",
            borderRadius: 8,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 2 }}>Classical</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{player.rating}</div>
          </div>
          <div style={{
            padding: "8px 12px",
            background: "var(--color-bg)",
            borderRadius: 8,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 2 }}>Federation</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{player.federation}</div>
          </div>
          <div style={{
            padding: "8px 12px",
            background: "var(--color-bg)",
            borderRadius: 8,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 2 }}>Career</div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)" }}>
              {careerStats ? `${careerStats.total}` : <span style={{ color: "var(--color-eval-bad)", fontSize: 13 }}>unavailable</span>}
            </div>
          </div>
        </div>

        {/* Career record */}
        {careerStats === null && (
          <div style={{
            marginTop: 12,
            padding: "10px 14px",
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.2)",
            borderRadius: 8,
            fontSize: 12,
            color: "var(--color-eval-bad)",
            textAlign: "center",
          }}>
            Career stats unavailable — FIDE endpoint unreachable. Showing rating only.
          </div>
        )}
        {careerStats && careerStats.total > 0 && (
          <div style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "center",
            gap: 16,
            fontSize: 13,
          }}>
            <span style={{ color: "var(--color-accent)", fontWeight: 600 }}>
              {careerStats.wins}W
            </span>
            <span style={{ color: "var(--color-text-muted)" }}>
              {careerStats.draws}D
            </span>
            <span style={{ color: "var(--color-eval-bad)" }}>
              {careerStats.losses}L
            </span>
            <span style={{ color: "var(--color-text-faint)" }}>
              ({careerStats.total} games)
            </span>
          </div>
        )}
      </div>

      {/* Head-to-head */}
      <div style={{ padding: "16px 20px" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
          Head-to-Head Records
        </h3>
        <p style={{ fontSize: 11, color: "var(--color-text-faint)", marginBottom: 12 }}>
          Data sourced from FIDE · {loading ? "Loading..." : "Live from FIDE endpoints"}
        </p>

        {loading ? (
          <div style={{ textAlign: "center", padding: 20, color: "var(--color-text-muted)", fontSize: 13 }}>
            Fetching head-to-head data from FIDE...
          </div>
        ) : h2hData.length > 0 ? (
          <div style={{ display: "grid", gap: 6 }}>
            {h2hData.map((h2h) => (
              <div
                key={h2h.opponent.fideId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--color-surface)",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <div>
                  <span style={{ fontWeight: 600 }}>
                    {h2h.opponent.title && (
                      <span style={{ color: "var(--color-gold)", marginRight: 4, fontSize: 11 }}>
                        {h2h.opponent.title}
                      </span>
                    )}
                    {h2h.opponent.name}
                  </span>
                </div>
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  gap: 6,
                }}>
                  <span style={{ color: "var(--color-accent)" }}>{h2h.wins}W</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{h2h.draws}D</span>
                  <span style={{ color: "var(--color-eval-bad)" }}>{h2h.losses}L</span>
                  <span style={{ color: "var(--color-text-faint)" }}>({h2h.total})</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>
            No head-to-head records found — these players may not have played each other in rated games.
          </p>
        )}
      </div>
    </div>
  );
}
