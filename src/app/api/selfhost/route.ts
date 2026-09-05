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
