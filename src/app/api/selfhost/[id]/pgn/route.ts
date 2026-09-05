import { NextRequest, NextResponse } from "next/server";
import { updateBroadcastPgn } from "@/lib/customBroadcast";

// POST /api/selfhost/[id]/pgn  body: { pgn: "..." }
// The DGT board watcher calls this about once per second with the latest
// contents of the local PGN file, keeping the broadcast live during play.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { pgn?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.pgn || body.pgn.trim().length < 20) {
    return NextResponse.json({ error: "pgn field is required" }, { status: 400 });
  }

  const result = updateBroadcastPgn(id, body.pgn);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, gameCount: result.gameCount, updatedAt: Date.now() });
}
