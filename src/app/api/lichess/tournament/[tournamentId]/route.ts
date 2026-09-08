import { NextRequest, NextResponse } from "next/server";

// GET /api/lichess/tournament/[tournamentId]
// Walks the Lichess broadcast tree one level: tournament -> all its rounds.
// Lets the setup flow link a whole tournament (every round/board) instead of
// a single round, and powers the "add another section (category)" flow.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params;

  if (!tournamentId || tournamentId.length < 4) {
    return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://lichess.org/api/broadcast/${tournamentId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 404) {
      return NextResponse.json(
        { error: "No Lichess broadcast tournament with that id was found" },
        { status: 404 }
      );
    }
    if (!res.ok) {
      console.error(`[ChessStream] Lichess tournament ${tournamentId} returned ${res.status}`);
      return NextResponse.json(
        { error: `Lichess API returned ${res.status}` },
        { status: 502 }
      );
    }

    const data = await res.json();
    const tour = data.tour || {};
    const rounds: {
      id: string;
      name: string;
      slug?: string;
      startsAt?: number;
      url?: string;
    }[] = (data.rounds || []).map((r: Record<string, unknown>) => ({
      id: String(r.id || ""),
      name: String(r.name || r.id || "Round"),
      slug: r.slug ? String(r.slug) : undefined,
      startsAt: typeof r.startsAt === "number" ? r.startsAt : undefined,
      url: r.url ? String(r.url) : undefined,
    }));

    if (rounds.length === 0) {
      return NextResponse.json(
        { error: "That tournament has no rounds yet" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tournament: {
        id: tour.id,
        name: tour.name,
        slug: tour.slug,
        url: tour.url,
        // The broadcast group lives at the top level of the API response
        // (a string naming the parent event, e.g. "Tech Mahindra GCL 2026").
        group: typeof data.group === "string" ? data.group : undefined,
      },
      roundCount: rounds.length,
      rounds,
      defaultRoundId: data.defaultRoundId || rounds[0]?.id,
    });
  } catch (err) {
    console.error(`[ChessStream] Failed to fetch tournament ${tournamentId}:`, err);
    return NextResponse.json(
      { error: "Failed to fetch tournament data from Lichess" },
      { status: 500 }
    );
  }
}