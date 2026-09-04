import { NextRequest, NextResponse } from "next/server";

// GET /api/search?q=Adeyemi
// Searches for chess players via Lichess autocomplete, then fetches their profiles
// If query contains "vs" or "vs.", splits into two players for head-to-head

interface PlayerResult {
  username: string;
  title?: string;
  rating?: { bullet?: number; blitz?: number; rapid?: number; classical?: number };
  perfs?: Record<string, { rating: number }>;
  url: string;
  fideId?: string;
  fideRating?: number;
  games?: number;
  win?: number;
  loss?: number;
  draw?: number;
}

async function searchLichessPlayers(term: string): Promise<PlayerResult[]> {
  try {
    const res = await fetch(
      `https://lichess.org/api/player/autocomplete?term=${encodeURIComponent(term)}&friend=0`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const usernames: string[] = await res.json();
    // Fetch profiles for top 8 results in parallel
    const profiles = await Promise.all(
      usernames.slice(0, 8).map(async (u) => {
        try {
          const r = await fetch(`https://lichess.org/api/user/${u}`, {
            headers: { Accept: "application/json" },
          });
          if (!r.ok) return null;
          const data = await r.json();
          const bestRating = Math.max(
            data.perfs?.bullet?.rating || 0,
            data.perfs?.blitz?.rating || 0,
            data.perfs?.rapid?.rating || 0,
            data.perfs?.classical?.rating || 0
          );
          return {
            username: data.username || u,
            title: data.title,
            rating: {
              bullet: data.perfs?.bullet?.rating,
              blitz: data.perfs?.blitz?.rating,
              rapid: data.perfs?.rapid?.rating,
              classical: data.perfs?.classical?.rating,
            },
            url: `https://lichess.org/@/${u}`,
            games: data.count?.all || 0,
            win: data.count?.win || 0,
            loss: data.count?.loss || 0,
            draw: data.count?.draw || 0,
          } as PlayerResult;
        } catch {
          return null;
        }
      })
    );
    return profiles.filter(Boolean) as PlayerResult[];
  } catch {
    return [];
  }
}

async function getHeadToHead(
  player1: string,
  player2: string
): Promise<{
  player1: PlayerResult | null;
  player2: PlayerResult | null;
  games: { white: string; black: string; result: string; url: string }[];
}> {
  const [p1Results, p2Results] = await Promise.all([
    searchLichessPlayers(player1),
    searchLichessPlayers(player2),
  ]);

  const p1 = p1Results[0] || null;
  const p2 = p2Results[0] || null;

  // Fetch their recent games to find head-to-head matchups
  let games: { white: string; black: string; result: string; url: string }[] = [];

  if (p1 && p2) {
    try {
      // Search games where these two players played each other
      const searchUrl = `https://lichess.org/api/games/user/${p1.username}?vs=${p2.username}&max=20&pgnInJson=true`;
      const res = await fetch(searchUrl, {
        headers: { Accept: "application/x-ndjson" },
      });
      if (res.ok) {
        const text = await res.text();
        for (const line of text.trim().split("\n")) {
          if (!line.trim()) continue;
          try {
            const game = JSON.parse(line);
            games.push({
              white: game.players?.white?.user?.name || "Unknown",
              black: game.players?.black?.user?.name || "Unknown",
              result: game.winner === "white" ? "1-0" : game.winner === "black" ? "0-1" : "1/2-1/2",
              url: `https://lichess.org/${game.id}`,
            });
          } catch {
            // skip
          }
        }
      }
    } catch {
      // Lichess API may not support this for all users
    }
  }

  return { player1: p1, player2: p2, games };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json({ error: "Missing query parameter ?q=" }, { status: 400 });
  }

  // Detect "vs" queries: "Adeyemi vs Okeke" or "adeyemi vs. okeke"
  const vsMatch = q.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (vsMatch) {
    const [, player1, player2] = vsMatch;
    const h2h = await getHeadToHead(player1.trim(), player2.trim());
    return NextResponse.json({ type: "h2h", query: q, ...h2h });
  }

  // Single player search
  const results = await searchLichessPlayers(q.trim());
  return NextResponse.json({ type: "search", query: q, results });
}
