import { NextRequest, NextResponse } from "next/server";
import { getCloudEval } from "@/lib/cloudEval";

// GET /api/lichess/cloud-eval?fen=...&multiPv=3
// Server-side proxy for Lichess cloud evaluation (engine analysis).
// Returns nulls gracefully when the position is unknown or rate-limited.
export async function GET(req: NextRequest) {
  const fen = req.nextUrl.searchParams.get("fen") || "";
  const multiPv = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get("multiPv") || "3"), 1), 5);

  if (!fen) {
    return NextResponse.json({ error: "Missing fen parameter" }, { status: 400 });
  }

  const result = await getCloudEval(fen, multiPv);
  if (!result) {
    // Return 200 with an empty result set rather than 404: the client treats
    // "no pvs" as "no data for this position" (the local engine is the primary
    // path; cloud-eval is only a fallback). 404 would just add a console error.
    return NextResponse.json({ fen, depth: 0, pvs: [] });
  }
  return NextResponse.json(result);
}
