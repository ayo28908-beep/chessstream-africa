// ChessStream Africa — self-hosted broadcast store (in-memory).
// Lets an organizer create a broadcast from a local DGT PGN file (polled
// ~1x/second and uploaded here) or by linking Lichess broadcasts.
//
// A broadcast is made of SECTIONS (categories such as "Open", "U12", "U16",
// "Women" — or "Preliminary Stage", "Finals"). Each section contains ROUNDS.
// For Lichess-linked sections a round holds a Lichess round id (games are
// fetched live from Lichess); for local PGN sections a round holds parsed
// games uploaded from a file/folder.
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

export interface BroadcastRound {
  id: string;
  label: string;
  // Lichess sections: id is the Lichess round id, games is empty (fetched live).
  // Local sections: id is a local id, games holds the parsed games.
  games: ParsedGame[];
}

export interface BroadcastSection {
  id: string;
  label: string; // category name: "Open", "U12", "Finals", tournament name, ...
  source: "lichess" | "local-pgn";
  tournamentId?: string; // Lichess tournament id when a whole tournament was linked
  rounds: BroadcastRound[];
}

export interface CustomBroadcast {
  id: string;
  name: string;
  source: "local-pgn" | "pasted-pgn" | "lichess";
  lichessRoundId?: string; // legacy single-round sessions (kept for compat)
  sections: BroadcastSection[];
  details: BroadcastDetails;
  games: ParsedGame[]; // flat list of ALL games (backwards compat for viewers)
  createdAt: number;
  updatedAt: number;
  lastPgnError?: string;
}

// Store on globalThis so pages and API route handlers (separate bundles in
// Next.js) share the same in-memory store within a process/instance.
const g = globalThis as unknown as { __chessstreamSessions?: Map<string, CustomBroadcast> };
const sessions = g.__chessstreamSessions || (g.__chessstreamSessions = new Map<string, CustomBroadcast>());

function newId(prefix: string): string {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function createCustomBroadcast(
  name: string,
  source: CustomBroadcast["source"],
  details: BroadcastDetails,
  opts?: {
    lichessRoundId?: string;
    lichessSections?: { label?: string; tournamentId?: string; rounds?: { id: string; label: string }[] }[];
  }
): CustomBroadcast {
  const id = newId("");
  const sections: BroadcastSection[] = [];

  if (opts?.lichessSections && opts.lichessSections.length > 0) {
    for (const s of opts.lichessSections) {
      const rounds = (s.rounds || []).filter((r) => r && r.id);
      if (rounds.length === 0) continue;
      sections.push({
        id: newId("sec"),
        label: s.label?.trim() || "Main",
        source: "lichess",
        tournamentId: s.tournamentId || undefined,
        rounds: rounds.map((r) => ({ id: r.id, label: r.label || "Round", games: [] })),
      });
    }
  } else if (opts?.lichessRoundId) {
    sections.push({
      id: newId("sec"),
      label: "Main",
      source: "lichess",
      tournamentId: undefined,
      rounds: [{ id: opts.lichessRoundId, label: "Round 1", games: [] }],
    });
  }

  const session: CustomBroadcast = {
    id,
    name: name || "Untitled broadcast",
    source,
    lichessRoundId: opts?.lichessRoundId,
    sections,
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

/** Ensure a local-pgn section exists (creating it when needed) and return it. */
function ensureLocalSection(session: CustomBroadcast, category?: string): BroadcastSection {
  const label = (category || "").trim() || "Main";
  let section = session.sections.find((s) => s.source === "local-pgn" && s.label === label);
  if (!section) {
    section = { id: newId("sec"), label, source: "local-pgn", rounds: [] };
    session.sections.push(section);
  }
  return section;
}

/** Ensure a round exists inside a local-pgn section and return it. */
function ensureLocalRound(section: BroadcastSection, roundLabel?: string): BroadcastRound {
  const label = (roundLabel || "").trim() || "Round 1";
  let round = section.rounds.find((r) => r.label === label);
  if (!round) {
    round = { id: newId("rnd"), label, games: [] };
    section.rounds.push(round);
  }
  return round;
}

/**
 * Update a local-PGN session with new game data, optionally targeting a
 * category (section) and round. When neither is given, games land in the
 * "Main" section under "Round 1" (legacy single-file behaviour).
 */
export function updateBroadcastPgn(
  id: string,
  pgn: string,
  opts?: { category?: string; round?: string }
): { gameCount: number } | { error: string } {
  const session = sessions.get(id);
  if (!session) return { error: "Broadcast not found" };
  if (session.source === "lichess") return { error: "This broadcast is linked to Lichess, not a local PGN" };
  try {
    const games = parsePGNtoGames(pgn);
    if (games.length === 0) return { error: "No games found in that PGN" };

    const section = ensureLocalSection(session, opts?.category);
    const round = ensureLocalRound(section, opts?.round);
    // Replace the round's games (a re-uploaded file replaces that file's games),
    // then rebuild the flat list from all sections.
    round.games = games;
    session.games = session.sections
      .filter((s) => s.source === "local-pgn")
      .flatMap((s) => s.rounds.flatMap((r) => r.games));
    session.updatedAt = Date.now();
    session.lastPgnError = undefined;
    return { gameCount: session.games.length };
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