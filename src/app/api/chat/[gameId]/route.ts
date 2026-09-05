import { NextRequest, NextResponse } from "next/server";

// GET/POST /api/chat/[gameId]
// Per-board comment threads. Messages are stored in memory (server-side).
// DELETE removes a message (moderation, passcode-gated).

export interface ChatMessage {
  id: string;
  gameId: string;
  user: string;
  text: string;
  moveNumber?: number; // optional link to a specific move
  time: string; // ISO timestamp
  isModerator: boolean;
}

// In-memory store keyed by game id. Volatile: survives between requests on a
// running server, resets on redeploy. Swap for a database when one is wired up.
const store = new Map<string, ChatMessage[]>();

const MAX_MESSAGES_PER_GAME = 200;

function messagesFor(gameId: string): ChatMessage[] {
  if (!store.has(gameId)) store.set(gameId, []);
  return store.get(gameId)!;
}

function isModerator(req: NextRequest): boolean {
  const pass = process.env.ADMIN_PASSCODE || "chessstream-admin";
  return req.headers.get("x-admin-passcode") === pass;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const messages = messagesFor(gameId).slice(-100);
  return NextResponse.json({ gameId, count: messages.length, messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  let body: { user?: string; text?: string; moveNumber?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = (body.text || "").trim();
  const user = (body.user || "Guest").trim().slice(0, 40);
  if (!text) {
    return NextResponse.json({ error: "Message text is required" }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "Message is too long (max 500 chars)" }, { status: 400 });
  }

  const list = messagesFor(gameId);
  if (list.length >= MAX_MESSAGES_PER_GAME) {
    // Keep the thread bounded: drop the oldest message
    list.shift();
  }

  const msg: ChatMessage = {
    id: `m${Date.now()}${Math.floor(Math.random() * 1000)}`,
    gameId,
    user: user || "Guest",
    text,
    moveNumber:
      typeof body.moveNumber === "number" && body.moveNumber > 0
        ? body.moveNumber
        : undefined,
    time: new Date().toISOString(),
    isModerator: false,
  };
  list.push(msg);
  return NextResponse.json({ message: msg }, { status: 201 });
}

// DELETE /api/chat/[gameId]?id=<messageId> — moderation, passcode required
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  if (!isModerator(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { gameId } = await params;
  const msgId = req.nextUrl.searchParams.get("id");
  if (!msgId) {
    return NextResponse.json({ error: "Missing ?id=" }, { status: 400 });
  }
  const list = messagesFor(gameId);
  const next = list.filter((m) => m.id !== msgId);
  store.set(gameId, next);
  return NextResponse.json({ ok: true });
}
