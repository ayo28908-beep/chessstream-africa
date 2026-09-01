"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Target, RefreshCw, Trophy, Zap } from "lucide-react";

const Chessboard = dynamic(() => import("react-chessboard").then((m) => m.Chessboard), { ssr: false });

interface Puzzle {
  id: string;
  fen: string;
  rating: number;
  plays: number;
  solution: string[];
  themes: string[];
}

export default function PuzzlesPage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [loading, setLoading] = useState(true);
  const [solved, setSolved] = useState<boolean | null>(null);
  const [streak, setStreak] = useState(0);
  const [totalSolved, setTotalSolved] = useState(0);

  useEffect(() => {
    fetchDailyPuzzle();
  }, []);

  const fetchDailyPuzzle = async () => {
    setLoading(true);
    setSolved(null);
    try {
      const res = await fetch("https://lichess.org/api/puzzle/daily");
      if (res.ok) {
        const data = await res.json();
        setPuzzle({
          id: data.puzzle.id,
          fen: data.puzzle.fen,
          rating: data.puzzle.rating,
          plays: data.puzzle.plays,
          solution: data.puzzle.solution.split(" "),
          themes: data.puzzle.themes,
        });
      }
    } catch {
      console.error("Failed to fetch puzzle");
    }
    setLoading(false);
  };

  const handleMove = (sourceSquare: string, targetSquare: string): boolean => {
    if (!puzzle || solved !== null) return false;

    const expectedMove = `${sourceSquare}${targetSquare}`;
    if (expectedMove === puzzle.solution[0]) {
      setSolved(true);
      setStreak((s) => s + 1);
      setTotalSolved((t) => t + 1);
      return true;
    }
    setSolved(false);
    setStreak(0);
    return false;
  };

  return (
    <div className="wrap" style={{ padding: "32px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Daily Puzzle</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: 16 }}>
            Solve the daily chess puzzle from Lichess
          </p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-accent)" }}>{streak}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Streak</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)" }}>{totalSolved}</div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Solved</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <div style={{ fontSize: 18, color: "var(--color-text-muted)" }}>Loading puzzle...</div>
        </div>
      ) : puzzle ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
          <div>
            <div style={{ maxWidth: 500 }}>
              <Chessboard
                options={{
                  position: puzzle.fen,
                  onPieceDrop: ({ sourceSquare, targetSquare }) => {
                    if (!sourceSquare || !targetSquare) return false;
                    return handleMove(sourceSquare, targetSquare);
                  },
                }}
              />
            </div>
            
            {solved !== null && (
              <div style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 8,
                background: solved ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                border: `1px solid ${solved ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                textAlign: "center",
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: solved ? "#22c55e" : "#ef4444" }}>
                  {solved ? "Correct! Well done!" : "Incorrect. Try again!"}
                </div>
                {solved && (
                  <button onClick={fetchDailyPuzzle} className="btn btn-primary" style={{ marginTop: 12 }}>
                    Next Puzzle
                  </button>
                )}
                {!solved && (
                  <button onClick={() => setSolved(null)} className="btn btn-outline" style={{ marginTop: 12 }}>
                    Try Again
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <div style={{
              padding: 20,
              background: "var(--color-bg-raised)",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
            }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Puzzle Info</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Rating</span>
                  <span style={{ fontWeight: 600 }}>{puzzle.rating}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>Plays</span>
                  <span style={{ fontWeight: 600 }}>{puzzle.plays.toLocaleString()}</span>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)" }}>Themes</span>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                    {puzzle.themes.map((theme) => (
                      <span key={theme} style={{
                        padding: "2px 8px",
                        background: "var(--color-bg)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 4,
                        fontSize: 12,
                      }}>
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={fetchDailyPuzzle} className="btn btn-outline" style={{ width: "100%", marginTop: 16 }}>
              <RefreshCw size={14} /> New Puzzle
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Target size={48} style={{ color: "var(--color-text-muted)", marginBottom: 16 }} />
          <div style={{ fontSize: 18, color: "var(--color-text-muted)" }}>Failed to load puzzle</div>
          <button onClick={fetchDailyPuzzle} className="btn btn-primary" style={{ marginTop: 16 }}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
