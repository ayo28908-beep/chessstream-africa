import { NextRequest, NextResponse } from "next/server";
import { fetchFideH2H, fetchFideCareerStats } from "@/lib/fide";

// GET /api/fide/stats?id1=8510001&id2=8510002
// Returns head-to-head stats between two players (or career stats if id2=0/omitted)
export async function GET(req: NextRequest) {
  const id1 = Number(req.nextUrl.searchParams.get("id1"));
  const id2Param = req.nextUrl.searchParams.get("id2");
  const id2 = id2Param ? Number(id2Param) : 0;

  if (!id1 || id1 < 100000) {
    return NextResponse.json(
      { error: "Invalid or missing id1 parameter" },
      { status: 400 }
    );
  }

  try {
    const stats = id2 ? await fetchFideH2H(id1, id2) : await fetchFideCareerStats(id1);
    if (!stats) {
      return NextResponse.json(
        { error: "No data found for these players" },
        { status: 404 }
      );
    }
    return NextResponse.json({ id1, id2, stats });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch stats from FIDE", detail: String(err) },
      { status: 502 }
    );
  }
}
