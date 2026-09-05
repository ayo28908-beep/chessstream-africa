import { NextRequest, NextResponse } from "next/server";
import { syncRatingList, getIndexStatus, clearIndex } from "@/lib/fideSearch";

// Admin-only FIDE rating list sync.
//
// POST /api/fide/sync        — download players_list.zip (~40 MB), index it
//                              in memory, and report the player count.
// GET  /api/fide/sync        — report index status.
// DELETE /api/fide/sync      — clear the index.
//
// Passcode: header "x-admin-passcode" must equal ADMIN_PASSCODE (env) or the
// built-in default. Set ADMIN_PASSCODE on Vercel for production.

const DEFAULT_PASSCODE = "chessstream-admin";

function isAuthorized(req: NextRequest): boolean {
  const provided = req.headers.get("x-admin-passcode") || "";
  const expected = process.env.ADMIN_PASSCODE || DEFAULT_PASSCODE;
  return provided === expected;
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncRatingList();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "FIDE rating list sync failed. FIDE may be down or blocking this server.", detail: String(err) },
      { status: 502 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: getIndexStatus() });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  clearIndex();
  return NextResponse.json({ ok: true, status: getIndexStatus() });
}
