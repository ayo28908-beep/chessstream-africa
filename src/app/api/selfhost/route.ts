import { NextRequest, NextResponse } from "next/server";
import { createCustomBroadcast, listCustomBroadcasts } from "@/lib/customBroadcast";

// POST /api/selfhost  body: { name, source, details, lichessRoundId?, lichessSections? }
// Creates a self-hosted broadcast session and returns its public id.
//
// Lichess source accepts either:
//   - lichessRoundId: a single round (legacy) — "Main" section with one round
//   - lichessSections: [{ label?, tournamentId?, roundIds? }, ...] — multiple
//     linked tournaments (categories like U12/U16/U18, or Finals/Open) each
//     with the full list of round ids to walk.
export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    source?: string;
    details?: Record<string, unknown>;
    lichessRoundId?: string;
    lichessSections?: { label?: string; tournamentId?: string; rounds?: { id: string; label: string }[] }[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const source = body.source === "lichess" ? "lichess" : body.source === "pasted-pgn" ? "pasted-pgn" : "local-pgn";

  if (source === "lichess") {
    const sections = Array.isArray(body.lichessSections) ? body.lichessSections.filter((s) => s && s.rounds?.length) : [];
    const hasSections = sections.length > 0;
    const hasLegacy = typeof body.lichessRoundId === "string" && body.lichessRoundId.trim().length >= 5;

    if (!hasSections && !hasLegacy) {
      return NextResponse.json(
        { error: "Link a Lichess broadcast round or tournament URL to continue" },
        { status: 400 }
      );
    }

    // Validate every tournament/round id resolves before creating the session,
    // so the user gets an actionable error instead of a silent empty viewer.
    const idsToCheck: string[] = [];
    if (hasSections) {
      for (const s of sections) {
        if (s.tournamentId) {
          try {
            const t = await fetch(`https://lichess.org/api/broadcast/${encodeURIComponent(s.tournamentId)}`, {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(8000),
            });
            if (t.status === 404) {
              return NextResponse.json(
                {
                  error: `The section "${s.label || "Main"}" does not point at a Lichess broadcast tournament. Open the tournament on Lichess (the page listing its rounds) and copy that URL.`,
                },
                { status: 400 }
              );
            }
          } catch {
            // Lichess unreachable — continue; the viewer polls and surfaces errors.
          }
        }
        for (const r of s.rounds || []) idsToCheck.push(r.id);
      }
    } else if (hasLegacy) {
      idsToCheck.push(body.lichessRoundId!.trim());
    }

    for (const roundId of idsToCheck) {
      try {
        const probe = await fetch(`https://lichess.org/api/broadcast/round/${roundId}.pgn`, {
          headers: { Accept: "application/x-chess-pgn" },
          signal: AbortSignal.timeout(8000),
        });
        if (probe.status === 404) {
          return NextResponse.json(
            {
              error:
                "One of those links does not point at a Lichess round. Open the round on Lichess (the page showing the list of boards) and copy its URL, or paste the round id itself. A tournament page link will not work for a round slot.",
            },
            { status: 400 }
          );
        }
      } catch {
        // network hiccup — the viewer will show a visible error if it persists
      }
    }

    const session = createCustomBroadcast(
      (body.name || "").trim(),
      source,
      body.details as never,
      hasSections
        ? { lichessSections: sections }
        : { lichessRoundId: body.lichessRoundId!.trim() }
    );

    return NextResponse.json(
      {
        id: session.id,
        name: session.name,
        source: session.source,
        sectionCount: session.sections.length,
        url: `/broadcast/${session.id}`,
      },
      { status: 201 }
    );
  }

  const session = createCustomBroadcast(
    (body.name || "").trim(),
    source,
    body.details as never
  );

  return NextResponse.json({
    id: session.id,
    name: session.name,
    source: session.source,
    url: `/broadcast/${session.id}`,
  }, { status: 201 });
}

// GET /api/selfhost — list active sessions (used by the setup flow)
export async function GET() {
  return NextResponse.json({ sessions: listCustomBroadcasts() });
}