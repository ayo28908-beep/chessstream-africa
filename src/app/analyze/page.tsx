"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import {
  Upload,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  Zap,
  AlertCircle,
} from "lucide-react";

const Chessboard = dynamic(() => import("react-chessboard").then(m => m.Chessboard), { ssr: false });

// Example PGNs the user can try
const EXAMPLE_PGN = `[Event "2026 Grand Chess Tour Finals"]
[Site "Saint Louis"]
[Date "2026.08.29"]
[Round "1"]
[White "Caruana, Fabiano"]
[Black "Praggnanandhaa, R"]
[Result "1-0"]

1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O 9.h3 Nb8 10.d4 Nbd7 11.Nbd2 Bb7 12.Bc2 Re8 13.Nf1 Bf8 14.Ng3 g6 15.Bg5 h6 16.Bd2 Bg7 17.a4 c5 18.d5 c4 19.b4 Nh5 20.Nxh5 gxh5 21.Qd2 Kh7 22.Re3 Nf6 23.Rae1 Qd7 24.f3 Rab8 25.Kh2 Rb6 26.Reg3 Rg8 27.Nf1 Nh5 28.Ng3 Nf6 29.Nf1 1-0`;

interface EvalResult {
  cp?: number;
  mate?: number;
  depth?: number;
  line?: string;
}

