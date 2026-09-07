import { NextRequest, NextResponse } from "next/server";
import { createCustomBroadcast, listCustomBroadcasts } from "@/lib/customBroadcast";

// POST /api/selfhost  body: { name, source, details, lichessRoundId? }
// Creates a self-hosted broadcast session and returns its public id.
export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    source?: string;
    details?: Record<string, unknown>;
    lichessRoundId?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const source = body.source === "lichess" ? "lichess" : body.source === "pasted-pgn" ? "pasted-pgn" : "local-pgn";
  const lichessRoundId = typeof body.lichessRoundId === "string" ? body.lichessRoundId.trim() : undefined;

  if (source === "lichess" && (!lichessRoundId || lichessRoundId.length < 5)) {
    return NextResponse.json({ error: "A valid Lichess round id or broadcast URL is required for Lichess source" }, { status: 400 });
  }

  // For Lichess-sourced broadcasts, verify the round id resolves before
  // creating the session, so the user gets an actionable error instead of a
  // silent empty viewer. The only round-level Lichess endpoint is the PGN one
  // (there is no round JSON endpoint), so probe it with a HEAD-style GET.
  // Only a hard 404 (round doesn't exist — often a tournament URL pasted by
  // mistake) rejects; empty rounds (200, no games yet) and network hiccups
  // don't block creation — the viewer polls and surfaces errors.
  if (source === "lichess" && lichessRoundId) {
    try {
      const probe = await fetch(`https://lichess.org/api/broadcast/round/${lichessRoundId}.pgn`, {
        headers: { Accept: "application/x-chess-pgn" },
        signal: AbortSignal.timeout(8000),
      });
      if (probe.status === 404) {
        return NextResponse.json(
          {
            error:
              "That URL does not point at a Lichess round. Open the round on Lichess (the page showing the list of boards) and copy its URL, or paste the round id itself. A tournament page link will not work.",
          },
          { status: 400 }
        );
      }
    } catch (err) {
      // Lichess unreachable or timed out — continue anyway; the viewer polls
      // and will show a visible error if the round can't be loaded.
      console.error("[ChessStream] Could not verify Lichess round (continuing):", lichessRoundId, err);
    }
  }

  const session = createCustomBroadcast(
    (body.name || "").trim(),
    source,
    body.details as never,
    lichessRoundId
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
