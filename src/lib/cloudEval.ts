// ChessStream Africa — Lichess cloud evaluation client.
// Used by the analyzer to get real engine analysis (eval + best moves) for
// any position. Responses are cached in memory to respect rate limits.

export interface CloudEvalResult {
  fen: string;
  depth: number;
  knodes: number;
  pvs: { moves: string; cp?: number; mate?: number }[];
}

const cache = new Map<string, { data: CloudEvalResult; expiry: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours — positions don't change

export async function getCloudEval(fen: string, multiPv = 3): Promise<CloudEvalResult | null> {
  const key = `${fen}|${multiPv}`;
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiry) return cached.data;

  try {
    const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${multiPv}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null; // 404 = position not in eval database, 429 = rate limited
    const data = (await res.json()) as CloudEvalResult;
    if (!data || !Array.isArray(data.pvs) || data.pvs.length === 0) return null;
    cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
    return data;
  } catch {
    return null;
  }
}

// Convert a centipawn eval + optional mate score into a display string.
export function formatEval(cp?: number, mate?: number): string {
  if (typeof mate === "number" && mate !== 0) {
    return mate > 0 ? `M${mate}` : `-M${Math.abs(mate)}`;
  }
  if (typeof cp !== "number") return "?";
  return (cp / 100).toFixed(1);
}
