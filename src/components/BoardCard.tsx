"use client";

import { useState } from "react";
import EvalBar from "./EvalBar";
import BoardChat from "./BoardChat";
import AiCommentary from "./AiCommentary";
import { Video, ExternalLink } from "lucide-react";
import type { EvalPoint } from "@/lib/commentary";
import type { AiFrequency, StreamLink } from "@/lib/tournamentConfig";

interface Player {
  name: string;
  rating?: number;
  title?: string;
  fideId?: number;
  federation?: string;
}

interface Game {
  id: string;
  white: Player;
  black: Player;
  fen: string;
  status: string;
  result?: string;
  eval?: number;
  lastMove?: string;
  moveCount?: number;
  opening?: string;
  eco?: string;
  pgnUrl?: string;
  moves?: string[];
  evals?: EvalPoint[];
}

export default function BoardCard({
  game,
  boardNumber,
  view,
  aiConfig,
  streams,
}: {
  game: Game;
  boardNumber: number;
  view: "grid" | "list";
  aiConfig?: { enabled: boolean; threshold: number; frequency: AiFrequency };
  streams?: StreamLink[];
}) {
  const [showChat, setShowChat] = useState(false);

  const evalScore = game.eval ?? 0;
  const isGrid = view === "grid";
  const isFinished = game.status !== "in-progress";

  // Streams attached to this board or to the whole tournament
  const boardStreams = (streams || []).filter(
    (s) => s.board === "All boards" || s.board === `Board ${boardNumber}`
  );

  return (
    <div className="card board-card" style={{ position: "relative" }}>
      <div style={{ display: isGrid ? "block" : "flex" }}>
        {/* Board + eval bar container */}
        <div style={{ display: "flex", position: "relative" }}>
          <EvalBar
            eval_={evalScore}
            vertical={!isGrid}
            style={{
              width: isGrid ? 100 : 48,
              height: isGrid ? 100 : "auto",
              minHeight: isGrid ? undefined : 200,
            }}
          />

          {/* Chessboard from FEN */}
          <div
            style={{
              flex: 1,
              aspectRatio: "1",
              maxHeight: isGrid ? 220 : 220,
              background: "var(--color-surface)",
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gridTemplateRows: "repeat(8, 1fr)",
              borderRight: "1px solid var(--color-border)",
              position: "relative",
            }}
          >
            {renderBoardFromFEN(game.fen)}

            {isFinished && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(2px)",
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "white",
                    textShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    padding: "6px 16px",
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.4)",
                  }}
                >
                  {game.result || game.status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Info panel */}
        <div
          style={{
            padding: "10px 14px",
            borderTop: isGrid ? "1px solid var(--color-border)" : "none",
            ...(isGrid
              ? {}
              : { flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }),
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-faint)", letterSpacing: 1, textTransform: "uppercase" }}>
              Board {boardNumber}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {game.eco && (
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)", background: "var(--color-surface)", padding: "1px 5px", borderRadius: 3 }}>
                  {game.eco}
                </span>
              )}
              {evalScore !== 0 && (
                <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "var(--font-mono)", color: evalScore > 0 ? "var(--color-eval-good)" : evalScore < 0 ? "var(--color-eval-bad)" : "var(--color-text-muted)" }}>
                  {evalScore > 0 ? "+" : ""}
                  {evalScore.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {game.opening && (
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 6, fontStyle: "italic" }}>
              {game.opening}
            </div>
          )}

          <PlayerRow player={game.white} color="w" result={game.result} />
          <PlayerRow player={game.black} color="b" result={game.result} />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--color-text-muted)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
            {game.moveCount !== undefined && <span>{Math.ceil(game.moveCount / 2)} moves</span>}
            {game.lastMove && <span>Last: <strong>{game.lastMove}</strong></span>}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
            <button onClick={() => setShowChat(!showChat)} className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px", flex: 1 }}>
              Chat
            </button>
            {game.pgnUrl ? (
              <a href={game.pgnUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px", flex: 1, textAlign: "center", textDecoration: "none" }}>
                Lichess <ExternalLink size={11} />
              </a>
            ) : (
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px", flex: 1 }}>
                Analysis
              </button>
            )}
            {boardStreams.length > 0 && (
              <a
                href={boardStreams[0].url}
                target="_blank"
                rel="noopener noreferrer"
                title={boardStreams[0].title}
                style={{
                  display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700,
                  color: "var(--color-live)", padding: "4px 8px", borderRadius: 4,
                  background: "var(--color-live-muted)", textDecoration: "none",
                }}
              >
                <Video size={11} /> LIVE
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Move commentary (real engine-eval based, per-tournament config) */}
      {aiConfig?.enabled && (game.evals?.length || 0) >= 2 && (
        <AiCommentary
          evals={game.evals || []}
          whiteName={game.white.name}
          blackName={game.black.name}
          enabled={aiConfig.enabled}
          threshold={aiConfig.threshold}
          frequency={aiConfig.frequency}
        />
      )}

      {/* Per-board chat */}
      {showChat && <BoardChat gameId={game.id} onClose={() => setShowChat(false)} />}
    </div>
  );
}

function PlayerRow({ player, color, result }: { player: Player; color: "w" | "b"; result?: string }) {
  const isWinner = (color === "w" && result === "1-0") || (color === "b" && result === "0-1");
  const isLoser = (color === "w" && result === "0-1") || (color === "b" && result === "1-0");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--color-border-muted)" }}>
      <div style={{ width: 14, height: 14, borderRadius: 3, background: color === "w" ? "#f0f0f0" : "#1a1a2e", border: "1px solid var(--color-border)", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: isWinner ? 700 : 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: isWinner ? "var(--color-live)" : isLoser ? "var(--color-text-muted)" : "var(--color-text)" }}>
          {player.title && <span style={{ color: "var(--color-gold)", marginRight: 4, fontSize: 11 }}>{player.title}</span>}
          {player.name}
          {isWinner && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
        </div>
      </div>
      {player.rating && (
        <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
          {player.rating}
        </span>
      )}
    </div>
  );
}

function renderBoardFromFEN(fen: string) {
  const PIECES: Record<string, string> = {
    k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F",
    K: "\u2654", Q: "\u2655", R: "\u2656", B: "\u2657", N: "\u2658", P: "\u2659",
  };

  const position = fen.split(" ")[0];
  const rows = position.split("/");
  const cells: React.ReactNode[] = [];

  for (let r = 0; r < 8; r++) {
    let col = 0;
    for (const ch of rows[r]) {
      if (ch >= "1" && ch <= "8") {
        for (let i = 0; i < parseInt(ch); i++) {
          const isLight = (r + col) % 2 === 0;
          cells.push(
            <div key={`${r}-${col}`} style={{ background: isLight ? "#769656" : "#eeeed2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(14px, 2.5vw, 24px)", lineHeight: 1, userSelect: "none" }} />
          );
          col++;
        }
      } else {
        const isLight = (r + col) % 2 === 0;
        cells.push(
          <div key={`${r}-${col}`} style={{ background: isLight ? "#769656" : "#eeeed2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "clamp(14px, 2.5vw, 24px)", lineHeight: 1, userSelect: "none" }}>
            {PIECES[ch] || ""}
          </div>
        );
        col++;
      }
    }
  }

  return cells;
}
