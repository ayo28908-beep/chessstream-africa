"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import {
  Target,
  Flame,
  RotateCcw,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

const Chessboard = dynamic(() => import("react-chessboard").then(m => m.Chessboard), { ssr: false });

interface Puzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  ratingDeviation: number;
  themes: string[];
  openingTags: string[];
}

interface PuzzleStats {
  solved: number;
  failed: number;
  streak: number;
  rating: number;
}

export default function PuzzlesPage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [userColor, setUserColor] = useState<"w" | "b">("w");
  const [moveIndex, setMoveIndex] = useState(0);
  const [status, setStatus] = useState<"waiting" | "playing" | "correct" | "wrong">("waiting");
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState<PuzzleStats>({
    solved: 0,
    failed: 0,
    streak: 0,
    rating: 1200,
  });
  const [history, setHistory] = useState<{ puzzle: Puzzle; correct: boolean }[]>([]);

  const fetchPuzzle = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("https://lichess.org/api/puzzle/daily");
      if (!res.ok) throw new Error("Failed to fetch puzzle");
      const data = await res.json();
      setPuzzle(data.puzzle);
      setFen(data.puzzle.fen);
      setUserColor(data.puzzle.fen.includes(" b ") ? "b" : "w");
      setMoveIndex(0);
      setStatus("playing");
      setMessage("");
    } catch {
      setError("Could not load puzzle. Try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPuzzle();
  }, [fetchPuzzle]);

  const onMove = useCallback((sourceSquare: string, targetSquare: string) => {
    if (!puzzle || status !== "playing") return false;

    const expectedMove = puzzle.moves[moveIndex];
    const userMove = sourceSquare + targetSquare;

    if (userMove === expectedMove) {
      const c = new Chess(fen);
      c.move(expectedMove);

      if (moveIndex + 1 < puzzle.moves.length) {
        c.move(puzzle.moves[moveIndex + 1]);
        setFen(c.fen());
        setMoveIndex(moveIndex + 2);
        if (moveIndex + 2 >= puzzle.moves.length) {
          setStatus("correct");
          setMessage("Correct! Nice solve.");
          setStats(prev => ({ ...prev, solved: prev.solved + 1, streak: prev.streak + 1, rating: prev.rating + 10 }));
          setHistory(prev => [...prev, { puzzle, correct: true }]);
        }
      } else {
        setStatus("correct");
        setMessage("Correct! Nice solve.");
        setStats(prev => ({ ...prev, solved: prev.solved + 1, streak: prev.streak + 1, rating: prev.rating + 10 }));
        setHistory(prev => [...prev, { puzzle, correct: true }]);
      }
      return true;
    } else {
      setStatus("wrong");
      setMessage(`Wrong! The move was ${expectedMove.slice(0,2)}${expectedMove.slice(2,4)}`);
      setStats(prev => ({ ...prev, failed: prev.failed + 1, streak: 0, rating: Math.max(800, prev.rating - 5) }));
      setHistory(prev => [...prev, { puzzle, correct: false }]);
      const c = new Chess(fen);
      c.move(expectedMove);
      if (moveIndex + 1 < puzzle.moves.length) c.move(puzzle.moves[moveIndex + 1]);
      setFen(c.fen());
      return false;
    }
  }, [puzzle, moveIndex, fen, status]);

  const isPlayerTurn = puzzle && moveIndex % 2 === (userColor === "w" ? 0 : 1);

  return (
    <div className="wrap" style={{ padding: "32px 20px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
        <Target style={{ display: "inline", width: 24, height: 24, verticalAlign: "middle", marginRight: 8 }} />
        Daily Puzzle
      </h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: 24 }}>
        Solve today&apos;s puzzle from Lichess — updated daily
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>
        <div>
          {loading ? (
            <div className="card" style={{ padding: 80, textAlign: "center" }}>
              <Loader2 size={32} style={{ animation: "spin 1s linear infinite", color: "var(--color-accent)" }} />
              <p style={{ color: "var(--color-text-muted)", marginTop: 12 }}>Loading puzzle...</p>
            </div>
          ) : puzzle ? (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ maxWidth: 520 }}>
                <Chessboard
                  options={{
                    position: fen,
                    onPieceDrop: isPlayerTurn ? ({ sourceSquare, targetSquare }) => {
                      if (!targetSquare) return false;
                      return onMove(sourceSquare, targetSquare);
                    } : undefined,
                    animationDurationInMs: 200,
                    boardOrientation: userColor === "b" ? "black" : "white",
                    boardStyle: { borderRadius: 4, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", width: "100%" },
                    darkSquareStyle: { backgroundColor: "#30463a" },
                    lightSquareStyle: { backgroundColor: "#d9e4cd" },
                  }}
                />
              </div>
              {message && (
                <div style={{
                  marginTop: 12, padding: "10px 16px", borderRadius: 8,
                  background: status === "correct" ? "rgba(46,160,67,0.15)" : "rgba(218,54,51,0.15)",
                  color: status === "correct" ? "var(--color-accent)" : "var(--color-live)",
                  fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
                }}>
                  {status === "correct" ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  {message}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {(status === "correct" || status === "wrong") && (
                  <button className="btn btn-primary" onClick={fetchPuzzle} style={{ flex: 1 }}>
                    Next Puzzle <ChevronRight size={16} />
                  </button>
                )}
                {status === "playing" && (
                  <button className="btn btn-outline" onClick={() => { setStats(prev => ({ ...prev, streak: 0 })); if (puzzle) setHistory(prev => [...prev, { puzzle, correct: false }]); fetchPuzzle(); }} style={{ flex: 1 }}>
                    Skip
                  </button>
                )}
                <button className="btn btn-ghost" onClick={() => puzzle && setFen(puzzle.fen)}>
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          ) : error ? (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <p style={{ color: "var(--color-live)", marginBottom: 12 }}>{error}</p>
              <button className="btn btn-primary" onClick={fetchPuzzle}>Try Again</button>
            </div>
          ) : null}
        </div>

        <div>
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Your Stats</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-accent)" }}>{stats.rating}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Rating</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-gold)" }}>
                  {stats.streak}<Flame size={14} style={{ display: "inline", verticalAlign: "middle", marginLeft: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Streak</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.solved}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Solved</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{stats.failed}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Failed</div>
              </div>
            </div>
          </div>

          {puzzle && (
            <div className="card" style={{ padding: 16, marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Puzzle Info</h3>
              <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Rating</span>
                  <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{puzzle.rating}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span>Moves</span>
                  <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{puzzle.moves.length}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Play as</span>
                  <span style={{ color: "var(--color-text)", fontWeight: 600 }}>{userColor === "w" ? "White" : "Black"}</span>
                </div>
                {puzzle.themes.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {puzzle.themes.map(t => (
                      <span key={t} style={{ padding: "2px 8px", borderRadius: 999, background: "var(--color-accent-muted)", color: "var(--color-accent)", fontSize: 11, fontWeight: 600 }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Recent</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {history.slice(-5).reverse().map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    {h.correct ? <CheckCircle size={14} style={{ color: "var(--color-accent)" }} /> : <XCircle size={14} style={{ color: "var(--color-live)" }} />}
                    <span style={{ color: "var(--color-text-muted)" }}>{h.puzzle.rating} rated</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
