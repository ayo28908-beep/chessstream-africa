// ChessStream Africa — shared PGN parsing utilities.
// Parses raw PGN text into structured game objects with FEN, current eval,
// full SAN move list, and eval history (used by broadcast rounds, the
// self-hosted broadcast store, and the analyzer).

import { Chess } from "chess.js";

export interface EvalPoint {
  moveNumber: number;
  san: string;
  eval: number;
  side: "w" | "b";
}

export interface ParsedGame {
  id: string;
  event: string;
  white: { name: string; title?: string; rating?: number; fideId?: number; federation?: string };
  black: { name: string; title?: string; rating?: number; fideId?: number; federation?: string };
  result: string;
  fen: string;
  eval: number;
  lastMove?: string;
  moveCount: number;
  status: string;
  pgnUrl: string;
  opening?: string;
  eco?: string;
  moves: string[];
  evals: EvalPoint[];
}

// Extract the SAN move list + eval annotations from a PGN moves section.
// Track white/black parity using move numbers ("N." = white, "N..." = black).
function parseMovesAndEvals(movesSection: string): { moves: string[]; evals: EvalPoint[]; lastEval: number } {
  const moves: string[] = [];
  const evals: EvalPoint[] = [];
  let lastEval = 0;

  let curMoveNumber = 0;
  let curSide: "w" | "b" = "w";
  let curSan = "";

  const tokenRe = /(\d+)\.\.\.|(\d+)\.|\[%eval\s+([-+]?\d+\.?\d*)\]|[^\s{}]+/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(movesSection)) !== null) {
    const tok = m[0];
    if (m[1]) {
      curMoveNumber = parseInt(m[1]);
      curSide = "b";
      continue;
    }
    if (m[2]) {
      curMoveNumber = parseInt(m[2]);
      curSide = "w";
      continue;
    }
    if (m[3]) {
      const evalValue = parseFloat(m[3]);
      lastEval = evalValue;
      if (curSan) {
        evals.push({ moveNumber: curMoveNumber, san: curSan, eval: evalValue, side: curSide });
      }
      continue;
    }
    if (["1-0", "0-1", "1/2-1/2", "*"].includes(tok)) continue;
    if (tok.startsWith("[") || tok.startsWith("\"") || tok.startsWith("http")) continue;
    if (tok.length > 10) continue;
    if (!/^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?$/.test(tok) && !/^[Oo0]-[Oo0]-?[Oo0]?[+#]?$/.test(tok)) continue;
    curSan = tok;
    moves.push(tok);
  }

  return { moves, evals, lastEval };
}

function buildFENFromPGN(movesSection: string): string {
  const cleaned = movesSection
    .replace(/\{[^}]*\}/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/;.*$/gm, "")
    .trim();

  try {
    const chess = new Chess();
    chess.loadPgn(cleaned);
    return chess.fen();
  } catch {
    try {
      const chess = new Chess();
      const tokens = cleaned
        .replace(/\d+\.+/g, "")
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
        .trim()
        .split(/\s+/)
        .filter((t) => t.length > 0 && t.length <= 10);
      for (const token of tokens) {
        try { chess.move(token); } catch { /* skip invalid */ }
      }
      return chess.fen();
    } catch {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
  }
}

export function parsePGNtoGames(pgn: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  const chunks = pgn.split(/\n\n\n+/);

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const headers: Record<string, string> = {};
    const headerLines = chunk.split("\n").filter((l) => l.startsWith("["));
    for (const line of headerLines) {
      const m = line.match(/\[(\w+)\s+"([^"]*)"\]/);
      if (m) headers[m[1]] = m[2];
    }

    if (!headers.Event && !headers.White) continue;

    const movesStart = chunk.indexOf("\n", chunk.indexOf("["));
    const movesSection = movesStart > 0 ? chunk.slice(movesStart).trim() : "";

    const { moves, evals, lastEval } = parseMovesAndEvals(movesSection);
    const fen = buildFENFromPGN(movesSection);

    let status = "in-progress";
    const result = headers.Result || "*";
    if (result === "1-0") status = "white-wins";
    else if (result === "0-1") status = "black-wins";
    else if (result === "1/2-1/2") status = "draw";

    games.push({
      id: headers.Link || headers.White + "-" + headers.Black,
      event: headers.Event || "",
      white: {
        name: headers.White || "Unknown",
        title: headers.WhiteTitle || undefined,
        rating: headers.WhiteElo ? parseInt(headers.WhiteElo) : undefined,
        fideId: headers.WhiteFideId ? parseInt(headers.WhiteFideId) : undefined,
        federation: headers.WhiteFederation || undefined,
      },
      black: {
        name: headers.Black || "Unknown",
        title: headers.BlackTitle || undefined,
        rating: headers.BlackElo ? parseInt(headers.BlackElo) : undefined,
        fideId: headers.BlackFideId ? parseInt(headers.BlackFideId) : undefined,
        federation: headers.BlackFederation || undefined,
      },
      result,
      fen,
      eval: lastEval,
      lastMove: moves.length > 0 ? moves[moves.length - 1] : undefined,
      moveCount: moves.length,
      status,
      pgnUrl: headers.GameURL || headers.Link || "",
      opening: headers.Opening || undefined,
      eco: headers.ECO || undefined,
      moves,
      evals,
    });
  }

  return games;
}
