import { NextRequest, NextResponse } from "next/server";
import { fetchFideOpponents } from "@/lib/fide";

// GET /api/fide/opponents?fideId=8510001
// Returns a player's list of opponents from FIDE
export async function GET(req: NextRequest) {
  const fideId = Number(req.nextUrl.searchParams.get("fideId"));

  if (!fideId || fideId < 100000) {
    return NextResponse.json(
      { error: "Invalid or missing fideId parameter" },
      { status: 400 }
    );
  }

  try {
    const opponents = await fetchFideOpponents(fideId);
    return NextResponse.json({
      fideId,
      count: opponents.length,
      opponents,
      cached: true, // Client can check if fresh data is needed
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch opponents from FIDE", detail: String(err) },
      { status: 502 }
    );
  }
}
