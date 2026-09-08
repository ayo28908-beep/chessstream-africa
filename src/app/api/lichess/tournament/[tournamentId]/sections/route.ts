import { NextRequest, NextResponse } from "next/server";

// GET /api/lichess/tournament/[tournamentId]/sections
// Given ONE Lichess broadcast tournament URL, discover every category under
// the same broadcast GROUP and return them all as linkable sections.
//
// Lichess groups related tournaments (e.g. "Tech Mahindra GCL 2026" groups
// "Finals" + "Preliminary Stage"; a school event groups "U12"/"U16"/"Open").
// The tournament detail endpoint returns `group` as an object:
//   { id, slug, name, tours: [{ id, name, active, live }, ...] }
// where `tours` already enumerates every sibling category — so we walk that
// list and fetch each sibling's rounds. A broadcast-list scan is kept as a
// fallback for the (unusual) case where group is only a plain string.

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
  // group is an object on the detail endpoint; tolerate a plain string too.
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
  return {
    group,
    name: String(tour.name || tournamentId),
    rounds,
  };
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

// Fallback sibling scan: when the group only carried a name (no tours list),
// scan the public broadcast list for other tournaments sharing that group.
async function scanSiblings(groupName: string, excludeId: string): Promise<{ id: string; name: string }[]> {
  const siblings: { id: string; name: string }[] = [];
  try {
    const listRes = await fetch("https://lichess.org/api/broadcast?nb=60", {
      headers: { Accept: "application/x-ndjson" },
      signal: AbortSignal.timeout(12000),
    });
    const text = await listRes.text();
    for (const line of text.trim().split("\n")) {
      try {
        const obj = JSON.parse(line);
        if (obj.group === groupName && obj.tour?.id && obj.tour.id !== excludeId) {
          siblings.push({ id: obj.tour.id, name: String(obj.tour.name || obj.tour.id) });
        }
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // list unreachable — return what we have
  }
  return siblings;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params;
  if (!tournamentId || tournamentId.length < 4) {
    return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 });
  }

  const self = await fetchTournament(tournamentId);
  if (!self) {
    return NextResponse.json(
      { error: "No Lichess broadcast tournament with that id was found" },
      { status: 404 }
    );
  }
  if (self.rounds.length === 0) {
    return NextResponse.json({ error: "That tournament has no rounds yet" }, { status: 404 });
  }

  // The group object already lists every sibling — use its clean names.
  const tours = self.group?.tours?.length ? self.group.tours : [];
  const selfLabel =
    tours.find((t) => t.id === tournamentId)?.name || stripGroup(self.name, self.group?.name);

  const sections: { label: string; tournamentId: string; rounds: RoundLite[] }[] = [
    { label: selfLabel || "Main", tournamentId, rounds: self.rounds },
  ];

  if (self.group) {
    const siblings = tours.length
      ? tours.filter((t) => t.id !== tournamentId)
      : await scanSiblings(self.group.name, tournamentId);

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
    group: self.group?.name || null,
    count: sections.length,
    sections,
  });
}