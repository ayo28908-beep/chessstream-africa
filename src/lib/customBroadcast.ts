// ChessStream Africa — self-hosted broadcast store (in-memory).
// Lets an organizer create a broadcast from a local DGT PGN file (polled
// ~1x/second and uploaded here) or by linking a Lichess broadcast.
//
// NOTE: in-memory only — sessions reset when the server restarts. Flagged in
// the UI; a database-backed version is the natural next step.

import { parsePGNtoGames, type ParsedGame } from "./pgn";

export interface BroadcastDetails {
  format?: string; // swiss | round-robin | knockout
  startDate?: string;
  endDate?: string;
  rounds?: string;
  timeControl?: string;
  venue?: string;
  country?: string;
  federation?: string;
  sections?: string;
  players?: string; // one per line "Name, Rating"
  description?: string;
}

export interface CustomBroadcast {
  id: string;
  name: string;
  source: "local-pgn" | "pasted-pgn" | "lichess";
  lichessRoundId?: string;
  details: BroadcastDetails;
  games: ParsedGame[];
  createdAt: number;
  updatedAt: number;
  lastPgnError?: string;
}

// Store on globalThis so pages and API route handlers (separate bundles in
// Next.js) share the same in-memory store within a process/instance.
const g = globalThis as unknown as { __chessstreamSessions?: Map<string, CustomBroadcast> };
const sessions = g.__chessstreamSessions || (g.__chessstreamSessions = new Map<string, CustomBroadcast>());

export function createCustomBroadcast(
  name: string,
  source: CustomBroadcast["source"],
  details: BroadcastDetails,
  lichessRoundId?: string
): CustomBroadcast {
  const id = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const session: CustomBroadcast = {
    id,
    name: name || "Untitled broadcast",
    source,
    lichessRoundId,
    details: details || {},
    games: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessions.set(id, session);
  return session;
}

export function getCustomBroadcast(id: string): CustomBroadcast | undefined {
  return sessions.get(id);
}

export function updateBroadcastPgn(id: string, pgn: string): { gameCount: number } | { error: string } {
  const session = sessions.get(id);
  if (!session) return { error: "Broadcast not found" };
  if (session.source === "lichess") return { error: "This broadcast is linked to Lichess, not a local PGN" };
  try {
    const games = parsePGNtoGames(pgn);
    if (games.length === 0) return { error: "No games found in that PGN" };
    session.games = games;
    session.updatedAt = Date.now();
    session.lastPgnError = undefined;
    return { gameCount: games.length };
  } catch {
    return { error: "Could not parse that PGN" };
  }
}

export function deleteCustomBroadcast(id: string): boolean {
  return sessions.delete(id);
}

export function listCustomBroadcasts(): { id: string; name: string; source: string; updatedAt: number; gameCount: number }[] {
  return [...sessions.values()].map((s) => ({
    id: s.id,
    name: s.name,
    source: s.source,
    updatedAt: s.updatedAt,
    gameCount: s.games.length,
  }));
}
