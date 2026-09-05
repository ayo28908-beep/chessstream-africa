import { NextRequest, NextResponse } from "next/server";

// GET /api/games/search?source=lichess|chesscom&player=...&max=20
// Searches a player's past games. Lichess streams NDJSON; Chess.com returns
// the latest archived month. Missing players / empty archives come back as
// empty arrays with a friendly message — never an error page.

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

async function searchLichessGames(player: string, max: number): Promise<{ games: PastGame[]; message?: string }> {
  try {
    const res = await fetch(
      `https://lichess.org/api/games/user/${encodeURIComponent(player)}?max=${max}&pgnInJson=true&opening=true&tags=true`,
      { headers: { Accept: "application/x-ndjson" } }
    );
    if (!res.ok) {
      if (res.status === 404) {
        // Lichess 404s BOTH unknown accounts AND real accounts with no
        // exportable games. Disambiguate via the account endpoint.
        try {
          const who = await fetch(`https://lichess.org/api/user/${encodeURIComponent(player)}`, {
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(8000),
          });
          if (who.ok) {
            return { games: [], message: `No recent games available for "${player}" - the account exists but keeps its games private or is inactive.` };
          }
        } catch {
          // network hiccup on the disambiguation call; fall through
        }
        return { games: [], message: `No Lichess account found for "${player}".` };
      }
      return { games: [], message: `Lichess returned ${res.status}.` };
    }
    const text = await res.text();
    const games: PastGame[] = [];
    for (const line of text.trim().split("\n")) {
      if (!line.trim()) continue;
      try {
        const g = JSON.parse(line);
        games.push({
          id: g.id || `g${games.length}`,
          white: g.players?.white?.user?.name || g.players?.white?.name || "White",
          black: g.players?.black?.user?.name || g.players?.black?.name || "Black",
          result: g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : "1/2-1/2",
          date: g.createdAt ? new Date(g.createdAt).toISOString().slice(0, 10) : undefined,
          opening: g.opening?.name,
          url: `https://lichess.org/${g.id}`,
          pgn: g.pgn,
        });
      } catch {
        // skip malformed line
      }
      if (games.length >= max) break;
    }
    return { games };
  } catch {
    return { games: [], message: "Could not reach Lichess right now." };
  }
}

async function searchChessComGames(player: string, max: number): Promise<{ games: PastGame[]; message?: string }> {
  try {
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(player)}/games/archives`, {
      headers: { Accept: "application/json" },
    });
    if (!archivesRes.ok) {
      return { games: [], message: archivesRes.status === 404 ? `No Chess.com account found for "${player}".` : "Chess.com returned an error." };
    }
    const archives = (await archivesRes.json()) as { archives?: string[] };
    const latest = archives.archives?.slice(-1)[0];
    if (!latest) return { games: [], message: "No archived games found for this account." };

    const gamesRes = await fetch(latest, { headers: { Accept: "application/json" } });
    if (!gamesRes.ok) return { games: [], message: "Could not load that month's games." };
    const month = (await gamesRes.json()) as { games?: Record<string, unknown>[] };
    const games: PastGame[] = [];
    for (const g of month.games || []) {
      const r = g as Record<string, unknown>;
      const white = (r.white as Record<string, string>) || {};
      const black = (r.black as Record<string, string>) || {};
      const endTime = typeof r.end_time === "number" ? new Date(r.end_time * 1000).toISOString().slice(0, 10) : undefined;
      games.push({
        id: String(r.url || `cc${games.length}`),
        white: white.username || "White",
        black: black.username || "Black",
        result: (r.pgn as string)?.match(/\s(1-0|0-1|1\/2-1\/2)\s*$/)?.[1] || "*",
        date: endTime,
        opening: (r.opening as { name?: string })?.name,
        url: String(r.url || ""),
        pgn: (r.pgn as string) || "",
      });
      if (games.length >= max) break;
    }
    return { games };
  } catch {
    return { games: [], message: "Could not reach Chess.com right now." };
  }
}

export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") || "lichess";
  const player = (req.nextUrl.searchParams.get("player") || "").trim();
  const max = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("max") || "20"), 1), 50);

  if (!player) return NextResponse.json({ error: "Missing player" }, { status: 400 });

  if (source === "chesscom") {
    return NextResponse.json({ source, player, ...(await searchChessComGames(player, max)) });
  }
  return NextResponse.json({ source: "lichess", player, ...(await searchLichessGames(player, max)) });
}
