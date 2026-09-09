import { NextRequest, NextResponse } from "next/server";

// GET /api/lichess/round/[roundId]
// Resolve a SINGLE Lichess broadcast round link up to its parent tournament,
// so pasting one round URL can bring in every round AND every category
// (U12/U16/Open, Finals/Preliminary...) that the tournament groups together.
//
// Lichess has no public JSON endpoint for an individual round (it 404s), so
// we resolve it indirectly:
//   1. Fetch the round PGN — its [BroadcastURL] header contains the parent
//      tournament's SLUG.
//   2. Scan the public broadcast list (top 60 live/recent events) for a tour
//      whose slug matches (or whose rounds array contains the round id).
//   3. Fetch that tournament's detail — its `group.tours` array enumerates
//      every sibling category, and each category's rounds are fetched too.
// When the round belongs to no discoverable group, it is returned as a single
// "Linked round" section (the legacy behaviour).
//
// Response shape mirrors /api/lichess/tournament/[id]/sections so the setup
// client can auto-link the result with the same code path.

interface RoundLite {
  id: string;
  name: string;
}

interface GroupInfo {
  name: string;
  tours: { id: string; name: string }[];
}

interface TourDetail {
  group?: GroupInfo;
  name: string;
  rounds: RoundLite[];
}

async function fetchTournament(tournamentId: string): Promise<TourDetail | null> {
  const res = await fetch(`https://lichess.org/api/broadcast/${encodeURIComponent(tournamentId)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const tour = data.tour || {};
  const rounds: RoundLite[] = (data.rounds || []).map((r: Record<string, unknown>) => ({
    id: String(r.id || ""),
    name: String(r.name || r.id || "Round"),
  }));
  const rawGroup = data.group;
  let group: GroupInfo | undefined;
  if (rawGroup && typeof rawGroup === "object") {
    group = {
      name: String(rawGroup.name || ""),
      tours: Array.isArray(rawGroup.tours)
        ? rawGroup.tours.map((t: Record<string, unknown>) => ({ id: String(t.id || ""), name: String(t.name || t.id || "") }))
        : [],
    };
  } else if (typeof rawGroup === "string" && rawGroup.trim()) {
    group = { name: rawGroup.trim(), tours: [] };
  }
  return { group, name: String(tour.name || tournamentId), rounds };
}

// Turn a "Group | Category" name into just the category label.
function stripGroup(name: string, group?: string): string {
  if (group) {
    const prefix = `${group} | `;
    if (name.startsWith(prefix)) return name.slice(prefix.length).trim() || "Section";
    if (name === group) return "Main";
  }
  return name.trim() || "Section";
}

// Find the parent tournament of a round id: match the round PGN's tournament
// slug (or the round id itself) against the public broadcast list.
async function findParentTournament(roundId: string): Promise<{ id: string; name: string } | null> {
  // The round PGN carries [BroadcastURL ".../broadcast/<tournament-slug>/<round-slug>/<roundId>"].
  let slug: string | null = null;
  try {
    const pgnRes = await fetch(`https://lichess.org/api/broadcast/round/${encodeURIComponent(roundId)}.pgn`, {
      headers: { Accept: "application/x-chess-pgn" },
      signal: AbortSignal.timeout(8000),
    });
    if (pgnRes.ok) {
      const text = await pgnRes.text();
      const m =
        text.match(/\[BroadcastURL\s+"[^"]*\/broadcast\/([^/"]+)/) ||
        text.match(/\[Site\s+"[^"]*\/broadcast\/([^/"]+)/);
      if (m) slug = m[1];
    }
  } catch {
    // PGN unreachable — fall through to the id scan
  }

  // Scan the public broadcast list for a matching slug or round id.
  try {
    const listRes = await fetch("https://lichess.org/api/broadcast?nb=60", {
      headers: { Accept: "application/x-ndjson" },
      signal: AbortSignal.timeout(12000),
    });
    if (!listRes.ok) return null;
    const text = await listRes.text();
    for (const line of text.trim().split("\n")) {
      try {
        const obj = JSON.parse(line);
        const tour = obj.tour || {};
        const tourSlug = String(tour.slug || "");
        const rounds: string[] = Array.isArray(obj.rounds)
          ? obj.rounds.map((r: Record<string, unknown>) => String((r && r.id) || ""))
          : [];
        if ((slug && tourSlug === slug) || rounds.includes(roundId)) {
          return { id: String(tour.id || ""), name: String(tour.name || tour.id || "Tournament") };
        }
      } catch {
        // malformed line — keep scanning
      }
    }
  } catch {
    // list unreachable
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params;
  if (!roundId || roundId.length < 4) {
    return NextResponse.json({ error: "Invalid round id" }, { status: 400 });
  }

  // Verify the round actually exists (the PGN endpoint is the public probe).
  try {
<<<<<<< Updated upstream
    const probe = await fetch(`https://lichess.org/api/broadcast/round/${encodeURIComponent(roundId)}.pgn`, {
      headers: { Accept: "application/x-chess-pgn" },
      signal: AbortSignal.timeout(8000),
=======
    const res = await fetch(
      `https://lichess.org/api/broadcast/round/${roundId}.pgn`,
      { headers: { Accept: "application/x-chess-pgn" } }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Lichess round fetch failed", { roundId, status: res.status, body: text });
      return NextResponse.json(
        { error: `Lichess API returned ${res.status}`, detail: text },
        { status: 502 }
      );
    }

    const pgn = await res.text();
    const games = parsePGNtoGames(pgn);

    return NextResponse.json({
      roundId,
      gameCount: games.length,
      games,
>>>>>>> Stashed changes
    });
    if (probe.status === 404) {
      return NextResponse.json({ error: "No Lichess broadcast round with that id was found." }, { status: 404 });
    }
  } catch {
    // Lichess unreachable — still try to resolve; the client shows an error if needed
  }

  const parent = await findParentTournament(roundId);
  if (!parent) {
    // Round exists but its tournament is not in the recent list — single round.
    return NextResponse.json({
      id: roundId,
      resolved: false,
      count: 1,
      sections: [{ label: "Round", rounds: [{ id: roundId, name: "Linked round" }] }],
    });
  }

  const self = await fetchTournament(parent.id);
  if (!self || self.rounds.length === 0) {
    return NextResponse.json({
      id: roundId,
      tournamentId: parent.id,
      tournamentName: parent.name,
      resolved: false,
      count: 1,
      sections: [{ label: parent.name || "Round", rounds: [{ id: roundId, name: "Linked round" }] }],
    });
  }

  // Build the same section list as the tournament sections route: this
  // tournament plus every sibling category under the same broadcast group.
  const tours = self.group?.tours?.length ? self.group.tours : [];
  const selfLabel = tours.find((t) => t.id === parent.id)?.name || stripGroup(self.name, self.group?.name);
  const sections: { label: string; tournamentId: string; rounds: RoundLite[] }[] = [
    { label: selfLabel || "Main", tournamentId: parent.id, rounds: self.rounds },
  ];

  if (self.group) {
    const siblings = tours.length ? tours.filter((t) => t.id !== parent.id) : [];
    for (const sib of siblings) {
      try {
        const detail = await fetchTournament(sib.id);
        if (detail && detail.rounds.length > 0) {
          sections.push({
            label: sib.name.trim() || stripGroup(detail.name, self.group.name),
            tournamentId: sib.id,
            rounds: detail.rounds,
          });
        }
      } catch {
        // continue with the next sibling
      }
    }
  }

  return NextResponse.json({
    id: roundId,
    tournamentId: parent.id,
    tournamentName: parent.name,
    group: self.group?.name || null,
    resolved: true,
    count: sections.length,
    sections,
  });
}