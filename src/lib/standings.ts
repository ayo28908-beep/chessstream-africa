// ChessStream Africa — standings computation with pluggable tiebreak rules.
// Each tournament picks its tiebreak system; the math is deterministic.

import type { TiebreakSystem } from "./tournamentConfig";

export interface StandingGame {
  white: string;
  black: string;
  result: string; // "1-0" | "0-1" | "1/2-1/2" | "*" (unfinished)
}

export interface StandingRow {
  rank: number;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  tiebreak: number;
  qualifies: boolean;
}

interface PlayerStat {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  opponents: { name: string; scored: number }[];
}

export function pointsFor(result: string, side: "w" | "b"): number {
  if (result === "*") return 0;
  if (result === "1-0") return side === "w" ? 1 : 0;
  if (result === "0-1") return side === "b" ? 1 : 0;
  if (result === "1/2-1/2") return 0.5;
  return 0;
}

export function computeStandings(
  games: StandingGame[],
  tiebreak: TiebreakSystem,
  qualificationSpots: number
): StandingRow[] {
  const stats = new Map<string, PlayerStat>();

  const ensure = (name: string): PlayerStat => {
    if (!stats.has(name)) {
      stats.set(name, { played: 0, wins: 0, draws: 0, losses: 0, points: 0, opponents: [] });
    }
    return stats.get(name)!;
  };

  for (const g of games) {
    if (g.result === "*") continue;
    const w = ensure(g.white);
    const b = ensure(g.black);
    const wp = pointsFor(g.result, "w");
    const bp = pointsFor(g.result, "b");
    w.played++; b.played++;
    if (wp === 1) w.wins++; else if (wp === 0.5) w.draws++; else w.losses++;
    if (bp === 1) b.wins++; else if (bp === 0.5) b.draws++; else b.losses++;
    w.points += wp;
    b.points += bp;
    w.opponents.push({ name: g.black, scored: bp });
    b.opponents.push({ name: g.white, scored: wp });
  }

  // Opponent totals are needed for Buchholz and Sonneborn-Berger
  const totals = new Map<string, number>();
  for (const [name, s] of stats) totals.set(name, s.points);

  const rows: StandingRow[] = Array.from(stats.entries()).map(([name, s]) => {
    let tiebreakValue = 0;
    switch (tiebreak) {
      case "most-wins":
        tiebreakValue = s.wins;
        break;
      case "sonneborn-berger":
        // SB = (sum of opponent totals for games won) + (half of opponent totals for draws)
        tiebreakValue = s.opponents.reduce((acc, o) => {
          const oppTotal = totals.get(o.name) || 0;
          return acc + (o.scored === 1 ? oppTotal : o.scored === 0.5 ? oppTotal / 2 : 0);
        }, 0);
        break;
      case "buchholz":
        tiebreakValue = s.opponents.reduce((acc, o) => acc + (totals.get(o.name) || 0), 0);
        break;
      case "direct-encounter":
        tiebreakValue = s.opponents.reduce((acc, o) => acc + o.scored, 0);
        break;
    }
    return {
      rank: 0,
      name,
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      points: s.points,
      tiebreak: Math.round(tiebreakValue * 100) / 100,
      qualifies: false,
    };
  });

  rows.sort((a, b) => b.points - a.points || b.tiebreak - a.tiebreak);
  rows.forEach((r, i) => {
    r.rank = i + 1;
    r.qualifies = r.rank <= Math.min(qualificationSpots, rows.length);
  });

  return rows;
}