export default function AnalyzePage() {
  const [pgn, setPgn] = useState("");
  const [chess, setChess] = useState<Chess | null>(null);
  const [moveIndex, setMoveIndex] = useState(-1);
  const [moves, setMoves] = useState<string[]>([]);
  const [evals, setEvals] = useState<(EvalResult | null)[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [pgnHeaders, setPgnHeaders] = useState<Record<string, string | null>>({});
  const [error, setError] = useState("");
  const evalWorkerRef = useRef<number | null>(null);

  const parsePGN = useCallback((input: string) => {
    try {
      setError("");
      const c = new Chess();
      c.loadPgn(input);

      const headers = c.header();
      setPgnHeaders(headers);

      const history = c.history();
      if (history.length === 0) {
        setError("No moves found in PGN. Check the format.");
        return;
      }

      setChess(c);
      setMoves(history);
      setEvals(new Array(history.length).fill(null));
      setMoveIndex(-1);
      setFen(c.fen());

      // Reset to starting position
      const fresh = new Chess();
      setFen(fresh.fen());
    } catch (e) {
      setError("Invalid PGN: " + (e instanceof Error ? e.message : "unknown error"));
    }
  }, []);

  const goToMove = useCallback((idx: number) => {
    if (!chess) return;
    const c = new Chess();
    const history = chess.history();
    for (let i = 0; i <= idx; i++) {
      c.move(history[i]);
    }
    setFen(c.fen());
    setMoveIndex(idx);
  }, [chess]);

  const analyzePosition = useCallback(async (fenToEval: string, depth: number) => {
    try {
      const res = await fetch(
        `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fenToEval)}&multiPv=1`
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.pvs && data.pvs[0]) {
        return {
          cp: data.pvs[0].cp,
          mate: data.pvs[0].mate,
          depth: data.depth,
          line: data.pvs[0].moves,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const analyzeAll = useCallback(async () => {
    if (!chess || moves.length === 0) return;
    setEvaluating(true);
    const newEvals: (EvalResult | null)[] = [];
    const c = new Chess();

    for (let i = 0; i < moves.length; i++) {
      c.move(moves[i]);
      const ev = await analyzePosition(c.fen(), 20);
      newEvals.push(ev);
      setEvals([...newEvals]);
    }
    setEvaluating(false);
  }, [chess, moves, analyzePosition]);

  const loadExample = useCallback(() => {
    setPgn(EXAMPLE_PGN);
    parsePGN(EXAMPLE_PGN);
  }, [parsePGN]);

  const formatEval = (ev: EvalResult | null) => {
    if (!ev) return "—";
    if (ev.mate !== undefined) {
      return `M${ev.mate > 0 ? ev.mate : "#" + Math.abs(ev.mate)}`;
    }
    if (ev.cp !== undefined) {
      const val = ev.cp / 100;
      return (val > 0 ? "+" : "") + val.toFixed(1);
    }
    return "—";
  };

  const evalColor = (ev: EvalResult | null) => {
    if (!ev) return "var(--color-text-muted)";
    if (ev.mate !== undefined) return ev.mate > 0 ? "#2ea043" : "#da3633";
    if (ev.cp !== undefined) {
      if (ev.cp > 50) return "#2ea043";
      if (ev.cp < -50) return "#da3633";
    }
    return "var(--color-text)";
  };

  return (
    <div className="wrap" style={{ padding: "32px 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        <Zap style={{ display: "inline", width: 24, height: 24, verticalAlign: "middle", marginRight: 8 }} />
        Game Analyzer
      </h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: 24 }}>
        Import a PGN, analyze with engine evaluation powered by Lichess cloud analysis
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, alignItems: "start" }}>
        {/* Left: Board */}
        <div>
          <div className="card" style={{ padding: 16 }}>
            <div style={{ maxWidth: 560 }}>
              <Chessboard
                options={{
                  position: fen,
                  animationDurationInMs: 200,
                  allowDragging: false,
                  boardStyle: {
                    borderRadius: 4,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    width: "100%",
                  },
                }}
              />
            </div>
          </div>

          {/* Move navigation */}
          {moves.length > 0 && (
            <div className="card" style={{ padding: 12, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => goToMove(-1)} disabled={moveIndex < -1} style={{ padding: "4px 8px" }}>
                <ChevronsLeft size={16} />
              </button>
              <button className="btn btn-ghost" onClick={() => goToMove(moveIndex - 1)} disabled={moveIndex < -1} style={{ padding: "4px 8px" }}>
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: 13, color: "var(--color-text-muted)", minWidth: 100, textAlign: "center" }}>
                {moveIndex < 0 ? "Start" : `Move ${moveIndex + 1} / ${moves.length}`}
              </span>
              <button className="btn btn-ghost" onClick={() => goToMove(moveIndex + 1)} disabled={moveIndex >= moves.length - 1} style={{ padding: "4px 8px" }}>
                <ChevronRight size={16} />
              </button>
              <button className="btn btn-ghost" onClick={() => goToMove(moves.length - 1)} disabled={moveIndex >= moves.length - 1} style={{ padding: "4px 8px" }}>
                <ChevronsRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Right: PGN input + move list + eval */}
        <div>
          {/* PGN Input */}
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Import PGN</span>
              <button onClick={loadExample} style={{ fontSize: 12, color: "var(--color-accent)", cursor: "pointer", background: "none", border: "none" }}>
                Load example
              </button>
            </div>
            <textarea
              value={pgn}
              onChange={(e) => setPgn(e.target.value)}
              placeholder="Paste PGN here..."
              style={{
                width: "100%",
                height: 120,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: 10,
                color: "var(--color-text)",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                resize: "vertical",
              }}
            />
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, color: "var(--color-live)", fontSize: 12 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={() => parsePGN(pgn)} style={{ flex: 1, fontSize: 13 }}>
                Load Game
              </button>
              <button
                className="btn btn-outline"
                onClick={analyzeAll}
                disabled={moves.length === 0 || evaluating}
                style={{ fontSize: 13 }}
              >
                {evaluating ? "Analyzing..." : "Analyze All"}
              </button>
            </div>
          </div>

          {/* Game info */}
          {Object.keys(pgnHeaders).length > 0 && (
            <div className="card" style={{ padding: 12, marginBottom: 12 }}>
              {pgnHeaders.White && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{pgnHeaders.White}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>White</span>
                </div>
              )}
              {pgnHeaders.Black && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{pgnHeaders.Black}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>Black</span>
                </div>
              )}
              {pgnHeaders.Result && (
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--color-gold)", fontWeight: 700, textAlign: "center" }}>
                  Result: {pgnHeaders.Result}
                </div>
              )}
            </div>
          )}

          {/* Move list with eval */}
          {moves.length > 0 && (
            <div className="card" style={{ padding: 12, maxHeight: 400, overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Moves ({moves.length})</span>
                {evaluating && (
                  <span style={{ fontSize: 11, color: "var(--color-accent)" }}>Evaluating...</span>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 50px", gap: "2px 8px", fontSize: 12, fontFamily: "var(--font-mono)" }}>
                {moves.map((move, i) => {
                  const isWhiteMove = i % 2 === 0;
                  const moveNum = Math.floor(i / 2) + 1;
                  return (
                    <span key={i}>
                      {isWhiteMove && (
                        <span style={{ color: "var(--color-text-muted)", textAlign: "right" }}>{moveNum}.</span>
                      )}
                      {!isWhiteMove && <span />}
                      <button
                        onClick={() => goToMove(i)}
                        style={{
                          textAlign: "left",
                          background: i === moveIndex ? "var(--color-accent-muted)" : "transparent",
                          border: "none",
                          color: "var(--color-text)",
                          cursor: "pointer",
                          padding: "2px 4px",
                          borderRadius: 4,
                          fontWeight: i === moveIndex ? 700 : 400,
                        }}
                      >
                        {move}
                      </button>
                      {isWhiteMove && moves[i + 1] && (
                        <button
                          onClick={() => goToMove(i + 1)}
                          style={{
                            textAlign: "left",
                            background: i + 1 === moveIndex ? "var(--color-accent-muted)" : "transparent",
                            border: "none",
                            color: "var(--color-text)",
                            cursor: "pointer",
                            padding: "2px 4px",
                            borderRadius: 4,
                            fontWeight: i + 1 === moveIndex ? 700 : 400,
                          }}
                        >
                          {moves[i + 1]}
                        </button>
                      )}
                      {isWhiteMove && (
                        <span style={{ color: evalColor(evals[i]), fontWeight: 600, fontSize: 11 }}>
                          {formatEval(evals[i])}
                        </span>
                      )}
                      {!isWhiteMove && <span />}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
