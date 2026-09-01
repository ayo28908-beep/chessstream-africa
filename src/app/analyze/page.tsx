"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Chess } from "chess.js";
import { Upload, Play, ArrowLeft, ArrowRight, RotateCcw, Zap } from "lucide-react";

const Chessboard = dynamic(() => import("react-chessboard").then((m) => m.Chessboard), { ssr: false });

const EXAMPLE_PGN = `[Event "Candidates Tournament"]
[Site "Toronto CAN"]
[Date "2024.04.08"]
[Round "1"]
[White "Caruana, Fabiano"]
[Black "Praggnanandhaa, R"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7 11. Nbd2 Bb7 12. Bc2 Re8 13. Nf1 Bf8 14. Ng3 g6 15. Bg5 h6 16. Bd2 Bg7 17. a4 c5 18. d5 c4 19. Bg5 Nc5 20. Qd2 h5 21. Bxf6 Bxf6 22. Bxg6 fxg6 23. Qxh6 1-0`;

export default function AnalyzePage() {
  const [pgnText, setPgnText] = useState("");
  const [chess, setChess] = useState<Chess | null>(null);
  const [moveIndex, setMoveIndex] = useState(-1);
  const [moves, setMoves] = useState<string[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  const loadPgn = (pgn: string) => {
    try {
      const c = new Chess();
      c.loadPgn(pgn);
      const history = c.history();
      setMoves(history);
      setMoveHistory([]);
      setMoveIndex(-1);
      
      const freshChess = new Chess();
      setChess(freshChess);
      setPgnText(pgn);
    } catch {
      alert("Invalid PGN. Please check the format.");
    }
  };

  const goToMove = (index: number) => {
    if (!chess || index < -1 || index >= moves.length) return;
    
    const newChess = new Chess();
    for (let i = 0; i <= index; i++) {
      newChess.move(moves[i]);
    }
    setChess(newChess);
    setMoveIndex(index);
    setMoveHistory(moves.slice(0, index + 1));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      loadPgn(text);
    };
    reader.readAsText(file);
  };

  return (
    <div className="wrap" style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Game Analyzer</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 32, fontSize: 16 }}>
        Import any PGN and analyze it move by move
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "start" }}>
        {/* Board */}
        <div>
          <div style={{ maxWidth: 500 }}>
            <Chessboard
              options={{
                position: chess?.fen() || "start",
                animationDurationInMs: 200,
              }}
            />
          </div>
          
          {/* Controls */}
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
            <button
              onClick={() => goToMove(-1)}
              disabled={!chess || moveIndex <= -1}
              className="btn btn-outline"
              style={{ padding: "8px 12px", fontSize: 13 }}
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => goToMove(moveIndex - 1)}
              disabled={!chess || moveIndex <= -1}
              className="btn btn-outline"
              style={{ padding: "8px 12px", fontSize: 13 }}
            >
              <ArrowLeft size={14} /> Prev
            </button>
            <button
              onClick={() => goToMove(moveIndex + 1)}
              disabled={!chess || moveIndex >= moves.length - 1}
              className="btn btn-primary"
              style={{ padding: "8px 12px", fontSize: 13 }}
            >
              Next <ArrowRight size={14} />
            </button>
            <button
              onClick={() => goToMove(moves.length - 1)}
              disabled={!chess || moveIndex >= moves.length - 1}
              className="btn btn-outline"
              style={{ padding: "8px 12px", fontSize: 13 }}
            >
              End →
            </button>
          </div>
          
          {/* Move list */}
          {moves.length > 0 && (
            <div style={{
              marginTop: 16,
              padding: 16,
              background: "var(--color-bg-raised)",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              maxHeight: 200,
              overflowY: "auto",
              fontSize: 13,
              fontFamily: "var(--font-mono)",
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {moves.map((move, i) => (
                  <span
                    key={i}
                    onClick={() => goToMove(i)}
                    style={{
                      padding: "2px 6px",
                      borderRadius: 4,
                      cursor: "pointer",
                      background: i === moveIndex ? "var(--color-accent)" : "transparent",
                      color: i === moveIndex ? "#000" : "var(--color-text)",
                      fontWeight: i === moveIndex ? 600 : 400,
                    }}
                  >
                    {i % 2 === 0 && <span style={{ color: "var(--color-text-muted)", marginRight: 4 }}>{Math.floor(i / 2) + 1}.</span>}
                    {move}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* PGN Input */}
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Import PGN</h3>
          
          <textarea
            value={pgnText}
            onChange={(e) => setPgnText(e.target.value)}
            placeholder={`[Event "Game Name"]\n[White "Player 1"]\n[Black "Player 2"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 ...`}
            style={{
              width: "100%",
              height: 200,
              padding: 12,
              background: "var(--color-bg)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              color: "var(--color-text)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              resize: "vertical",
            }}
          />
          
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={() => loadPgn(pgnText)} className="btn btn-primary" style={{ flex: 1 }}>
              <Upload size={14} /> Load PGN
            </button>
            <label className="btn btn-outline" style={{ flex: 1, cursor: "pointer", textAlign: "center" }}>
              <Play size={14} /> Upload File
              <input type="file" accept=".pgn,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
            </label>
          </div>
          
          <button
            onClick={() => loadPgn(EXAMPLE_PGN)}
            className="btn btn-ghost"
            style={{ width: "100%", marginTop: 8, fontSize: 13 }}
          >
            <Zap size={14} /> Load Example Game
          </button>

          <div style={{
            marginTop: 24,
            padding: 16,
            background: "var(--color-bg-raised)",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>How to use</h4>
            <ul style={{ fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.8 }}>
              <li>Paste a PGN in the text area</li>
              <li>Click &quot;Load PGN&quot; to analyze</li>
              <li>Use arrow buttons to navigate moves</li>
              <li>Click any move in the list to jump to it</li>
              <li>Upload .pgn files directly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
