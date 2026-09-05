import { NextRequest, NextResponse } from "next/server";
import { getCustomBroadcast, deleteCustomBroadcast } from "@/lib/customBroadcast";

// GET /api/selfhost/[id] — session meta + current games.
// The live viewer polls this; local-PGN sessions update roughly once per second.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = getCustomBroadcast(id);
  if (!session) {
    return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: session.id,
    name: session.name,
    source: session.source,
    lichessRoundId: session.lichessRoundId,
    details: session.details,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    gameCount: session.games.length,
    games: session.games,
  });
}

// DELETE /api/selfhost/[id] — remove a session
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteCustomBroadcast(id);
  if (!ok) return NextResponse.json({ error: "Broadcast not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
