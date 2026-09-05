"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Swords, X, ExternalLink, RefreshCw, ChevronRight } from "lucide-react";

// ---------- Shared types ----------
interface LichessHit {
  source: "lichess"; username: string; title?: string;
  ratings?: { bullet?: number; blitz?: number; rapid?: number; classical?: number };
  games?: number; win?: number; draw?: number; loss?: number; url: string;
}
interface ChessComHit {
  source: "chesscom"; username: string; name?: string; title?: string;
  country?: string; followers?: number; status?: string; avatar?: string; url: string;
}
interface FideHit {
  source: "fide"; fideId: number; name: string; federation?: string;
  title?: string; standard?: number; rapid?: number; blitz?: number; url: string;
}
type PlayerHit = LichessHit | ChessComHit | FideHit;
type SourceKey = "lichess" | "chesscom" | "fide";

interface SlotIdentities {
  lichess?: LichessHit;
  chesscom?: ChessComHit;
  fide?: FideHit;
}

interface H2HResponse {
  player1: { lichess?: string; chesscom?: string; fide?: number };
  player2: { lichess?: string; chesscom?: string; fide?: number };
  lichess: { games: { white: string; black: string; result: string; url: string; date?: string; opening?: string }[]; error?: string };
  fide: { stats: { totalGames: number; wins: number; draws: number; losses: number } | null; error?: string };
  chesscom: { supported: boolean; note: string };
}

const SOURCES: { key: SourceKey; label: string; hint: string }[] = [
  { key: "lichess", label: "Lichess", hint: "Search every player on Lichess" },
  { key: "chesscom", label: "Chess.com", hint: "Enter a Chess.com username (no name search exists there)" },
  { key: "fide", label: "FIDE", hint: "FIDE-rated players from the official rating list" },
];

