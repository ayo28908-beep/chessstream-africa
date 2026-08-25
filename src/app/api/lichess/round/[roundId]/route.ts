import { NextRequest, NextResponse } from "next/server";
import { Chess } from "chess.js";

// GET /api/lichess/round/[roundId]
// Fetches PGN for a specific round and parses into structured game objects with FEN + eval

interface ParsedGame {
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
}

function buildFENFromPGN(movesSection: string): string {
  // Strip all annotations from the moves section to get clean moves
  const cleaned = movesSection
    .replace(/\{[^}]*\}/g, "")           // remove { [%eval ...] [%clk ...] } blocks
    .replace(/\([^)]*\)/g, "")           // remove variations (variations)
    .replace(/;.*$/gm, "")                // remove ; comments
    .trim();

  try {
    const chess = new Chess();
    chess.loadPgn(cleaned);
    return chess.fen();
  } catch {
    // Fallback: try to apply moves one by one
    try {
      const chess = new Chess();
      const tokens = cleaned
        .replace(/\d+\.+/g, "")           // remove move numbers
        .replace(/1-0|0-1|1\/2-1\/2|\*/g, "")
        .trim()
        .split(/\s+/)
        .filter(t => t.length > 0 && t.length <= 10);
      
      for (const token of tokens) {
        try { chess.move(token); } catch { /* skip invalid */ }
      }
      return chess.fen();
    } catch {
      return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    }
  }
}

function parsePGNtoGames(pgn: string): ParsedGame[] {
  const games: ParsedGame[] = [];
  const chunks = pgn.split(/\n\n\n+/);

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const headers: Record<string, string> = {};
    const headerLines = chunk.split("\n").filter(l => l.startsWith("["));
    for (const line of headerLines) {
      const m = line.match(/\[(\w+)\s+"([^"]*)"\]/);
      if (m) headers[m[1]] = m[2];
    }

    if (!headers.Event && !headers.White) continue;

    const movesStart = chunk.indexOf("\n", chunk.indexOf("["));
    const movesSection = movesStart > 0 ? chunk.slice(movesStart).trim() : "";
    
    // Extract eval annotations — Lichess uses [%eval 0.15] format
    let lastEval = 0;
    const evalMatches = movesSection.matchAll(/\[%eval\s+([-+]?\d+\.?\d*)\]/g);
    for (const m of evalMatches) {
      lastEval = parseFloat(m[1]);
    }
    // Also try alternate formats
    if (lastEval === 0) {
      const altMatches = movesSection.matchAll(/\{%evl?\s+([-+]?\d+\.?\d*)\}/gi);
      for (const m of altMatches) {
        lastEval = parseFloat(m[1]);
      }
    }

    // Extract last move
    const cleanMoves = movesSection
      .replace(/\{[^}]*\}/g, "")       // remove eval/clock annotations
      .replace(/\([^)]*\)/g, "")        // remove variations
      .replace(/\[\w+\s+"[^"]*"\]/g, "") // remove headers accidentally in moves
      .replace(/\d+\.\.\./g, "")       // remove black move numbers
      .trim();
    const moveTokens = cleanMoves.split(/\s+/).filter(t => {
      if (!t) return false;
      if (t.match(/^\d+\./)) return false;              // move numbers
      if (["1-0","0-1","1/2-1/2","*"].includes(t)) return false; // results
      if (t.startsWith("http")) return false;           // URLs
      if (t.startsWith("\"")) return false;             // quoted strings
      if (t.length > 10) return false;                    // anything too long isn't a move
      // Must look like a chess move: starts with piece letter, rank/file, or castling
      if (!t.match(/^[KQRBNP]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?[+#]?|^[Oo0]-[Oo0]-?[Oo0]?[+#]?$/)) return false;
      return true;
    });
    const lastMove = moveTokens.length > 0 ? moveTokens[moveTokens.length - 1] : undefined;
    const moveCount = moveTokens.length;

    // Build FEN from PGN moves using chess.js
    const fen = buildFENFromPGN(movesSection);

    // Determine game status
    let status = "in-progress";
    const result = headers.Result || "*";
    if (result === "1-0") status = "white-wins";
    else if (result === "0-1") status = "black-wins";
    else if (result === "1/2-1/2") status = "draw";

    // Get Lichess game URL — prefer GameURL (individual game), not BroadcastURL (round page)
    const gameUrl = headers.GameURL || "";

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
      lastMove,
      moveCount,
      status,
      pgnUrl: gameUrl,
      opening: headers.Opening || undefined,
      eco: headers.ECO || undefined,
    });
  }

  return games;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params;

  if (!roundId || roundId.length < 5) {
    return NextResponse.json({ error: "Invalid roundId" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://lichess.org/api/broadcast/round/${roundId}.pgn`,
      { headers: { Accept: "application/x-chess-pgn" } }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `Lichess API returned ${res.status}` },
        { status: 502 }
      );
    }

    const pgn = await res.text();
    const games = parsePGNtoGames(pgn);

    return NextResponse.json({
      roundId,
      gameCount: games.length,
      games,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch round data", detail: String(err) },
      { status: 500 }
    );
  }
}
