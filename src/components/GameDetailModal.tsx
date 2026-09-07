"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import { X, ArrowLeft, ArrowRight, RotateCcw, ChevronsRight, ExternalLink, Zap, Loader2, Video, MessageSquare } from "lucide-react";
import { normalizeUciCastle } from "@/lib/utils";
import BoardChat from "./BoardChat";
import type { EvalPoint } from "@/lib/commentary";
import type { StreamLink } from "@/lib/tournamentConfig";

const Chessboard = dynamic(() => import("@/components/lazy-chessboard").then((m) => m.default), { ssr: false });

interface Player {
  name: string;
  rating?: number;
  title?: string;
  fideId?: number;
  federation?: string;
}

export interface DetailGame {
  id: string;
  white: Player;
  black: Player;
  fen: string;
  result: string;
  status: string;
  eval?: number;
  lastMove?: string;
  moveCount?: number;
  opening?: string;
  eco?: string;
  pgnUrl?: string;
  moves?: string[];
  evals?: EvalPoint[];
}

interface EngineLine {
  san: string;
  evalCp?: number;
  evalMate?: number;
}

export default function GameDetailModal({
  game,
  boardNumber,
  chatId,
  streams,
  onClose,
}: {
  game: DetailGame;
  boardNumber: number;
  chatId: string;
  streams?: StreamLink[];
  onClose: () => void;
}) {
  const moves = useMemo(() => game.moves || [], [game.moves]);
  const [moveIndex, setMoveIndex] = useState(moves.length - 1);
  const [showChat, setShowChat] = useState(false);

  // Rebuild the position whenever the selected move changes.
  const position = useMemo(() => {
    if (moves.length === 0) return game.fen;
    try {
      const c = new Chess();
      const upto = Math.min(moveIndex, moves.length - 1);
      for (let i = 0; i <= upto; i++) c.move(moves[i]);
      return c.fen();
    } catch {
      return game.fen;
    }
  }, [moves, moveIndex, game.fen]);

  // Engine analysis for the shown position.
  const [engine, setEngine] = useState<{ fen: string; evalCp?: number; evalMate?: number; depth: number; lines: EngineLine[] } | null>(null);
  const [engineLoading, setEngineLoading] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setEngineLoading(true);
    setEngineError(null);
    (async () => {
      try {
        const res = await fetch(`/api/lichess/cloud-eval?fen=${encodeURIComponent(position)}&multiPv=3`);
        if (reqId !== reqIdRef.current) return;
        if (!res.ok) {
          setEngine(null);
          setEngineError("No engine data for this exact position.");
          return;
        }
        const data = await res.json();
        if (reqId !== reqIdRef.current) return;
        const lines: EngineLine[] = (data.pvs || []).map((pv: { moves: string; cp?: number; mate?: number }) => ({
          san: pvToSan(position, pv.moves),
          evalCp: pv.cp,
          evalMate: pv.mate,
        }));
        const top = data.pvs?.[0] || {};
        setEngine({ fen: position, evalCp: top.cp, evalMate: top.mate, depth: data.depth || 0, lines });
      } catch {
        if (reqId === reqIdRef.current) {
          setEngine(null);
          setEngineError("Could not reach the analysis engine.");
        }
      } finally {
        if (reqId === reqIdRef.current) setEngineLoading(false);
      }
    })();
  }, [position]);

  const showEval = engine && engine.fen === position && !engineLoading;
  const evalCp = showEval && engine.evalMate !== undefined && engine.evalMate !== 0
    ? (engine.evalMate > 0 ? 999 : -999)
    : showEval ? engine.evalCp : undefined;
  const evalText =
    showEval && engine.evalMate !== undefined && engine.evalMate !== 0
      ? `${engine.evalMate > 0 ? "+" : "-"}M${Math.abs(engine.evalMate)}`
      : typeof evalCp === "number"
        ? `${evalCp >= 0 ? "+" : ""}${(evalCp / 100).toFixed(1)}`
        : "";
  const whitePct = typeof evalCp === "number" ? Math.round(50 + 50 * Math.tanh(evalCp / 400)) : 50;
  const clamped = Math.min(96, Math.max(4, whitePct));

  const boardStreams = (streams || []).filter(
    (s) => s.board === "All boards" || s.board === `Board ${boardNumber}`
  );

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.75)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 980, width: "100%", padding: 0, maxHeight: "92vh", overflowY: "auto", position: "relative" }}
      >
        {/* Header */}
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-faint)", letterSpacing: 1, textTransform: "uppercase" }}>Board {boardNumber}</span>
              <span className="chip chip-live">LIVE</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>
              {game.white.title ? `${game.white.title} ` : ""}{game.white.name}
              <span style={{ color: "var(--color-text-muted)", fontSize: 12, margin: "0 8px" }}>vs</span>
              {game.black.title ? `${game.black.title} ` : ""}{game.black.name}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 2 }}>
              {game.opening || "Game"}{game.eco ? ` · ${game.eco}` : ""}
              {game.result && game.result !== "*" && <span style={{ marginLeft: 8, fontFamily: "var(--font-mono)", fontWeight: 700 }}>{game.result}</span>}
              {moves.length > 0 && <span style={{ marginLeft: 8 }}>{Math.ceil(moves.length / 2)} moves</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {game.pgnUrl && (
              <a href={game.pgnUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12, textDecoration: "none" }}>
                Lichess <ExternalLink size={12} />
              </a>
            )}
            <button onClick={onClose} className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 14 }} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ padding: 20, display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 420px)", gap: 20, alignItems: "start" }}>
          {/* Board + eval */}
          <div>
            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <div style={{ width: 22, borderRadius: 6, overflow: "hidden", background: "var(--color-eval-black)", position: "relative", flexShrink: 0 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${clamped}%`, background: "var(--color-eval-white)", transition: "height 0.4s ease" }} />
                <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", textAlign: "center", fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)", color: "#000" }}>
                  {evalText}
                </div>
              </div>
              <div style={{ flex: 1, maxWidth: 460 }}>
                <Chessboard
                  options={{
                    position: position,
                    animationDurationInMs: 150,
                    allowDragging: false,
                  }}
                />
              </div>
            </div>

            {/* Move controls */}
            <div style={{ display: "flex", gap: 6, marginTop: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setMoveIndex(-1)} disabled={moveIndex <= -1} className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }} title="Start"><RotateCcw size={13} /></button>
              <button onClick={() => setMoveIndex((i) => Math.max(-1, i - 1))} disabled={moveIndex <= -1} className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }}><ArrowLeft size={13} /> Prev</button>
              <button onClick={() => setMoveIndex((i) => Math.min(moves.length - 1, i + 1))} disabled={moves.length === 0 || moveIndex >= moves.length - 1} className="btn btn-primary" style={{ padding: "6px 10px", fontSize: 12 }}>Next <ArrowRight size={13} /></button>
              <button onClick={() => setMoveIndex(moves.length - 1)} disabled={moves.length === 0 || moveIndex >= moves.length - 1} className="btn btn-outline" style={{ padding: "6px 10px", fontSize: 12 }}>End <ChevronsRight size={13} /></button>
            </div>

            {/* Move list */}
            {moves.length > 0 && (
              <div style={{ marginTop: 12, padding: 12, background: "var(--color-bg-raised)", borderRadius: 8, border: "1px solid var(--color-border)", maxHeight: 200, overflowY: "auto", fontSize: 13, fontFamily: "var(--font-mono)" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {moves.map((move, i) => {
                    const evalPoint = game.evals?.find((e) => e.san === move);
                    return (
                      <span
                        key={i}
                        onClick={() => setMoveIndex(i)}
                        style={{
                          padding: "2px 6px", borderRadius: 4, cursor: "pointer",
                          background: i === moveIndex ? "var(--color-accent)" : "transparent",
                          color: i === moveIndex ? "#000" : "var(--color-text)",
                          fontWeight: i === moveIndex ? 700 : 400,
                        }}
                        title={evalPoint ? `${evalPoint.eval > 0 ? "+" : ""}${evalPoint.eval.toFixed(1)}` : undefined}
                      >
                        {i % 2 === 0 && <span style={{ color: "var(--color-text-muted)", marginRight: 3 }}>{Math.floor(i / 2) + 1}.</span>}
                        {move}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stream embed for this board */}
            {boardStreams.length > 0 && (
              <div style={{ marginTop: 14 }}>
                {boardStreams.slice(0, 1).map((s) => (
                  <StreamEmbed key={s.id} link={s} />
                ))}
              </div>
            )}
          </div>

          {/* Right column: engine + chat */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: 14, background: "var(--color-bg-raised)", borderRadius: 10, border: "1px solid var(--color-border)" }}>
              <h4 style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={14} style={{ color: "var(--color-gold)" }} /> Engine analysis
                {engineLoading && <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: "var(--color-text-muted)" }} />}
                {showEval && !engineLoading && <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)" }}>depth {engine.depth}</span>}
              </h4>
              {engineError ? (
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{engineError}</div>
              ) : showEval && engine.lines.length > 0 ? (
                <div style={{ display: "grid", gap: 5 }}>
                  {engine.lines.map((line, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 8px", borderRadius: 6, background: i === 0 ? "var(--color-accent-muted)" : "var(--color-bg)", fontSize: 12.5 }}>
                      <span style={{ width: 14, color: "var(--color-text-muted)", fontWeight: 700, fontSize: 11 }}>#{i + 1}</span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, minWidth: 40 }}>{fmtEval(line.evalCp, line.evalMate)}</span>
                      <span style={{ flex: 1, fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{line.san}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Waiting for engine analysis...</div>
              )}
            </div>

            <button
              onClick={() => setShowChat((s) => !s)}
              className="btn btn-outline"
              style={{ padding: "10px", fontSize: 13.5, justifyContent: "center", display: "flex", alignItems: "center", gap: 6 }}
            >
              <MessageSquare size={14} /> {showChat ? "Hide board chat" : "Discuss this board"}
            </button>
            {showChat && <BoardChat gameId={chatId} onClose={() => setShowChat(false)} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtEval(cp?: number, mate?: number): string {
  if (typeof mate === "number" && mate !== 0) return mate > 0 ? `+M${mate}` : `-M${Math.abs(mate)}`;
  if (typeof cp !== "number") return "?";
  return `${cp >= 0 ? "+" : ""}${(cp / 100).toFixed(1)}`;
}

function pvToSan(startFen: string, uciMoves: string): string {
  try {
    const chess = new Chess(startFen);
    const sans: string[] = [];
    for (const uci of uciMoves.split(" ").filter(Boolean).slice(0, 8)) {
      const { from, to } = normalizeUciCastle(uci.slice(0, 2), uci.slice(2, 4));
      const promotion = uci.length > 4 ? uci[4] : undefined;
      const mv = chess.move({ from: from as never, to: to as never, promotion });
      sans.push(mv.san);
    }
    return sans.join(" ");
  } catch {
    return uciMoves;
  }
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

function extractTwitchChannel(url: string): string | null {
  const m = url.match(/twitch\.tv\/([\w-]+)/);
  return m ? m[1] : null;
}

function StreamEmbed({ link }: { link: StreamLink }) {
  const ytId = extractYouTubeId(link.url);
  const twitchChannel = extractTwitchChannel(link.url);
  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 8 }}>
        <Video size={14} style={{ color: "var(--color-live)" }} />
        <span style={{ fontSize: 13, fontWeight: 700 }}>{link.title}</span>
      </div>
      {ytId ? (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title={link.title}
          style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : twitchChannel ? (
        <iframe
          src={`https://player.twitch.tv/?channel=${twitchChannel}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}`}
          title={link.title}
          style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
          allowFullScreen
        />
      ) : (
        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: 14, fontSize: 13, color: "var(--color-accent)" }}>
          <ExternalLink size={14} /> Open stream in new tab
        </a>
      )}
    </div>
  );
}