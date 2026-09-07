import { NextRequest, NextResponse } from "next/server";
import { updateBroadcastPgn } from "@/lib/customBroadcast";

// POST /api/selfhost/[id]/pgn  body: { pgn: "...", category?, round? }
// The DGT board watcher calls this about once per second with the latest
// contents of the local PGN file. Folder uploads pass category (subfolder,
// e.g. "U12") and round (file name) so games are organised into sections.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: { pgn?: string; category?: string; round?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.pgn || body.pgn.trim().length < 20) {
    return NextResponse.json({ error: "pgn field is required" }, { status: 400 });
  }

  const result = updateBroadcastPgn(id, body.pgn, {
    category: body.category,
    round: body.round,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    gameCount: result.gameCount,
    category: (body.category || "").trim() || "Main",
    round: (body.round || "").trim() || "Round 1",
    updatedAt: Date.now(),
  });
}