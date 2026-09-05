// ChessStream Africa — FIDE search + rating list sync.
//
// The FIDE website renders its search results through an internal endpoint
// (incl_search_l.php) and publishes full rating lists as a zip file
// (players_list.zip). Both are UNOFFICIAL integrations: they may change or be
// rate-limited at any time, so every call is defensive and cached.
//
// Sync flow: POST /api/fide/sync downloads the rating list, inflates it and
// builds an in-memory search index. Once loaded, searches hit the index
// instead of the live endpoint.

export interface FidePlayerHit {
  source: "fide";
  fideId: number;
  name: string;
  federation?: string;
  title?: string;
  standard?: number;
  rapid?: number;
  blitz?: number;
  url: string;
}

interface IndexEntry {
  id: number;
  name: string;
  fed?: string;
  title?: string;
  standard?: number;
  rapid?: number;
  blitz?: number;
}

// ---------------- Rating list index (in-memory) ----------------
let index: IndexEntry[] | null = null;
let indexLoadedAt: number | null = null;
let indexSource = "";

export function getIndexStatus() {
  return {
    loaded: index !== null,
    count: index ? index.length : 0,
    source: indexSource,
    loadedAt: indexLoadedAt,
  };
}

// The FIDE TXT list is comma-separated with no quoting of names.
// Columns (current format): id,name,fed,sex,title,wt,standard,std_games,
// rapid,rapid_games,blitz,blitz_games,birth
export function parseRatingListTxt(text: string): IndexEntry[] {
  const entries: IndexEntry[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.split(",");
    if (parts.length < 7) continue;
    const id = parseInt(parts[0]);
    if (!id) continue;
    entries.push({
      id,
      name: parts[1] || "",
      fed: parts[2] || undefined,
      title: parts[4] || undefined,
      standard: parseInt(parts[6]) || undefined,
      rapid: parseInt(parts[8]) || undefined,
      blitz: parseInt(parts[10]) || undefined,
    });
  }
  return entries;
}

export function searchIndex(term: string, limit = 40): FidePlayerHit[] {
  if (!index) return [];
  const t = term.trim().toLowerCase();
  if (t.length < 3) return [];
  const exact: FidePlayerHit[] = [];
  const startsWith: FidePlayerHit[] = [];
  const contains: FidePlayerHit[] = [];
  for (const e of index) {
    const name = e.name.toLowerCase();
    let hit: FidePlayerHit | null = null;
    if (name === t) {
      hit = toHit(e);
      if (hit) exact.push(hit);
    } else if (name.startsWith(t)) {
      hit = toHit(e);
      if (hit) startsWith.push(hit);
    } else if (name.includes(t)) {
      hit = toHit(e);
      if (hit) contains.push(hit);
    }
    if (exact.length + startsWith.length + contains.length > limit * 4) break;
  }
  return [...exact, ...startsWith, ...contains].slice(0, limit);
}

function toHit(e: IndexEntry): FidePlayerHit {
  return {
    source: "fide",
    fideId: e.id,
    name: e.name,
    federation: e.fed,
    title: e.title || undefined,
    standard: e.standard,
    rapid: e.rapid,
    blitz: e.blitz,
    url: `https://ratings.fide.com/profile/${e.id}`,
  };
}

// ---------------- ZIP inflate (minimal, deflate-only) ----------------
import { inflateRawSync } from "zlib";

function unzipFirstFile(buf: Buffer): { name: string; content: Buffer } | null {
  try {
    // Locate End of Central Directory record
    let eocd = -1;
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd === -1) return null;
    const cdOffset = buf.readUInt32LE(eocd + 16);
    const cdEntries = buf.readUInt16LE(eocd + 10);

    let cursor = cdOffset;
    for (let n = 0; n < cdEntries; n++) {
      if (buf.readUInt32LE(cursor) !== 0x02014b50) return null;
      const method = buf.readUInt16LE(cursor + 10);
      const compSize = buf.readUInt32LE(cursor + 20);
      const nameLen = buf.readUInt16LE(cursor + 28);
      const extraLen = buf.readUInt16LE(cursor + 30);
      const commentLen = buf.readUInt16LE(cursor + 32);
      const localOffset = buf.readUInt32LE(cursor + 42);
      const name = buf.subarray(cursor + 46, cursor + 46 + nameLen).toString("utf8");

      // Read local header to find the data start
      const lh = localOffset;
      const lNameLen = buf.readUInt16LE(lh + 26);
      const lExtraLen = buf.readUInt16LE(lh + 28);
      const dataStart = lh + 30 + lNameLen + lExtraLen;
      const comp = buf.subarray(dataStart, dataStart + compSize);

      if (name.endsWith("/")) { // directory entry
        cursor += 46 + nameLen + extraLen + commentLen;
        continue;
      }

      let content: Buffer;
      if (method === 0) content = comp;
      else if (method === 8) content = inflateRawSync(comp);
      else { cursor += 46 + nameLen + extraLen + commentLen; continue; }

      return { name, content };
    }
    return null;
  } catch {
    return null;
  }
}

// Download + index the FIDE rating list.
export async function syncRatingList(): Promise<{ count: number; source: string; bytes: number }> {
  const res = await fetch("https://ratings.fide.com/download/players_list.zip", {
    signal: AbortSignal.timeout(120000),
    headers: { "User-Agent": "ChessStream Africa/1.0" },
  });
  if (!res.ok) throw new Error(`FIDE download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const file = unzipFirstFile(buf);
  if (!file) throw new Error("Could not read the rating list archive");
  const entries = parseRatingListTxt(file.content.toString("utf8"));
  if (entries.length === 0) throw new Error("Rating list was empty");
  index = entries;
  indexSource = file.name;
  indexLoadedAt = Date.now();
  return { count: entries.length, source: file.name, bytes: buf.length };
}

export function clearIndex() {
  index = null;
  indexLoadedAt = null;
  indexSource = "";
}
