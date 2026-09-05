import { NextRequest, NextResponse } from "next/server";
import { parsePGNtoGames } from "@/lib/pgn";

// GET /api/lichess/round/[roundId]
// Fetches PGN for a specific round and parses into structured game objects
// with FEN, current eval, full move list, and eval history (for commentary).
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
