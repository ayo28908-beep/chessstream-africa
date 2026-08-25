// ChessStream Africa — FIDE endpoint proxy
// Wraps the undocumented ratings.fide.com endpoints with caching and error handling.
//
// Endpoints (discovered via DevTools):
//   GET  a_data_opponents.php?a=1&pl=<FIDE_ID>        → list of opponents
//   POST a_data_stats.php?id1=<ID1>&id2=<ID2>          → head-to-head stats (id2=0 for career)
//
// These are UNOFFICIAL internal endpoints — they may change without notice.
// Always cache aggressively and handle failures gracefully.

const FIDE_BASE = "https://ratings.fide.com";

export interface FideOpponent {
  fideId: number;
  name: string;
  country: string;
  games: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface FideH2H {
  totalGames: number;
  wins: number;
  draws: number;
  losses: number;
  // Split by color
  whiteGames: number;
  whiteWins: number;
  whiteDraws: number;
  whiteLosses: number;
  blackGames: number;
  blackWins: number;
  blackDraws: number;
  blackLosses: number;
  // Split by time control
  standard: { games: number; wins: number; draws: number; losses: number };
  rapid: { games: number; wins: number; draws: number; losses: number };
  blitz: { games: number; wins: number; draws: number; losses: number };
}

export interface FidePlayerInfo {
  fideId: number;
  name: string;
  title?: string;
  federation: string;
  standard: number;
  rapid: number;
  blitz: number;
  born?: number;
}

// Simple in-memory cache (resets on server restart — good enough for dev)
const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

/**
 * Fetch a player's list of opponents from FIDE
 */
export async function fetchFideOpponents(fideId: number): Promise<FideOpponent[]> {
  const cacheKey = `opponents:${fideId}`;
  const cached = getCached<FideOpponent[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${FIDE_BASE}/a_data_opponents.php?a=1&pl=${fideId}`, {
      headers: {
        Accept: "application/json, text/html, */*",
        "User-Agent": "ChessStream Africa/1.0",
      },
    });

    if (!res.ok) throw new Error(`FIDE API returned ${res.status}`);

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    let opponents: FideOpponent[] = [];

    if (contentType.includes("json")) {
      // Direct JSON response
      const data = JSON.parse(text);
      opponents = parseOpponentsJSON(data);
    } else {
      // HTML/table response — parse it
      opponents = parseOpponentsHTML(text);
    }

    setCache(cacheKey, opponents);
    return opponents;
  } catch (err) {
    console.error(`FIDE opponents fetch failed for ${fideId}:`, err);
    return [];
  }
}

/**
 * Fetch head-to-head stats between two players
 */
export async function fetchFideH2H(
  player1Id: number,
  player2Id: number
): Promise<FideH2H | null> {
  const cacheKey = `h2h:${player1Id}:${player2Id}`;
  const cached = getCached<FideH2H>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(`${FIDE_BASE}/a_data_stats.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json, text/html, */*",
        "User-Agent": "ChessStream Africa/1.0",
      },
      body: `id1=${player1Id}&id2=${player2Id}`,
    });

    if (!res.ok) throw new Error(`FIDE API returned ${res.status}`);

    const text = await res.text();
    let stats: FideH2H;

    try {
      stats = parseH2HJSON(JSON.parse(text));
    } catch {
      stats = parseH2HHTML(text);
    }

    setCache(cacheKey, stats);
    return stats;
  } catch (err) {
    console.error(`FIDE H2H fetch failed for ${player1Id} vs ${player2Id}:`, err);
    return null;
  }
}

/**
 * Fetch career stats for a player (id2=0)
 */
export async function fetchFideCareerStats(fideId: number): Promise<FideH2H | null> {
  return fetchFideH2H(fideId, 0);
}

// ---- Parsers ----

function parseOpponentsJSON(data: unknown): FideOpponent[] {
  // FIDE returns various JSON shapes depending on the endpoint version
  const arr = Array.isArray(data) ? data : (data as Record<string, unknown>)?.opponents as unknown[];
  if (!arr) return [];

  return arr.map((raw: unknown) => {
    const r = raw as Record<string, unknown>;
    return {
      fideId: Number(r.fide_id_number || r.id || r.FIDE_ID || 0),
      name: String(r.name || r.player_name || ""),
      country: String(r.fed || r.federation || ""),
      games: Number(r.games || r.total_games || 0),
      wins: Number(r.wins || 0),
      draws: Number(r.draws || 0),
      losses: Number(r.losses || 0),
    };
  });
}

function parseOpponentsHTML(html: string): FideOpponent[] {
  const opponents: FideOpponent[] = [];
  // Try to extract data from table rows
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const cells = match[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    const values = cells.map((c) => c.replace(/<[^>]*>/g, "").trim());
    if (values.length >= 6) {
      opponents.push({
        fideId: parseInt(values[0]) || 0,
        name: values[1] || "",
        country: values[2] || "",
        games: parseInt(values[3]) || 0,
        wins: parseInt(values[4]) || 0,
        draws: parseInt(values[5]) || 0,
        losses: parseInt(values[6]) || 0,
      });
    }
  }
  return opponents;
}

function parseH2HJSON(data: unknown): FideH2H {
  const r = data as Record<string, unknown>;
  const empty = makeEmptyH2H();

  if (!r) return empty;

  // Try various field name patterns
  const total = Number(r.total_games || r.games || 0);
  const wins = Number(r.wins || 0);
  const draws = Number(r.draws || 0);
  const losses = Number(r.losses || 0);

  return {
    ...empty,
    totalGames: total,
    wins,
    draws,
    losses,
    whiteGames: Number(r.white_games || r.whiteGames || 0),
    whiteWins: Number(r.white_wins || r.whiteWins || 0),
    whiteDraws: Number(r.white_draws || r.whiteDraws || 0),
    whiteLosses: Number(r.white_losses || r.whiteLosses || 0),
    blackGames: Number(r.black_games || r.blackGames || 0),
    blackWins: Number(r.black_wins || r.blackWins || 0),
    blackDraws: Number(r.black_draws || r.blackDraws || 0),
    blackLosses: Number(r.black_losses || r.blackLosses || 0),
  };
}

function parseH2HHTML(html: string): FideH2H {
  const empty = makeEmptyH2H();
  // Basic HTML parsing fallback
  const num = (pattern: RegExp) => {
    const m = html.match(pattern);
    return m ? parseInt(m[1]) || 0 : 0;
  };

  return {
    ...empty,
    totalGames: num(/Total.*?(\d+)/i) || num(/games.*?(\d+)/i),
    wins: num(/Wins.*?(\d+)/i),
    draws: num(/Draws.*?(\d+)/i),
    losses: num(/Losses.*?(\d+)/i),
  };
}

function makeEmptyH2H(): FideH2H {
  return {
    totalGames: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    whiteGames: 0,
    whiteWins: 0,
    whiteDraws: 0,
    whiteLosses: 0,
    blackGames: 0,
    blackWins: 0,
    blackDraws: 0,
    blackLosses: 0,
    standard: { games: 0, wins: 0, draws: 0, losses: 0 },
    rapid: { games: 0, wins: 0, draws: 0, losses: 0 },
    blitz: { games: 0, wins: 0, draws: 0, losses: 0 },
  };
}
