import { NextRequest, NextResponse } from "next/server";
import { resolveChessComPlayer, guessChessComUsernames } from "@/lib/chesscom";
import { searchIndex, getIndexStatus } from "@/lib/fideSearch";
import { fetchFideH2H } from "@/lib/fide";

// ---------------------------------------------------------------------------
// ChessStream Africa — player search + head-to-head API
//
// GET  /api/search/player?source=lichess|chesscom|fide&term=...
//      -> per-source player hits with live profile links
// POST /api/search/h2h  body: { player1: {lichess?, chesscom?, fide?}, player2: {...} }
//      -> head-to-head across every source that has data for both players
// ---------------------------------------------------------------------------

interface LichessHit {
  source: "lichess";
  username: string;
  title?: string;
  ratings?: { bullet?: number; blitz?: number; rapid?: number; classical?: number };
  games?: number;
  win?: number;
  draw?: number;
  loss?: number;
  url: string;
}

// ---------------- Lichess ----------------
async function searchLichess(term: string): Promise<LichessHit[]> {
  try {
    const res = await fetch(
      `https://lichess.org/api/player/autocomplete?term=${encodeURIComponent(term)}&friend=0`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const usernames: string[] = await res.json();
    const profiles = await Promise.all(
      usernames.slice(0, 8).map(async (u) => {
        try {
          const r = await fetch(`https://lichess.org/api/user/${u}`, {
            headers: { Accept: "application/json" },
          });
          if (!r.ok) return null;
          const d = await r.json();
          return {
            source: "lichess" as const,
            username: d.username || u,
            title: d.title,
            ratings: {
              bullet: d.perfs?.bullet?.rating,
              blitz: d.perfs?.blitz?.rating,
              rapid: d.perfs?.rapid?.rating,
              classical: d.perfs?.classical?.rating,
            },
            games: d.count?.all || 0,
            win: d.count?.win || 0,
            draw: d.count?.draw || 0,
            loss: d.count?.loss || 0,
            url: `https://lichess.org/@/${u}`,
          };
        } catch {
          return null;
        }
      })
    );
    return profiles.filter(Boolean) as LichessHit[];
  } catch {
    return [];
  }
}

// ---------------- FIDE ----------------
async function searchFide(term: string): Promise<{ results: import("@/lib/fideSearch").FidePlayerHit[]; indexLoaded: boolean }> {
  const indexLoaded = getIndexStatus().loaded;
  if (indexLoaded) {
    return { results: searchIndex(term), indexLoaded: true };
  }
  try {
    const res = await fetch(
      `https://ratings.fide.com/incl_search_l.php?search=${encodeURIComponent(term)}&simple=1`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } }
    );
    if (!res.ok) return { results: [], indexLoaded: false };
    const html = await res.text();
    return { results: parseFideSearchHtml(html), indexLoaded: false };
  } catch {
    return { results: [], indexLoaded: false };
  }
}

