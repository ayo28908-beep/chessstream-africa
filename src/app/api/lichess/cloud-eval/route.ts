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
    return NextResponse.json(
      { error: "Engine data not available for this position", fen },
      { status: 404 }
    );
  }
  return NextResponse.json(result);
}
