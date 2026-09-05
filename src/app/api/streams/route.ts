import { NextRequest, NextResponse } from "next/server";
import {
  addStreamLink,
  getStreamLinks,
  removeStreamLink,
} from "@/lib/tournamentConfig";

// GET  /api/streams?tournament=<id>&board=<optional>
//   Public: list of attached live stream links for a tournament (optionally a board).
// POST /api/streams  (passcode required) — attach a stream link
// DELETE /api/streams?id=<linkId>&tournament=<id>  (passcode required)

function isAdmin(req: NextRequest): boolean {
  const pass = process.env.ADMIN_PASSCODE || "chessstream-admin";
  return req.headers.get("x-admin-passcode") === pass;
}

export async function GET(req: NextRequest) {
  const tournament = req.nextUrl.searchParams.get("tournament") || "default";
  const board = req.nextUrl.searchParams.get("board");
  const all = getStreamLinks(tournament).filter((s) => s.active);
  const links = board ? all.filter((s) => s.board === board || s.board === "All boards") : all;
  return NextResponse.json({ tournament, count: links.length, links });
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let body: { tournament?: string; title?: string; url?: string; platform?: string; board?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tournament = (body.tournament || "").trim();
  const title = (body.title || "").trim();
  const url = (body.url || "").trim();
  const platform = ["YouTube", "Twitch", "Facebook", "Other"].includes(String(body.platform))
    ? String(body.platform)
    : "Other";
  const board = (body.board || "All boards").trim();

  if (!tournament || !title || !url) {
    return NextResponse.json(
      { error: "tournament, title and url are required" },
      { status: 400 }
    );
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "URL must start with http(s)://" }, { status: 400 });
  }

  const link = addStreamLink(tournament, {
    title,
    url,
    platform,
    board,
    active: true,
  });
  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tournament = req.nextUrl.searchParams.get("tournament");
  const id = req.nextUrl.searchParams.get("id");
  if (!tournament || !id) {
    return NextResponse.json({ error: "Missing ?tournament= and ?id=" }, { status: 400 });
  }
  removeStreamLink(tournament, id);
  return NextResponse.json({ ok: true });
}