function parseFideSearchHtml(html: string): import("@/lib/fideSearch").FidePlayerHit[] {
  const hits: import("@/lib/fideSearch").FidePlayerHit[] = [];
  try {
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    let m: RegExpExecArray | null;
    while ((m = rowRe.exec(html)) !== null) {
      const idMatch = m[1].match(/\/profile\/(\d+)/);
      if (!idMatch) continue;
      const cells = m[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
      const vals = cells.map((c) => c.replace(/<[^>]*>/g, "").trim());
      if (vals.length < 3) continue;
      hits.push({
        source: "fide",
        fideId: parseInt(idMatch[1]),
        name: vals[0] || idMatch[1],
        federation: vals[1] || undefined,
        title: vals[2] || undefined,
        standard: parseInt(vals[3]) || undefined,
        rapid: parseInt(vals[4]) || undefined,
        blitz: parseInt(vals[5]) || undefined,
        url: `https://ratings.fide.com/profile/${idMatch[1]}`,
      });
    }
    if (hits.length === 0) {
      const idRe = /\/profile\/(\d+)/g;
      let im: RegExpExecArray | null;
      const seen = new Set<number>();
      while ((im = idRe.exec(html)) !== null) {
        const id = parseInt(im[1]);
        if (seen.has(id)) continue;
        seen.add(id);
        hits.push({ source: "fide", fideId: id, name: `FIDE ${id}`, url: `https://ratings.fide.com/profile/${id}` });
      }
    }
  } catch {
    // ignore
  }
  return hits.slice(0, 20);
}

// ---------------- Chess.com ----------------
async function searchChessCom(term: string): Promise<import("@/lib/chesscom").ChessComPlayer[]> {
  const exact = await resolveChessComPlayer(term);
  const results: import("@/lib/chesscom").ChessComPlayer[] = [];
  if (exact) results.push(exact);
  if (!exact) {
    for (const candidate of guessChessComUsernames(term)) {
      if (results.length >= 5) break;
      const p = await resolveChessComPlayer(candidate);
      if (p && !results.find((r) => r.username === p.username)) results.push(p);
    }
  }
  return results;
}

// ---------------- GET /api/search/player ----------------
export async function GET(req: NextRequest) {
  const source = req.nextUrl.searchParams.get("source") || "lichess";
  const term = (req.nextUrl.searchParams.get("term") || "").trim();

  if (!term) return NextResponse.json({ error: "Missing term" }, { status: 400 });

  if (source === "lichess") {
    return NextResponse.json({ source, term, results: await searchLichess(term) });
  }
  if (source === "chesscom") {
    return NextResponse.json({ source, term, results: await searchChessCom(term) });
  }
  if (source === "fide") {
    return NextResponse.json({ source, term, ...(await searchFide(term)) });
  }
  return NextResponse.json({ error: "Unknown source" }, { status: 400 });
}

// ---------------- POST /api/search/h2h ----------------
interface H2HBody {
  player1?: { lichess?: string; chesscom?: string; fide?: number };
  player2?: { lichess?: string; chesscom?: string; fide?: number };
}

export async function POST(req: NextRequest) {
  let body: H2HBody;
  try {
    body = (await req.json()) as H2HBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const p1 = body.player1 || {};
  const p2 = body.player2 || {};

  // ---- Lichess head-to-head (games where they faced each other) ----
  let lichessGames: { white: string; black: string; result: string; url: string; date?: string; opening?: string }[] = [];
  let lichessError: string | undefined;
  if (p1.lichess && p2.lichess) {
    try {
      const res = await fetch(
        `https://lichess.org/api/games/user/${encodeURIComponent(p1.lichess)}?vs=${encodeURIComponent(p2.lichess)}&max=30&pgnInJson=true&opening=true`,
        { headers: { Accept: "application/x-ndjson" } }
      );
      if (res.ok) {
        const text = await res.text();
        for (const line of text.trim().split("\n")) {
          if (!line.trim()) continue;
          try {
            const g = JSON.parse(line);
            lichessGames.push({
              white: g.players?.white?.user?.name || g.players?.white?.name || "White",
              black: g.players?.black?.user?.name || g.players?.black?.name || "Black",
              result: g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : "1/2-1/2",
              url: `https://lichess.org/${g.id}`,
              date: g.createdAt ? new Date(g.createdAt).toISOString().slice(0, 10) : undefined,
              opening: g.opening?.name,
            });
          } catch {
            // skip malformed line
          }
        }
      } else {
        lichessError = res.status === 404
          ? "No recorded games found between these Lichess players."
          : `Lichess returned ${res.status}.`;
      }
    } catch {
      lichessError = "Could not reach Lichess right now.";
    }
  }

  // ---- FIDE head-to-head (win/draw/loss from official records) ----
  let fideStats: Awaited<ReturnType<typeof fetchFideH2H>> = null;
  let fideError: string | undefined;
  if (p1.fide && p2.fide) {
    fideStats = await fetchFideH2H(p1.fide, p2.fide);
    if (!fideStats) {
      fideError = "FIDE head-to-head data is unavailable right now (FIDE's data service is offline or blocking automated access).";
    }
  }

  return NextResponse.json({
    player1: p1,
    player2: p2,
    lichess: { games: lichessGames, error: lichessError },
    fide: {
      stats: fideStats
        ? { totalGames: fideStats.totalGames, wins: fideStats.wins, draws: fideStats.draws, losses: fideStats.losses }
        : null,
      error: fideError,
    },
    chesscom: {
      supported: false,
      note: "Chess.com does not expose head-to-head records through a public API. Profiles are still linked above.",
    },
  });
}
