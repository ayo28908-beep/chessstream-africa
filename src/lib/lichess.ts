// ChessStream Africa — Lichess Broadcast API client
// Docs: https://lichess.org/api#tag/Broadcasts

const LICHESS_API = "https://lichess.org/api";

export interface BroadcastTournament {
  id: string;
  name: string;
  slug: string;
  description?: string;
  official?: boolean;
  tier?: number;
  dates?: { start: number; end: number } | number[];
}

export interface BroadcastRound {
  id: string;
  name: string;
  slug: string;
  startsAt?: number;
  finishesAt?: number;
  finished?: boolean;
  ongoing?: boolean;
  nbGames: number;
}

export interface BroadcastGame {
  id: string;
  status: string;
  white: BroadcastPlayer;
  black: BroadcastPlayer;
  fen: string;
  pgn: string;
  lastMove?: string;
  thinkTime?: number[];
}

export interface BroadcastPlayer {
  name: string;
  title?: string;
  rating?: number;
  ratingDiff?: number;
  fideId?: number;
  federation?: string;
}

export interface BroadcastWithRound {
  tournament: BroadcastTournament;
  round: BroadcastRound;
  games: BroadcastGame[];
}

// Fetch upcoming + ongoing broadcasts
// Lichess returns NDJSON (one JSON object per line), NOT a single JSON document.
export async function fetchBroadcasts(): Promise<BroadcastTournament[]> {
  const res = await fetch(`${LICHESS_API}/broadcast?nb=20`, {
    headers: { Accept: "application/x-ndjson" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Lichess API error: ${res.status}`);
  const text = await res.text();
  const broadcasts: BroadcastTournament[] = [];
  for (const line of text.trim().split("\n")) {
    if (!line.trim()) continue;
    try {
      const obj = JSON.parse(line);
      const t = obj.tour || obj;
      broadcasts.push({
        id: t.id || "",
        name: t.name || "",
        slug: t.slug || "",
        description: t.info?.format || t.description || "",
        official: t.official || false,
        tier: t.tier || 0,
        dates: t.dates || [],
      });
    } catch {
      // Skip malformed lines
    }
  }
  return broadcasts;
}

// Fetch rounds for a broadcast tournament
export async function fetchBroadcastRounds(
  broadcastId: string
): Promise<BroadcastRound[]> {
  const res = await fetch(`${LICHESS_API}/broadcast/${broadcastId}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Lichess API error: ${res.status}`);
  const data = await res.json();
  return data.rounds || [];
}

// Fetch games for a specific round
export async function fetchRoundGames(
  roundId: string
): Promise<BroadcastGame[]> {
  const res = await fetch(`${LICHESS_API}/broadcast/round/${roundId}.pgn`, {
    headers: { Accept: "application/x-chess-pgn" },
    next: { revalidate: 15 },
  });
  if (!res.ok) throw new Error(`Lichess API error: ${res.status}`);
  const pgn = await res.text();
  return parsePGNGames(pgn);
}

// Fetch a specific broadcast with its current round
export async function fetchBroadcast(
  broadcastId: string
): Promise<BroadcastWithRound | null> {
  const res = await fetch(`${LICHESS_API}/broadcast/-/-/${broadcastId}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 30 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

// Parse PGN text into structured game objects
function parsePGNGames(pgn: string): BroadcastGame[] {
  const games: BroadcastGame[] = [];
  const chunks = pgn.split("\n\n\n");

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const headers: Record<string, string> = {};
    const headerLines = chunk.split("\n").filter((l) => l.startsWith("["));
    for (const line of headerLines) {
      const m = line.match(/\[(\w+)\s+"([^"]*)"\]/);
      if (m) headers[m[1]] = m[2];
    }

    if (!headers.Event) continue;

    const whiteName = headers.White || "Unknown";
    const blackName = headers.Black || "Unknown";
    const whiteTitle = headers.WhiteTitle || undefined;
    const blackTitle = headers.BlackTitle || undefined;
    const whiteRating = headers.WhiteElo ? parseInt(headers.WhiteElo) : undefined;
    const blackRating = headers.BlackElo ? parseInt(headers.BlackElo) : undefined;
    const whiteFideId = headers.WhiteFideId ? parseInt(headers.WhiteFideId) : undefined;
    const blackFideId = headers.BlackFideId ? parseInt(headers.BlackFideId) : undefined;

    // Extract moves section
    const movesStart = chunk.indexOf("\n", chunk.indexOf("["));
    const movesSection = chunk.slice(movesStart).trim();
    // Remove result and comments
    const cleanMoves = movesSection
      .replace(/\{[^}]*\}/g, "")
      .replace(/\d+\.\.\./g, "")
      .trim();

    // Get last move for highlighting
    const moveTokens = cleanMoves.split(/\s+/).filter(
      (t) => t && !t.match(/^\d+\./) && t !== "1-0" && t !== "0-1" && t !== "1/2-1/2" && t !== "*"
    );
    const lastMove = moveTokens.length > 0 ? moveTokens[moveTokens.length - 1] : undefined;

    games.push({
      id: headers.LichessRoundId || headers.Link || headers.Event + "-" + whiteName,
      status: headers.Result || "*",
      white: {
        name: whiteName,
        title: whiteTitle,
        rating: whiteRating,
        fideId: whiteFideId,
      },
      black: {
        name: blackName,
        title: blackTitle,
        rating: blackRating,
        fideId: blackFideId,
      },
      fen: headers.FEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      pgn: chunk,
      lastMove,
    });
  }

  return games;
}

// Client-side polling for live updates
export function createPoller(
  roundId: string,
  intervalMs: number = 10000,
  onUpdate: (games: BroadcastGame[]) => void
): () => void {
  let active = true;

  const poll = async () => {
    if (!active) return;
    try {
      const games = await fetchRoundGames(roundId);
      onUpdate(games);
    } catch (err) {
      console.error("Poll error:", err);
    }
    if (active) setTimeout(poll, intervalMs);
  };

  poll();
  return () => { active = false; };
}
