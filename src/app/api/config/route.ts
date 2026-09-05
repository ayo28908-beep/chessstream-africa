import { NextRequest, NextResponse } from "next/server";
import {
  getTournamentConfig,
  setTournamentConfig,
  type TournamentConfig,
} from "@/lib/tournamentConfig";

// GET /api/config?tournament=<id>
//   Public: returns the effective (defaults + admin overrides) config.
// POST /api/config?tournament=<id>  (passcode required)
//   Organizers update per-tournament settings (AI commentary, tiebreak, etc.)

function isAdmin(req: NextRequest): boolean {
  const pass = process.env.ADMIN_PASSCODE || "chessstream-admin";
  return req.headers.get("x-admin-passcode") === pass;
}

export async function GET(req: NextRequest) {
  const tournament = req.nextUrl.searchParams.get("tournament") || "default";
  const cfg = getTournamentConfig(tournament);
  // Do not expose internal details; the client only needs the settings
  return NextResponse.json({ tournament, config: cfg });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tournament = req.nextUrl.searchParams.get("tournament");
  if (!tournament) {
    return NextResponse.json({ error: "Missing ?tournament=" }, { status: 400 });
  }

  let body: Partial<TournamentConfig>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Whitelist editable fields
  const patch: Partial<TournamentConfig> = {};
  if (typeof body.aiCommentary === "boolean") patch.aiCommentary = body.aiCommentary;
  if (typeof body.aiThreshold === "number") patch.aiThreshold = body.aiThreshold;
  if (["all", "notable", "rare"].includes(String(body.aiFrequency))) {
    patch.aiFrequency = body.aiFrequency as TournamentConfig["aiFrequency"];
  }
  if (["sonneborn-berger", "buchholz", "direct-encounter", "most-wins"].includes(String(body.tiebreakSystem))) {
    patch.tiebreakSystem = body.tiebreakSystem as TournamentConfig["tiebreakSystem"];
  }
  if (typeof body.qualificationSpots === "number" && body.qualificationSpots > 0) {
    patch.qualificationSpots = Math.floor(body.qualificationSpots);
  }

  const updated = setTournamentConfig(tournament, patch);
  return NextResponse.json({ tournament, config: updated });
}
