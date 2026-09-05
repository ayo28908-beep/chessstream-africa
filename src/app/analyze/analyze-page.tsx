"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import {
  Upload, Play, ArrowLeft, ArrowRight, RotateCcw, Zap, Search, FileText,
  ExternalLink, Loader2, AlertTriangle,
} from "lucide-react";

const Chessboard = dynamic(() => import("@/components/lazy-chessboard").then((m) => m.default), { ssr: false });

const EXAMPLE_PGN = `[Event "Opera Game"]
[Site "Paris Opera FRA"]
[Date "1858.11.02"]
[White "Morphy, Paul"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

interface EngineLine {
  san: string;
  evalCp?: number;
  evalMate?: number;
}

interface CloudEvalData {
  depth: number;
  knodes: number;
  lines: EngineLine[];
}

interface PastGame {
  id: string;
  white: string;
  black: string;
  result: string;
  date?: string;
  opening?: string;
  url: string;
  pgn?: string;
}

export default function AnalyzePage() {
  const [tab, setTab] = useState<"analyze" | "search">("analyze");
  const [pgnText, setPgnText] = useState("");
  const [chess, setChess] = useState<Chess | null>(null);
  const [moveIndex, setMoveIndex] = useState(-1);
  const [moves, setMoves] = useState<string[]>([]);
  const [gameMeta, setGameMeta] = useState<{ white: string; black: string; event?: string; result?: string } | null>(null);

  // Engine analysis
  const [engine, setEngine] = useState<{ fen: string; evalCp?: number; evalMate?: number; depth: number; lines: EngineLine[] } | null>(null);
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const evalRequestRef = useRef(0);

  const loadPgn = useCallback((pgn: string) => {
    try {
      const c = new Chess();
      c.loadPgn(pgn);
      const history = c.history();
      const headers = c.header();
      setMoves(history);
      setMoveIndex(-1);
      setChess(new Chess());
      setPgnText(pgn);
      setGameMeta({
        white: headers.White || "White",
        black: headers.Black || "Black",
        event: headers.Event ?? undefined,
        result: headers.Result ?? undefined,
      });
      setEngine(null);
      setEngineError(null);
      return true;
    } catch {
      return false;
    }
  }, []);

  const goToMove = useCallback(
    (index: number) => {
      if (!chess || index < -1 || index >= moves.length) return;
      const newChess = new Chess();
      for (let i = 0; i <= index; i++) newChess.move(moves[i]);
      setChess(newChess);
      setMoveIndex(index);
    },
    [chess, moves]
  );

  // Fetch engine analysis whenever the position changes
  useEffect(() => {
    if (!chess) return;
    const fen = chess.fen();
    const reqId = ++evalRequestRef.current;
    setEngineLoading(true);
    setEngineError(null);
    (async () => {
      try {
        const res = await fetch(`/api/lichess/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=3`);
        if (reqId !== evalRequestRef.current) return; // stale response
        if (!res.ok) {
          setEngine(null);
          setEngineError("Engine data not available for this position (Lichess cloud eval has no record of it).");
          return;
        }
        const data = await res.json();
        if (reqId !== evalRequestRef.current) return;
        const lines: EngineLine[] = (data.pvs || []).map((pv: { moves: string; cp?: number; mate?: number }) => ({
          san: pvToSan(fen, pv.moves),
          evalCp: pv.cp,
          evalMate: pv.mate,
        }));
        const top = data.pvs?.[0] || {};
        setEngine({
          fen,
          evalCp: top.cp,
          evalMate: top.mate,
          depth: data.depth || 0,
          lines,
        });
      } catch {
        if (reqId === evalRequestRef.current) {
          setEngine(null);
          setEngineError("Could not reach the analysis engine.");
        }
      } finally {
        if (reqId === evalRequestRef.current) setEngineLoading(false);
      }
    })();
  }, [chess]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const ok = loadPgn(text);
      if (!ok) setEngineError("Invalid PGN. Check the format and try again.");
    };
    reader.readAsText(file);
  };

  // ---------------- Past-game search ----------------
  const [searchSource, setSearchSource] = useState<"lichess" | "chesscom">("lichess");
  const [searchPlayer, setSearchPlayer] = useState("");
  const [searchResults, setSearchResults] = useState<PastGame[] | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const runGameSearch = async () => {
    if (!searchPlayer.trim()) return;
    setSearchLoading(true);
    setSearchResults(null);
    setSearchMessage(null);
    try {
      const res = await fetch(`/api/games/search?source=${searchSource}&player=${encodeURIComponent(searchPlayer.trim())}&max=25`);
      const data = await res.json();
      if (data.games && data.games.length > 0) {
        setSearchResults(data.games);
      } else {
        setSearchResults([]);
        setSearchMessage(data.message || "No games found for this player.");
      }
    } catch {
      setSearchMessage("Search failed. Try again.");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const loadSearchedGame = (game: PastGame) => {
    if (!game.pgn) return;
    const ok = loadPgn(game.pgn);
    if (ok) {
      setTab("analyze");
    } else {
      setEngineError("Could not load that game's moves.");
    }
  };

  const evalCp = engine?.evalMate !== undefined && engine.evalMate !== 0 ? (engine.evalMate > 0 ? 999 : -999) : engine?.evalCp;
  const evalText =
    engine?.evalMate !== undefined && engine.evalMate !== 0
      ? `${engine.evalMate > 0 ? "+" : "-"}M${Math.abs(engine.evalMate)}`
      : typeof evalCp === "number"
        ? `${evalCp >= 0 ? "+" : ""}${(evalCp / 100).toFixed(1)}`
        : "";
  const whitePct = typeof evalCp === "number" ? Math.round(50 + 50 * Math.tanh(evalCp / 400)) : 50;
  const clamped = Math.min(96, Math.max(4, whitePct));

  return (
    <div className="wrap" style={{ padding: "24px 0 60px" }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>Game Analyzer</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 20, fontSize: 15 }}>
        Paste a PGN, load a file, or search a player&apos;s past games, then analyze with a real chess engine.
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        <TabButton active={tab === "analyze"} onClick={() => setTab("analyze")}><Zap size={14} /> Analyze a game</TabButton>
        <TabButton active={tab === "search"} onClick={() => setTab("search")}><Search size={14} /> Search past games</TabButton>
      </div>

      {tab === "analyze" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28, alignItems: "start" }}>
          {/* Board + eval bar */}
          <div>
            {gameMeta && (
              <div style={{ marginBottom: 10, fontSize: 14 }}>
                <div style={{ fontWeight: 700 }}>{gameMeta.event || "Game"}</div>
                <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                  {gameMeta.white} vs {gameMeta.black}
                  {gameMeta.result && <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)" }}>{gameMeta.result}</span>}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10, alignItems: "stretch", maxWidth: 520 }}>
              {/* Eval bar */}
              <div style={{ width: 22, borderRadius: 6, overflow: "hidden", background: "var(--color-eval-black)", position: "relative", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${clamped}%`, background: "var(--color-eval-white)", transition: "height 0.4s ease" }} />
                <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", textAlign: "center", fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#000" }}>
                  {evalText}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <Chessboard
                  options={{ position: chess?.fen() || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", animationDurationInMs: 200 }}
                />
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "center" }}>
              <button onClick={() => goToMove(-1)} disabled={!chess || moveIndex <= -1} className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 13 }}>
                <RotateCcw size={14} />
              </button>
              <button onClick={() => goToMove(moveIndex - 1)} disabled={!chess || moveIndex <= -1} className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 13 }}>
                <ArrowLeft size={14} /> Prev
              </button>
              <button onClick={() => goToMove(moveIndex + 1)} disabled={!chess || moveIndex >= moves.length - 1} className="btn btn-primary" style={{ padding: "8px 12px", fontSize: 13 }}>
                Next <ArrowRight size={14} />
              </button>
              <button onClick={() => goToMove(moves.length - 1)} disabled={!chess || moveIndex >= moves.length - 1} className="btn btn-outline" style={{ padding: "8px 12px", fontSize: 13 }}>
                End →
              </button>
            </div>

            {/* Move list */}
            {moves.length > 0 && (
              <div style={{ marginTop: 14, padding: 14, background: "var(--color-bg-raised)", borderRadius: 8, border: "1px solid var(--color-border)", maxHeight: 180, overflowY: "auto", fontSize: 13, fontFamily: "var(--font-mono)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {moves.map((move, i) => (
                    <span key={i} onClick={() => goToMove(i)} style={{ padding: "2px 6px", borderRadius: 4, cursor: "pointer", background: i === moveIndex ? "var(--color-accent)" : "transparent", color: i === moveIndex ? "#000" : "var(--color-text)", fontWeight: i === moveIndex ? 600 : 400 }}>
                      {i % 2 === 0 && <span style={{ color: "var(--color-text-muted)", marginRight: 4 }}>{Math.floor(i / 2) + 1}.</span>}
                      {move}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* PGN input + engine panel */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Import PGN</h3>
            <textarea
              value={pgnText}
              onChange={(e) => setPgnText(e.target.value)}
              placeholder={'[Event "Game Name"]\n[White "Player 1"]\n[Black "Player 2"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 ...'}
              style={{ width: "100%", height: 170, padding: 12, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)", fontFamily: "var(--font-mono)", fontSize: 12.5, resize: "vertical", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button onClick={() => { const ok = loadPgn(pgnText); if (!ok) setEngineError("Invalid PGN. Check the format and try again."); }} className="btn btn-primary" style={{ flex: 1 }}>
                <Upload size={14} /> Load PGN
              </button>
              <label className="btn btn-outline" style={{ flex: 1, cursor: "pointer", textAlign: "center" }}>
                <Play size={14} /> Upload file
                <input type="file" accept=".pgn,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
              </label>
            </div>
            <button onClick={() => loadPgn(EXAMPLE_PGN)} className="btn btn-ghost" style={{ width: "100%", marginTop: 8, fontSize: 13 }}>
              <Zap size={14} /> Load example game
            </button>

            {/* Engine panel */}
            <div style={{ marginTop: 18, padding: 16, background: "var(--color-bg-raised)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={15} style={{ color: "var(--color-gold)" }} /> Engine analysis
                {engineLoading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }} />}
                {engine && !engineLoading && <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)" }}>depth {engine.depth}</span>}
              </h4>

              {engineError ? (
                <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", display: "flex", gap: 8, alignItems: "flex-start", lineHeight: 1.5 }}>
                  <AlertTriangle size={14} style={{ color: "var(--color-gold)", flexShrink: 0, marginTop: 1 }} /> {engineError}
                </div>
              ) : engine && engine.lines.length > 0 ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {engine.lines.map((line, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 10px", borderRadius: 6, background: i === 0 ? "var(--color-accent-muted)" : "var(--color-bg)", fontSize: 13 }}>
                      <span style={{ width: 16, color: "var(--color-text-muted)", fontWeight: 700, fontSize: 12 }}>#{i + 1}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, minWidth: 44 }}>{fmtEval(line.evalCp, line.evalMate)}</span>
                      <span style={{ flex: 1, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line.san}</span>
                    </div>
                  ))}
                </div>
              ) : chess ? (
                <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Waiting for engine analysis...</div>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>Load a game to see engine analysis.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "search" && (
        <div style={{ maxWidth: 760 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {(["lichess", "chesscom"] as const).map((s) => (
              <TabButton key={s} active={searchSource === s} onClick={() => setSearchSource(s)}>{s === "lichess" ? "Lichess" : "Chess.com"}</TabButton>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={searchPlayer}
              onChange={(e) => setSearchPlayer(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runGameSearch(); }}
              placeholder={searchSource === "lichess" ? "Lichess username, e.g. fabianocaruana" : "Chess.com username"}
              style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", color: "var(--color-text)", fontSize: 14, outline: "none" }}
            />
            <button onClick={runGameSearch} disabled={searchLoading || !searchPlayer.trim()} className="btn btn-primary" style={{ padding: "10px 20px" }}>
              {searchLoading ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <Search size={15} />} Search games
            </button>
          </div>

          {searchMessage && <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "var(--color-bg-raised)", border: "1px solid var(--color-border)", fontSize: 13.5, color: "var(--color-text-muted)" }}>{searchMessage}</div>}

          {searchResults && searchResults.length > 0 && (
            <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{searchResults.length} recent games found</div>
              {searchResults.map((g, i) => (
                <div key={g.id || i} className="card board-card" style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {g.white} <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>vs</span> {g.black}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                      {g.date && <>{g.date} · </>}{g.opening || "Game"}{g.result !== "*" && <span style={{ marginLeft: 6, fontFamily: "var(--font-mono)" }}>{g.result}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                    <button onClick={() => loadSearchedGame(g)} disabled={!g.pgn} className="btn btn-outline" style={{ padding: "6px 12px", fontSize: 12.5 }}>
                      <Play size={12} /> Analyze
                    </button>
                    {g.url && <a href={g.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-text-muted)", display: "inline-flex" }}><ExternalLink size={13} /></a>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 20, padding: 16, background: "var(--color-bg-raised)", borderRadius: 10, border: "1px solid var(--color-border)", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.7 }}>
            <FileText size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "-2px" }} />
            Some accounts keep their game history private, and Chess.com only exposes the most recent month. If a player&apos;s games can&apos;t be loaded, the message above will say so — you can still paste their PGN directly in the Analyze tab.
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid",
     
        borderColor: active ? "var(--color-accent)" : "var(--color-border)",
        background: active ? "var(--color-accent-muted)" : "transparent",
        color: active ? "var(--color-accent)" : "var(--color-text-muted)",
        fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function fmtEval(cp?: number, mate?: number): string {
  if (typeof mate === "number" && mate !== 0) return mate > 0 ? `+M${mate}` : `-M${Math.abs(mate)}`;
  if (typeof cp !== "number") return "?";
  return `${cp >= 0 ? "+" : ""}${(cp / 100).toFixed(1)}`;
}

// Convert a UCI move list from the engine into SAN for display.
function pvToSan(startFen: string, uciMoves: string): string {
  try {
    const chess = new Chess(startFen);
    const sans: string[] = [];
    for (const uci of uciMoves.split(" ").filter(Boolean).slice(0, 8)) {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const mv = chess.move({ from, to, promotion });
      sans.push(mv.san);
    }
    return sans.join(" ");
  } catch {
    return uciMoves;
  }
}