// ---------- Main component ----------
function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";

  const [slots, setSlots] = useState<[SlotIdentities, SlotIdentities]>([{}, {}]);
  const [terms, setTerms] = useState<[string, string]>(["", ""]);
  const [results, setResults] = useState<[PlayerHit[] | null, PlayerHit[] | null]>([null, null]);
  const [searching, setSearching] = useState<[boolean, boolean]>([false, false]);
  const [errors, setErrors] = useState<[string | null, string | null]>([null, null]);
  const [h2h, setH2h] = useState<H2HResponse | null>(null);
  const [h2hLoading, setH2hLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    const vs = q.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
    if (vs) setTerms([vs[1].trim(), vs[2].trim()]);
    else setTerms([q.trim(), ""]);
  }, [q]);

  const setSlot = useCallback((index: 0 | 1, source: SourceKey, hit: PlayerHit) => {
    setSlots((prev) => {
      const next: [SlotIdentities, SlotIdentities] = [{ ...prev[0] }, { ...prev[1] }];
      next[index] = { ...next[index], [source]: hit };
      return next;
    });
    setResults((prev) => {
      const next: [PlayerHit[] | null, PlayerHit[] | null] = [...prev] as [PlayerHit[] | null, PlayerHit[] | null];
      next[index] = null;
      return next;
    });
    setH2h(null);
  }, []);

  const removeSlot = useCallback((index: 0 | 1, source: SourceKey) => {
    setSlots((prev) => {
      const next: [SlotIdentities, SlotIdentities] = [{ ...prev[0] }, { ...prev[1] }];
      delete next[index][source];
      return next;
    });
    setH2h(null);
  }, []);

  const runSearch = useCallback(async (index: 0 | 1, source: SourceKey, term: string) => {
    if (!term.trim()) return;
    setSearching((prev) => { const n: [boolean, boolean] = [...prev] as [boolean, boolean]; n[index] = true; return n; });
    setErrors((prev) => { const n: [string | null, string | null] = [...prev] as [string | null, string | null]; n[index] = null; return n; });
    try {
      const res = await fetch(`/api/search?source=${source}&term=${encodeURIComponent(term)}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setResults((prev) => {
          const n: [PlayerHit[] | null, PlayerHit[] | null] = [...prev] as [PlayerHit[] | null, PlayerHit[] | null];
          n[index] = data.results;
          return n;
        });
      } else {
        setErrors((prev) => {
          const n: [string | null, string | null] = [...prev] as [string | null, string | null];
          n[index] = source === "fide" && !data.indexLoaded
            ? "No FIDE matches. The full FIDE list is not synced on this server yet."
            : `No ${source} players found for "${term}".`;
          return n;
        });
        setResults((prev) => { const n: [PlayerHit[] | null, PlayerHit[] | null] = [...prev] as [PlayerHit[] | null, PlayerHit[] | null]; n[index] = null; return n; });
      }
    } catch {
      setErrors((prev) => { const n: [string | null, string | null] = [...prev] as [string | null, string | null]; n[index] = "Search failed. Try again."; return n; });
    } finally {
      setSearching((prev) => { const n: [boolean, boolean] = [...prev] as [boolean, boolean]; n[index] = false; return n; });
    }
  }, []);

  const compare = useCallback(async () => {
    const toIds = (slot: SlotIdentities) => ({
      lichess: slot.lichess?.username,
      chesscom: slot.chesscom?.username,
      fide: slot.fide?.fideId,
    });
    const p1 = toIds(slots[0]);
    const p2 = toIds(slots[1]);
    if (!Object.values(p1).some(Boolean) || !Object.values(p2).some(Boolean)) return;
    setH2hLoading(true);
    setH2h(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player1: p1, player2: p2 }),
      });
      setH2h(await res.json());
    } catch {
      setH2h({
        player1: p1, player2: p2,
        lichess: { games: [], error: "Could not reach the comparison service." },
        fide: { stats: null }, chesscom: { supported: false, note: "" },
      });
    } finally {
      setH2hLoading(false);
    }
  }, [slots]);

  const swap = useCallback(() => {
    setSlots((prev) => [{ ...prev[1] }, { ...prev[0] }]);
    setTerms((prev) => [prev[1], prev[0]]);
    setH2h(null);
  }, []);

  return (
    <div className="wrap" style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
        <Swords size={28} style={{ display: "inline", marginRight: 8, color: "var(--color-gold)" }} />Head-to-Head
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 28, fontSize: 15 }}>
        Pick two players from Lichess, Chess.com or FIDE and compare their record.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "start" }}>
        <PlayerPicker
          index={0}
          term={terms[0]}
          setTerm={(t) => setTerms((prev) => [t, prev[1]])}
          slot={slots[0]}
          results={results[0]}
          searching={searching[0]}
          error={errors[0]}
          onSearch={runSearch}
          onPick={setSlot}
          onRemove={removeSlot}
        />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, paddingTop: 120 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: "var(--color-gold)" }}>VS</div>
          <button onClick={swap} className="btn btn-ghost" style={{ fontSize: 12, padding: "6px 10px" }} title="Swap players">
            <RefreshCw size={13} /> Swap
          </button>
        </div>

        <PlayerPicker
          index={1}
          term={terms[1]}
          setTerm={(t) => setTerms((prev) => [prev[0], t])}
          slot={slots[1]}
          results={results[1]}
          searching={searching[1]}
          error={errors[1]}
          onSearch={runSearch}
          onPick={setSlot}
          onRemove={removeSlot}
        />
      </div>

      <div style={{ textAlign: "center", marginTop: 24 }}>
        <button
          onClick={compare}
          disabled={h2hLoading || !Object.values(slots[0]).some(Boolean) || !Object.values(slots[1]).some(Boolean)}
          className="btn btn-primary"
          style={{ padding: "12px 32px", fontSize: 15 }}
        >
          {h2hLoading ? "Comparing..." : <>Compare Head-to-Head <ChevronRight size={16} /></>}
        </button>
      </div>

      {h2h && <H2HPanel h2h={h2h} />}
    </div>
  );
}

// ---------- PlayerPicker ----------
function PlayerPicker({
  index, term, setTerm, slot, results, searching, error, onSearch, onPick, onRemove,
}: {
  index: 0 | 1;
  term: string;
  setTerm: (t: string) => void;
  slot: SlotIdentities;
  results: PlayerHit[] | null;
  searching: boolean;
  error: string | null;
  onSearch: (index: 0 | 1, source: SourceKey, term: string) => void;
  onPick: (index: 0 | 1, source: SourceKey, hit: PlayerHit) => void;
  onRemove: (index: 0 | 1, source: SourceKey) => void;
}) {
  const [tab, setTab] = useState<SourceKey>("lichess");

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 10 }}>
        Player {index + 1}
      </div>

      {/* Source tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {SOURCES.map((s) => (
          <button
            key={s.key}
            onClick={() => { setTab(s.key); setTerm(""); }}
            style={{
              padding: "6px 12px", borderRadius: 6, border: "1px solid",
              borderColor: tab === s.key ? "var(--color-accent)" : "var(--color-border)",
              background: tab === s.key ? "var(--color-accent-muted)" : "transparent",
              color: tab === s.key ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11.5, color: "var(--color-text-faint)", marginBottom: 8 }}>
        {SOURCES.find((s) => s.key === tab)?.hint}
      </div>

      {/* Search box */}
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSearch(index, tab, term); }}
          placeholder={tab === "fide" ? "Player name or FIDE ID..." : tab === "chesscom" ? "Chess.com username..." : "Player name..."}
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
            background: "var(--color-bg)", color: "var(--color-text)", fontSize: 14, outline: "none",
          }}
        />
        <button
          onClick={() => onSearch(index, tab, term)}
          disabled={searching || !term.trim()}
          className="btn btn-primary"
          style={{ padding: "8px 14px", fontSize: 13 }}
        >
          {searching ? "..." : "Search"}
        </button>
      </div>

      {/* Results */}
      {error && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--color-eval-bad)", padding: 8, background: "rgba(218,54,51,0.08)", borderRadius: 6 }}>{error}</div>}
      {results && results.length > 0 && (
        <div style={{ marginTop: 10, maxHeight: 240, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: 8 }}>
          {results.map((hit, i) => (
            <HitRow key={`${tab}-${i}`} hit={hit} onPick={() => onPick(index, tab, hit)} />
          ))}
        </div>
      )}

      {/* Chosen identities */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {SOURCES.map((s) => {
          const hit = slot[s.key];
          if (!hit) return null;
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "var(--color-accent-muted)", borderRadius: 6, fontSize: 13 }}>
              <span style={{ fontWeight: 700, color: "var(--color-accent)", fontSize: 11, textTransform: "uppercase" }}>{s.label}</span>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName(hit)}</span>
              <a href={hit.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)", display: "inline-flex" }} title="Open profile">
                <ExternalLink size={13} />
              </a>
              <button onClick={() => onRemove(index, s.key)} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: 2 }} title="Remove">
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function displayName(hit: PlayerHit): string {
  if (hit.source === "lichess") return hit.username;
  if (hit.source === "chesscom") return hit.name ? `${hit.name} (@${hit.username})` : `@${hit.username}`;
  return hit.name;
}

// ---------- HitRow ----------
function HitRow({ hit, onPick }: { hit: PlayerHit; onPick: () => void }) {
  return (
    <div
      onClick={onPick}
      style={{ padding: "10px 12px", borderBottom: "1px solid var(--color-border)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {hit.source === "lichess" && <>{(hit as LichessHit).title ? `${(hit as LichessHit).title} ` : ""}{(hit as LichessHit).username}</>}
          {hit.source === "chesscom" && <>{(hit as ChessComHit).title ? `${(hit as ChessComHit).title} ` : ""}{displayName(hit)}</>}
          {hit.source === "fide" && <>{(hit as FideHit).title ? `${(hit as FideHit).title} ` : ""}{hit.name}</>}
        </div>
        <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
          {hit.source === "lichess" && (
            <>Rapid {ratingOr("rapid", hit)} · Blitz {ratingOr("blitz", hit)} · {hit.games} games</>
          )}
          {hit.source === "chesscom" && (
            <>{(hit as ChessComHit).country || "Chess.com"} {(hit as ChessComHit).followers ? `· ${(hit as ChessComHit).followers} followers` : ""}</>
          )}
          {hit.source === "fide" && (
            <>{(hit as FideHit).federation || ""} {(hit as FideHit).standard ? `· Std ${(hit as FideHit).standard}` : ""} {(hit as FideHit).rapid ? `· Rpd ${(hit as FideHit).rapid}` : ""} {(hit as FideHit).blitz ? `· Blz ${(hit as FideHit).blitz}` : ""} · FIDE {(hit as FideHit).fideId}</>
          )}
        </div>
      </div>
      <span style={{ fontSize: 12, color: "var(--color-accent)", flexShrink: 0 }}>Select</span>
    </div>
  );
}

function ratingOr(key: "rapid" | "blitz", hit: LichessHit): string {
  const v = hit.ratings?.[key];
  return v ? String(v) : "-";
}

// ---------- H2H Panel ----------
function H2HPanel({ h2h }: { h2h: H2HResponse }) {
  const games = h2h.lichess.games || [];
  const bothLichess = Boolean(h2h.player1.lichess && h2h.player2.lichess);
  const p1Name = h2h.player1.lichess || h2h.player1.chesscom || String(h2h.player1.fide || "Player 1");
  const p2Name = h2h.player2.lichess || h2h.player2.chesscom || String(h2h.player2.fide || "Player 2");

  const p1Wins = games.filter((g) => (g.white === p1Name && g.result === "1-0") || (g.black === p1Name && g.result === "0-1")).length;
  const p2Wins = games.filter((g) => (g.white === p2Name && g.result === "1-0") || (g.black === p2Name && g.result === "0-1")).length;
  const draws = games.length - p1Wins - p2Wins;

  return (
    <div style={{ marginTop: 32 }}>
      {/* Lichess scoreboard */}
      <div className="card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Lichess record</h2>
        {games.length > 0 ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ textAlign: "center", fontWeight: 700 }}>{p1Name}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "var(--color-gold)", fontFamily: "var(--font-mono)" }}>
                {p1Wins} - {draws} - {p2Wins}
              </div>
              <div style={{ textAlign: "center", fontWeight: 700 }}>{p2Name}</div>
            </div>
            <div style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>{games.length} games found</div>
            <div style={{ display: "grid", gap: 8 }}>
              {games.map((g, i) => (
                <a key={i} href={g.url} target="_blank" rel="noopener noreferrer" className="card board-card" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, minWidth: 0 }}>
                    <span style={{ fontWeight: g.result === "1-0" ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.white}</span>
                    <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>vs</span>
                    <span style={{ fontWeight: g.result === "0-1" ? 700 : 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.black}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {g.date && <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{g.date}</span>}
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13 }}>{g.result}</span>
                    <ExternalLink size={12} style={{ color: "var(--color-text-muted)" }} />
                  </div>
                </a>
              ))}
            </div>
          </>
        ) : (
          <div style={{ padding: 20, background: "var(--color-bg-raised)", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13.5, color: "var(--color-text-muted)" }}>
            {h2h.lichess.error || (bothLichess ? "No recorded games found between these players on Lichess." : "Add a Lichess identity for both players to see their games.")}
          </div>
        )}
      </div>

      {/* FIDE + Chess.com rows */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>FIDE official record</h3>
          {h2h.fide.stats ? (
            <div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "var(--color-gold)", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
                {h2h.fide.stats.wins} - {h2h.fide.stats.draws} - {h2h.fide.stats.losses}
              </div>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{h2h.fide.stats.totalGames} rated games from official FIDE records</div>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
              {h2h.fide.error || "Add a FIDE identity for both players to compare official records."}
            </div>
          )}
        </div>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Chess.com</h3>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {h2h.chesscom.note || "Chess.com does not expose head-to-head records publicly."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<div className="wrap" style={{ padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
