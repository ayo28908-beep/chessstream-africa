"use client";

import { useState, useEffect, useCallback } from "react";
import BoardCard from "./BoardCard";

interface LichessPlayer {
  name: string;
  title?: string;
  rating?: number;
  fideId?: number;
  federation?: string;
}

interface LiveGame {
  id: string;
  white: LichessPlayer;
  black: LichessPlayer;
  fen: string;
  result: string;
  eval: number;
  lastMove?: string;
  moveCount: number;
  status: string;
  opening?: string;
  eco?: string;
}

interface LiveRound {
  id: string;
  name: string;
  slug?: string;
  finished?: boolean;
  ongoing?: boolean;
  nbGames?: number;
}

interface BroadcastSummary {
  id: string;
  name: string;
  slug?: string;
  location?: string;
  players?: string;
  tier?: number;
  image?: string;
  url?: string;
  dates?: number[];
  rounds: LiveRound[];
  defaultRoundId?: string;
  roundCount?: number;
}

// Demo data for when Lichess API is unavailable
const DEMO_GAMES: LiveGame[] = [
  { id: "1", white: { name: "Abdulraheem, A.", rating: 2316, title: "FM", fideId: 8510001 }, black: { name: "Kigigha, B.", rating: 2287, title: "FM", fideId: 8510002 }, fen: "r1bqkb1r/pppppppp/2n2n2/8/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 2 3", status: "in-progress", eval: 0.3, lastMove: "e4", moveCount: 5, result: "*" },
  { id: "2", white: { name: "Anwuli, D.", rating: 2325, title: "IM", fideId: 8510003 }, black: { name: "Adebayo, A.", rating: 2272, fideId: 8510004 }, fen: "rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", status: "in-progress", eval: -0.2, lastMove: "Bc4", moveCount: 7, result: "*" },
  { id: "3", white: { name: "Lapite, O.", rating: 2228, fideId: 8510005 }, black: { name: "Ekunke, O.", rating: 2280, title: "FM", fideId: 8510006 }, fen: "r1bqkbnr/pppppppp/2n5/8/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", status: "in-progress", eval: 0.1, lastMove: "Nf6", moveCount: 3, result: "*" },
  { id: "4", white: { name: "Eyenuke, T.", rating: 2256, fideId: 8510007 }, black: { name: "Adeyemi, O.", rating: 2248, fideId: 8510008 }, fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1", status: "in-progress", eval: 0.0, lastMove: "d4", moveCount: 1, result: "*" },
  { id: "5", white: { name: "Aikhoje, O.", rating: 2246, fideId: 8510009 }, black: { name: "Akintoye, B.", rating: 2220, fideId: 8510010 }, fen: "rnbqkbnr/pppppppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", status: "in-progress", eval: 0.15, lastMove: "e5", moveCount: 2, result: "*" },
  { id: "6", white: { name: "Sorungbe, A.", rating: 2228, fideId: 8510011 }, black: { name: "Olape, B.", rating: 2186, fideId: 8510012 }, fen: "r1bqkbnr/pppppppp/2n5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 1 2", status: "in-progress", eval: 0.4, lastMove: "Nc6", moveCount: 2, result: "*" },
];

const DEMO_ROUNDS: LiveRound[] = [
  { id: "r1", name: "Round 1", finished: true, nbGames: 6 },
  { id: "r2", name: "Round 2", finished: true, nbGames: 6 },
  { id: "r3", name: "Round 3", finished: true, nbGames: 6 },
  { id: "r4", name: "Round 4", finished: true, nbGames: 6 },
  { id: "r5", name: "Round 5", ongoing: true, nbGames: 6 },
  { id: "r6", name: "Round 6", nbGames: 6 },
  { id: "r7", name: "Round 7", nbGames: 6 },
  { id: "r8", name: "Round 8", nbGames: 6 },
  { id: "r9", name: "Round 9", nbGames: 6 },
  { id: "r10", name: "Round 10", nbGames: 6 },
];

export default function BroadcastViewer({ tournamentId }: { tournamentId?: string }) {
  const [broadcast, setBroadcast] = useState<BroadcastSummary | null>(null);
  const [allBroadcasts, setAllBroadcasts] = useState<BroadcastSummary[]>([]);
  const [rounds, setRounds] = useState<LiveRound[]>(DEMO_ROUNDS);
  const [activeRoundId, setActiveRoundId] = useState<string>("r5");
  const [games, setGames] = useState<LiveGame[]>(DEMO_GAMES);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isLive, setIsLive] = useState(false);
  const [dataSource, setDataSource] = useState<"live" | "demo">("demo");
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Fetch broadcast list from Lichess
  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await fetch("/api/lichess/broadcasts");
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      // Build list of all broadcasts — featured first, then recent
      const all: BroadcastSummary[] = [];
      if (data.featured) {
        all.push(data.featured);
      }
      if (data.recent) {
        for (const r of data.recent) {
          if (!all.find((b) => b.id === r.id)) {
            all.push(r);
          }
        }
      }

      setAllBroadcasts(all);
      setDataSource("live");
      setIsLive(true);

      // Pick the best broadcast: one with finished rounds (nbGames is unreliable in the list endpoint)
      let target = all.find((b) => b.rounds?.some((r) => r.finished));
      if (!target) target = all[0];

      if (target) {
        setBroadcast(target);
        setRounds(target.rounds || []);

        // Pick the best round: prefer last finished round (likely has games)
        const finishedRounds = (target.rounds || []).filter((r) => r.finished);
        const ongoing = (target.rounds || []).find((r) => r.ongoing);
        const bestRound = ongoing || finishedRounds[finishedRounds.length - 1] || (target.rounds || [])[0];

        if (bestRound) {
          setActiveRoundId(bestRound.id);
        }
      }
    } catch {
      console.log("Lichess API unavailable, using demo data");
      setDataSource("demo");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch games for a specific round
  const fetchRoundGames = useCallback(async (roundId: string) => {
    if (!roundId || roundId.startsWith("r")) return; // demo round

    try {
      const res = await fetch(`/api/lichess/round/${roundId}`);
      if (!res.ok) throw new Error("Round fetch error");
      const data = await res.json();

      if (data.games && data.games.length > 0) {
        setGames(data.games);
        setDataSource("live");
      } else {
        // Round exists but has no games yet — clear the board area
        setGames([]);
      }
    } catch {
      console.log("Round fetch failed, keeping current data");
    }
  }, []);

  // Switch to a different broadcast
  const switchBroadcast = useCallback(
    (b: BroadcastSummary) => {
      setBroadcast(b);
      setRounds(b.rounds || []);
      setShowPicker(false);
      setGames([]); // clear while loading

      // Pick best round
      const finishedRounds = (b.rounds || []).filter((r) => r.finished);
      const ongoing = (b.rounds || []).find((r) => r.ongoing);
      const bestRound = ongoing || finishedRounds[finishedRounds.length - 1] || (b.rounds || [])[0];

      if (bestRound) {
        setActiveRoundId(bestRound.id);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  // Fetch games when round changes
  useEffect(() => {
    if (activeRoundId && !activeRoundId.startsWith("r")) {
      fetchRoundGames(activeRoundId);
    }
  }, [activeRoundId, fetchRoundGames]);

  // Poll for live updates every 15 seconds (only for live data)
  useEffect(() => {
    if (dataSource !== "live" || !activeRoundId || activeRoundId.startsWith("r")) return;

    const interval = setInterval(() => {
      fetchRoundGames(activeRoundId);
    }, 15000);
    return () => clearInterval(interval);
  }, [dataSource, activeRoundId, fetchRoundGames]);

  // Find current round info
  const currentRound = rounds.find((r) => r.id === activeRoundId);
  const liveGameCount = games.filter((g) => g.status === "in-progress").length;

  return (
    <div>
      {/* Broadcast picker */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            borderRadius: 8,
            background: "var(--color-surface)",
            border: `1px solid ${showPicker ? "var(--color-accent)" : "var(--color-border)"}`,
            cursor: "pointer",
          }}
          onClick={() => setShowPicker((s) => !s)}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isLive ? "var(--color-live)" : "var(--color-text-muted)",
              animation: isLive ? "pulse 1.5s ease-in-out infinite" : "none",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              {broadcast?.name || "Loading broadcasts..."}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {broadcast?.location}
              {broadcast?.tier && broadcast.tier >= 4 && (
                <span style={{ marginLeft: 8, color: "var(--color-gold)" }}>
                  ★ Tier {broadcast.tier}
                </span>
              )}
              {broadcast?.rounds && (
                <span style={{ marginLeft: 8 }}>
                  {broadcast.rounds.length} rounds
                </span>
              )}
            </div>
          </div>
          {allBroadcasts.length > 1 && (
            <span
              style={{
                fontSize: 12,
                color: "var(--color-text-muted)",
                padding: "4px 8px",
                borderRadius: 4,
                background: "var(--color-bg)",
              }}
            >
              {allBroadcasts.length} tournaments ▾
            </span>
          )}
          {dataSource === "live" && (
            <span
              style={{
                fontSize: 10,
                color: "var(--color-live)",
                fontWeight: 600,
              }}
            >
              ● LIVE
            </span>
          )}
        </div>

        {/* Broadcast dropdown */}
        {showPicker && allBroadcasts.length > 0 && (
          <div
            style={{
              marginTop: 4,
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              maxHeight: 300,
              overflowY: "auto",
            }}
          >
            {allBroadcasts.map((b) => {
              const finishedCount = b.rounds?.filter((r) => r.finished).length || 0;
              const isActive = b.id === broadcast?.id;
              return (
                <div
                  key={b.id}
                  onClick={() => switchBroadcast(b)}
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--color-border)",
                    cursor: "pointer",
                    background: isActive ? "var(--color-accent-muted)" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--color-bg)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: isActive ? 700 : 500, fontSize: 13 }}>
                      {b.name}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {b.tier && b.tier >= 4 && (
                        <span style={{ fontSize: 11, color: "var(--color-gold)" }}>
                          ★{b.tier}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        {finishedCount}/{b.rounds?.length || 0} rounds
                      </span>
                    </div>
                  </div>
                  {b.location && (
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                      📍 {b.location}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Round selector */}
      <div
        style={{
          display: "flex",
          gap: 4,
          marginBottom: 20,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {rounds.map((r) => (
          <button
            key={r.id}
            onClick={() => setActiveRoundId(r.id)}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid",
              borderColor:
                activeRoundId === r.id
                  ? "var(--color-accent)"
                  : "var(--color-border)",
              background:
                activeRoundId === r.id
                  ? "var(--color-accent-muted)"
                  : "transparent",
              color:
                activeRoundId === r.id
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            {r.name}
            {r.ongoing && (
              <span
                style={{
                  marginLeft: 4,
                  color: "var(--color-live)",
                  fontSize: 10,
                }}
              >
                ●
              </span>
            )}
            {r.finished && (
              <span style={{ marginLeft: 4, opacity: 0.5 }}>✓</span>
            )}
          </button>
        ))}

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          <button
            onClick={() => setView("grid")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid",
              borderColor:
                view === "grid" ? "var(--color-accent)" : "var(--color-border)",
              background:
                view === "grid" ? "var(--color-accent-muted)" : "transparent",
              color:
                view === "grid" ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ⊞
          </button>
          <button
            onClick={() => setView("list")}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid",
              borderColor:
                view === "list" ? "var(--color-accent)" : "var(--color-border)",
              background:
                view === "list" ? "var(--color-accent-muted)" : "transparent",
              color:
                view === "list" ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Current round info */}
      {currentRound && (
        <div
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            marginBottom: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 600 }}>{currentRound.name}</span>
          <span>·</span>
          <span>{games.length} boards</span>
          {currentRound.ongoing && (
            <>
              <span>·</span>
              <span style={{ color: "var(--color-live)", fontWeight: 600 }}>
                In progress
              </span>
            </>
          )}
          {dataSource === "live" && (
            <span
              style={{
                fontSize: 10,
                color: "var(--color-live)",
                fontWeight: 600,
                marginLeft: "auto",
              }}
            >
              ● LIVE DATA
            </span>
          )}
        </div>
      )}

      {/* Board grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            view === "grid"
              ? "repeat(auto-fill, minmax(300px, 1fr))"
              : "1fr",
          gap: 12,
        }}
      >
        {games.map((game, i) => (
          <BoardCard key={game.id} game={game} boardNumber={i + 1} view={view} />
        ))}
      </div>

      {/* Empty state */}
      {!loading && games.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--color-text-muted)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>♟</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            No games in this round
          </div>
          <div style={{ fontSize: 13 }}>
            {allBroadcasts.length > 1
              ? "Try selecting a different tournament or round from above"
              : "Select a different round or check back later"}
          </div>
        </div>
      )}
    </div>
  );
}
