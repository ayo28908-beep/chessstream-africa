"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import BoardCard from "./BoardCard";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AiFrequency, StreamLink } from "@/lib/tournamentConfig";

interface LichessPlayer {
  name: string;
  title?: string;
  rating?: number;
  fideId?: number;
  federation?: string;
}

interface EvalPoint {
  moveNumber: number;
  san: string;
  eval: number;
  side: "w" | "b";
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
  pgnUrl?: string;
  moves?: string[];
  evals?: EvalPoint[];
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

interface AiConfig {
  enabled: boolean;
  threshold: number;
  frequency: AiFrequency;
}

const DEFAULT_AI: AiConfig = { enabled: true, threshold: 1.0, frequency: "notable" };

export default function BroadcastViewer({
  tournamentId,
  onGamesChange,
  customSessionId,
}: {
  tournamentId?: string;
  onGamesChange?: (games: LiveGame[]) => void;
  customSessionId?: string;
}) {
  const [broadcast, setBroadcast] = useState<BroadcastSummary | null>(null);
  const [allBroadcasts, setAllBroadcasts] = useState<BroadcastSummary[]>([]);
  const [rounds, setRounds] = useState<LiveRound[]>([]);
  const [activeRoundId, setActiveRoundId] = useState<string>("");
  const [games, setGames] = useState<LiveGame[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiConfig>(DEFAULT_AI);
  const [streams, setStreams] = useState<StreamLink[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const gamesRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const isCustom = Boolean(customSessionId);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await fetch("/api/lichess/broadcasts");
      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const all: BroadcastSummary[] = [];
      if (data.featured) all.push(data.featured);
      if (data.recent) {
        for (const r of data.recent) {
          if (!all.find((b) => b.id === r.id)) all.push(r);
        }
      }

      setAllBroadcasts(all);
      setIsLive(true);

      let target = all.find((b) => b.rounds?.some((r) => r.finished));
      if (!target) target = all[0];
      if (!target && tournamentId) {
        target = { id: tournamentId, name: tournamentId, rounds: [] };
      }

      if (target) {
        setBroadcast(target);
        setRounds(target.rounds || []);

        const finishedRounds = (target.rounds || []).filter((r) => r.finished);
        const ongoing = (target.rounds || []).find((r) => r.ongoing);
        const bestRound = ongoing || finishedRounds[finishedRounds.length - 1] || (target.rounds || [])[0];

        if (bestRound) setActiveRoundId(bestRound.id);
      }
    } catch {
      setError("Unable to load broadcasts. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  const fetchRoundGames = useCallback(async (roundId: string) => {
    if (!roundId) return;
    try {
      const res = await fetch(`/api/lichess/round/${roundId}`);
      if (!res.ok) throw new Error("Round fetch error");
      const data = await res.json();
      if (data.games && data.games.length > 0) {
        setGames(data.games);
      } else {
        setGames([]);
      }
    } catch {
      // keep current data on transient failure
    }
  }, []);
  // Load per-tournament config (AI commentary settings) and stream links
  const loadTournamentExtras = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/config?tournament=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        const c = data.config;
        setAiConfig({
          enabled: c.aiCommentary !== false,
          threshold: typeof c.aiThreshold === "number" ? c.aiThreshold : 0.8,
          frequency: c.aiFrequency || "notable",
        });
      }
    } catch {
      // defaults
    }
    try {
      const res = await fetch(`/api/streams?tournament=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        setStreams(data.links || []);
      }
    } catch {
      // no streams
    }
  }, []);

  const switchBroadcast = useCallback(
    (b: BroadcastSummary) => {
      setBroadcast(b);
      setRounds(b.rounds || []);
      setShowPicker(false);
      setGames([]);
      setHighlightIndex(null);

      const finishedRounds = (b.rounds || []).filter((r) => r.finished);
      const ongoing = (b.rounds || []).find((r) => r.ongoing);
      const bestRound = ongoing || finishedRounds[finishedRounds.length - 1] || (b.rounds || [])[0];

      if (bestRound) setActiveRoundId(bestRound.id);
      loadTournamentExtras(b.id);
    },
    [loadTournamentExtras]
  );

  useEffect(() => {
    if (customSessionId) return;
    fetchBroadcasts();
  }, [fetchBroadcasts, customSessionId]);

  // When the broadcast resolves, load its config + streams
  useEffect(() => {
    if (broadcast) loadTournamentExtras(broadcast.id);
  }, [broadcast, loadTournamentExtras]);

  useEffect(() => {
    if (activeRoundId) fetchRoundGames(activeRoundId);
  }, [activeRoundId, fetchRoundGames]);

  // Report games up to the parent (used by the standings sidebar)
  useEffect(() => {
    onGamesChange?.(games);
  }, [games, onGamesChange]);

  // Poll for live updates every 15 seconds
  useEffect(() => {
    if (!isLive || !activeRoundId || activeRoundId.startsWith("r")) return;
    const interval = setInterval(() => {
      fetchRoundGames(activeRoundId);
    }, 15000);
    return () => clearInterval(interval);
  }, [isLive, activeRoundId, fetchRoundGames]);

  // Self-hosted broadcast: poll the session every 2 seconds (local PGN feeds
  // upload new moves roughly once per second, so 2s keeps boards fresh).
  useEffect(() => {
    if (!customSessionId) return;
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/selfhost/${customSessionId}`);
        if (!res.ok) {
          if (active) { setError("This broadcast no longer exists. It may have expired when the server restarted."); setLoading(false); }
          return;
        }
        const data = await res.json();
        if (!active) return;
        setError(null);
        setBroadcast({ id: data.id, name: data.name, rounds: [] });
        setIsLive(true);
        setLoading(false);
        setLastUpdated(new Date(data.updatedAt || Date.now()).toLocaleTimeString());
        if (data.source === "lichess" && data.lichessRoundId) {
          setActiveRoundId(data.lichessRoundId);
        } else {
          setGames(data.games || []);
        }
      } catch {
        if (active) { setError("Unable to load this broadcast."); setLoading(false); }
      }
    };
    load();
    const interval = setInterval(load, 2000);
    return () => { active = false; clearInterval(interval); };
  }, [customSessionId]);

  const changeRound = useCallback(
    (dir: 1 | -1) => {
      if (rounds.length < 2) return;
      const idx = rounds.findIndex((r) => r.id === activeRoundId);
      if (idx === -1) return;
      const next = rounds[(idx + dir + rounds.length) % rounds.length];
      setActiveRoundId(next.id);
    },
    [rounds, activeRoundId]
  );

  // Mobile swipe navigation:
  //   horizontal swipe -> previous/next round
  //   swipe down -> move to the next game (scrolls it into view)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;

    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      e.preventDefault();
      changeRound(dx < 0 ? 1 : -1);
      return;
    }
    if (dy > 60 && Math.abs(dy) > Math.abs(dx) * 1.5) {
      // swipe down: advance to the next game
      if (games.length > 1) {
        const next = highlightIndex === null ? 1 : (highlightIndex + 1) % games.length;
        setHighlightIndex(next);
        const cards = gamesRef.current?.querySelectorAll<HTMLElement>("[data-board]");
        const target = cards?.[next];
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };
  const currentRound = rounds.find((r) => r.id === activeRoundId);

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {!isCustom && (
      <>
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
              width: 8, height: 8, borderRadius: "50%",
              background: isLive ? "var(--color-live)" : "var(--color-text-muted)",
              animation: isLive ? "pulse 1.5s ease-in-out infinite" : "none",
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{broadcast?.name || "Loading broadcasts..."}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {broadcast?.location}
              {broadcast?.tier && broadcast.tier >= 4 && <span style={{ marginLeft: 8, color: "var(--color-gold)" }}>★ Tier {broadcast.tier}</span>}
              {broadcast?.rounds && <span style={{ marginLeft: 8 }}>{broadcast.rounds.length} rounds</span>}
            </div>
          </div>
          {allBroadcasts.length > 1 && (
            <span style={{ fontSize: 12, color: "var(--color-text-muted)", padding: "4px 8px", borderRadius: 4, background: "var(--color-bg)" }}>
              {allBroadcasts.length} tournaments ▾
            </span>
          )}
          {isLive && <span style={{ fontSize: 10, color: "var(--color-live)", fontWeight: 600 }}>● LIVE</span>}
        </div>

        {showPicker && allBroadcasts.length > 0 && (
          <div style={{ marginTop: 4, borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", maxHeight: 300, overflowY: "auto" }}>
            {allBroadcasts.map((b) => {
              const finishedCount = b.rounds?.filter((r) => r.finished).length || 0;
              const isActive = b.id === broadcast?.id;
              return (
                <div
                  key={b.id}
                  onClick={() => switchBroadcast(b)}
                  style={{
                    padding: "10px 16px", borderBottom: "1px solid var(--color-border)",
                    cursor: "pointer", background: isActive ? "var(--color-accent-muted)" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: isActive ? 700 : 500, fontSize: 13 }}>{b.name}</div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {b.tier && b.tier >= 4 && <span style={{ fontSize: 11, color: "var(--color-gold)" }}>★{b.tier}</span>}
                      <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{finishedCount}/{b.rounds?.length || 0} rounds</span>
                    </div>
                  </div>
                  {b.location && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{b.location}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      </>
      )}

      {!isCustom && (
      <>
      {/* Round selector with prev/next swipe buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12 }}>
        <button
          onClick={() => changeRound(-1)}
          disabled={rounds.length < 2}
          className="btn btn-ghost"
          style={{ padding: "6px 8px", flexShrink: 0 }}
          aria-label="Previous round"
        >
          <ChevronLeft size={16} />
        </button>
        <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4, flex: 1 }}>
          {rounds.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRoundId(r.id)}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "1px solid",
                borderColor: activeRoundId === r.id ? "var(--color-accent)" : "var(--color-border)",
                background: activeRoundId === r.id ? "var(--color-accent-muted)" : "transparent",
                color: activeRoundId === r.id ? "var(--color-accent)" : "var(--color-text-muted)",
                fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {r.name}
              {r.ongoing && <span style={{ marginLeft: 4, color: "var(--color-live)", fontSize: 10 }}>●</span>}
              {r.finished && <span style={{ marginLeft: 4, opacity: 0.5 }}>✓</span>}
            </button>
          ))}
        </div>
        <button
          onClick={() => changeRound(1)}
          disabled={rounds.length < 2}
          className="btn btn-ghost"
          style={{ padding: "6px 8px", flexShrink: 0 }}
          aria-label="Next round"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      </>
      )}

      {isCustom && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, fontSize: 13, color: "var(--color-text-muted)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-live)", animation: "pulse 1.5s ease-in-out infinite" }} />
            <b style={{ color: "var(--color-text)" }}>{broadcast?.name || "Live broadcast"}</b>
            <span>{games.length} boards</span>
            {lastUpdated && <span>updated {lastUpdated}</span>}
          </span>
          <span style={{ fontSize: 11, color: "var(--color-live)", fontWeight: 700 }}>LIVE</span>
        </div>
      )}
      {/* View toggle + swipe hint */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", display: "flex", gap: 6, alignItems: "center" }}>
          {currentRound && (
            <>
              <span style={{ fontWeight: 600 }}>{currentRound.name}</span>
              <span>·</span>
              <span>{games.length} boards</span>
              {currentRound.ongoing && (
                <>
                  <span>·</span>
                  <span style={{ color: "var(--color-live)", fontWeight: 600 }}>In progress</span>
                </>
              )}
            </>
          )}
          <span style={{ fontSize: 10, color: "var(--color-text-faint)", display: "none" }} className="swipe-hint">
            Swipe ↔ rounds · Swipe ↓ next game
          </span>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <button
            onClick={() => setView("grid")}
            style={{
              padding: "6px 10px", borderRadius: 6, border: "1px solid",
              borderColor: view === "grid" ? "var(--color-accent)" : "var(--color-border)",
              background: view === "grid" ? "var(--color-accent-muted)" : "transparent",
              color: view === "grid" ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: 13, cursor: "pointer",
            }}
            aria-label="Grid view"
          >
            ⊞
          </button>
          <button
            onClick={() => setView("list")}
            style={{
              padding: "6px 10px", borderRadius: 6, border: "1px solid",
              borderColor: view === "list" ? "var(--color-accent)" : "var(--color-border)",
              background: view === "list" ? "var(--color-accent-muted)" : "transparent",
              color: view === "list" ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: 13, cursor: "pointer",
            }}
            aria-label="List view"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Board grid */}
      <div
        ref={gamesRef}
        style={{
          display: "grid",
          gridTemplateColumns: view === "grid" ? "repeat(auto-fill, minmax(300px, 1fr))" : "1fr",
          gap: 12,
          touchAction: "pan-y",
        }}
      >
        {games.map((game, i) => (
          <div
            key={game.id}
            data-board={i}
            style={{
              outline: highlightIndex === i ? "2px solid var(--color-gold)" : "none",
              borderRadius: 12,
            }}
          >
            <BoardCard
              game={game}
              boardNumber={i + 1}
              view={view}
              aiConfig={aiConfig}
              streams={streams}
            />
          </div>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--color-text-muted)" }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-accent-muted)", animation: "pulse 1.5s ease-in-out infinite" }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Loading live broadcasts...</div>
          <div style={{ fontSize: 13 }}>Connecting to Lichess</div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 12, color: "var(--color-text-muted)" }}>
          <div style={{ marginBottom: 8, color: "var(--color-eval-bad)", fontSize: 22, fontWeight: 800 }}>!</div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4, color: "var(--color-eval-bad)" }}>Connection failed</div>
          <div style={{ fontSize: 13 }}>{error}</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && games.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No games in this round</div>
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
