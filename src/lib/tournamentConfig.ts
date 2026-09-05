// ChessStream Africa — per-tournament configuration
// Every feature (AI commentary, tiebreak logic, qualification line) is
// configurable per tournament. Organizers change these in /admin; the
// effective config is read by the public /api/config route.

export type TiebreakSystem =
  | "sonneborn-berger"
  | "buchholz"
  | "direct-encounter"
  | "most-wins";

export type AiFrequency = "all" | "notable" | "rare";

export interface StreamLink {
  id: string;
  title: string;
  url: string;
  platform: string; // YouTube | Twitch | Facebook | Other
  board: string; // "All boards" or "Board N"
  tournament: string;
  active: boolean;
}

export interface TournamentConfig {
  tournamentId: string;
  aiCommentary: boolean;
  aiThreshold: number; // min eval swing (in pawns) to trigger commentary
  aiFrequency: AiFrequency;
  tiebreakSystem: TiebreakSystem;
  qualificationSpots: number; // how many qualify from the tournament
  streamLinks: StreamLink[];
}

const DEFAULTS: Omit<TournamentConfig, "tournamentId"> = {
  aiCommentary: true,
  aiThreshold: 1.0,
  aiFrequency: "notable",
  tiebreakSystem: "sonneborn-berger",
  qualificationSpots: 4,
  streamLinks: [],
};

// Admin overrides (in-memory; replaced by real storage when a DB is wired up)
const overrides = new Map<string, Partial<TournamentConfig>>();

export function setTournamentConfig(id: string, patch: Partial<TournamentConfig>): TournamentConfig {
  const current = getTournamentConfig(id);
  const next = { ...current, ...patch, tournamentId: id };
  overrides.set(id, next);
  return next;
}

export function getTournamentConfig(id: string): TournamentConfig {
  const base: TournamentConfig = { tournamentId: id, ...DEFAULTS };
  const o = overrides.get(id);
  return o ? { ...base, ...o, tournamentId: id } : base;
}

// Stream links are part of the tournament config so viewers read them through one place
export function getStreamLinks(tournamentId: string): StreamLink[] {
  return getTournamentConfig(tournamentId).streamLinks;
}

export function addStreamLink(tournamentId: string, link: Omit<StreamLink, "id" | "tournament">): StreamLink {
  const created: StreamLink = { ...link, tournament: tournamentId, id: `s${Date.now()}` };
  const cfg = getTournamentConfig(tournamentId);
  setTournamentConfig(tournamentId, {
    streamLinks: [...cfg.streamLinks, created],
  });
  return created;
}

export function removeStreamLink(tournamentId: string, linkId: string): void {
  const cfg = getTournamentConfig(tournamentId);
  setTournamentConfig(tournamentId, {
    streamLinks: cfg.streamLinks.filter((s) => s.id !== linkId),
  });
}
