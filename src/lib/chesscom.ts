// ChessStream Africa — Chess.com client.
// Chess.com has no public name-search API, so we resolve a username to a
// verified profile (name, title, country, avatar) and build the live profile
// link from it. All calls are wrapped so downtime never breaks the page.

export interface ChessComPlayer {
  source: "chesscom";
  username: string;
  name?: string;
  title?: string;
  country?: string;
  followers?: number;
  status?: string;
  avatar?: string;
  url: string;
}

interface PopupData {
  firstName?: string;
  lastName?: string;
  chessTitle?: string | null;
  countryName?: string;
  avatarUrl?: string;
  followers?: number;
  isEnabled?: boolean;
  isClosed?: boolean;
}

interface PubData {
  username?: string;
  name?: string;
  title?: string;
  country?: string;
  followers?: number;
  status?: string;
  url?: string;
}

export async function resolveChessComPlayer(term: string): Promise<ChessComPlayer | null> {
  const username = term.trim().toLowerCase().replace(/\s+/g, "").replace(/^@/, "");
  if (!/^[a-z0-9_\-]{3,25}$/.test(username)) return null;

  try {
    const [popupRes, pubRes] = await Promise.all([
      fetch(`https://www.chess.com/callback/user/popup/${username}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(`https://api.chess.com/pub/player/${username}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    let popup: PopupData | null = null;
    if (popupRes.ok) {
      const raw = await popupRes.text();
      if (raw.startsWith("{")) popup = JSON.parse(raw) as PopupData;
    }

    let pub: PubData | null = null;
    if (pubRes.ok) pub = (await pubRes.json()) as PubData;

    if (!pub && !popup) return null;

    const fullName = pub?.name || [popup?.firstName, popup?.lastName].filter(Boolean).join(" ") || undefined;
    return {
      source: "chesscom",
      username: pub?.username || username,
      name: fullName || undefined,
      title: pub?.title || popup?.chessTitle || undefined,
      country: popup?.countryName || (pub?.country?.split("/").pop()) || undefined,
      followers: pub?.followers ?? popup?.followers,
      status: pub?.status,
      avatar: popup?.avatarUrl,
      url: pub?.url || `https://www.chess.com/member/${username}`,
    };
  } catch {
    return null;
  }
}

// A list of candidate usernames derived from a human name (e.g. "Adeyemi O.
// Ayodeji" -> ["adeyemi", "adeyemioayodeji", ...]). Used so a name typed into
// the Chess.com box has a chance of resolving even though no search API exists.
export function guessChessComUsernames(term: string): string[] {
  const cleaned = term.trim().toLowerCase().replace(/[^a-z0-9\s_\-]/g, " ").replace(/\s+/g, " ");
  if (!cleaned) return [];
  const parts = cleaned.split(" ").filter(Boolean);
  if (parts.length === 0) return [];
  const candidates = new Set<string>();
  // full name compacted, first + last, first name, last name
  if (parts.length >= 2) {
    candidates.add(parts.join(""));
    candidates.add(parts[0] + parts[parts.length - 1]);
    candidates.add(parts[0] + "_" + parts[parts.length - 1]);
  }
  candidates.add(parts[0]);
  const last = parts[parts.length - 1];
  if (last.length >= 3) candidates.add(last);
  return [...candidates].filter((u) => /^[a-z0-9_\-]{3,25}$/.test(u)).slice(0, 6);
}
