"use client";

// ChessStream Africa — client-side Stockfish engine (WASM).
//
// Runs Stockfish 18 (lite single-threaded WASM build) inside a Web Worker so
// every position gets a real evaluation — unlike Lichess cloud-eval, which
// only has data for popular analysed positions. The worker is a singleton and
// requests are queued so the engine is never asked for two positions at once.
//
// The wasm lives in /public/engine and must be served as application/wasm
// (see next.config headers + vercel.json), otherwise the worker throws on init.
//
// Latency design: search is capped at depth 14 / 1.2s (whichever comes first)
// so a position finishes in about a second instead of deepening forever, and
// partial results are streamed out via onUpdate as soon as depth 8 is reached
// (~0.3s) — the eval bar paints almost immediately and then refines.

export interface EngineLine {
  san: string;
  evalCp?: number;
  evalMate?: number;
}

export interface EngineResult {
  fen: string;
  depth: number;
  lines: EngineLine[];
}

export interface EngineRequest {
  fen: string;
  multiPv?: number;
  depth?: number;
  // Called with partial results as the search progresses (first paint).
  onUpdate?: (partial: EngineResult) => void;
}

interface ParsedLine {
  multipv: number;
  depth: number;
  cp?: number;
  mate?: number;
  pv: string;
}

let worker: Worker | null = null;
let initFailed = false;
let busy = false;

// FIFO queue of pending requests and their resolvers.
interface Pending {
  req: EngineRequest;
  resolve: (r: EngineResult | null) => void;
}
let queue: Pending[] = [];

// Parsed info lines for the request currently being searched.
let currentLines: ParsedLine[] = [];
let currentFen = "";
let partialEmittedAt = 0;

function buildResult(req: EngineRequest, fen: string): EngineResult {
  const byPv = new Map<number, ParsedLine>();
  for (const l of currentLines) {
    const prev = byPv.get(l.multipv);
    if (!prev || l.depth > prev.depth) byPv.set(l.multipv, l);
  }
  const ordered = [...byPv.values()].sort((a, b) => a.multipv - b.multipv);
  const lines = ordered.map((l) => ({ san: l.pv, evalCp: l.cp, evalMate: l.mate }));
  const maxDepth = ordered.reduce((m, l) => Math.max(m, l.depth), 0);
  return { fen, depth: maxDepth || 1, lines };
}

function handleMessage(event: MessageEvent) {
  const msg = String(event.data);
  if (msg.startsWith("info ")) {
    const parsed = parseInfoLine(msg);
    if (!parsed) return;
    currentLines.push(parsed);
    // Stream a partial result once every MultiPV line has a decent depth.
    // Emit again only when the deepest line gained ~3 more plies, so the
    // eval bar updates at most a handful of times per position.
    const req = queue[0];
    if (!req || !req.req.onUpdate) return;
    const multiPv = req.req.multiPv || 3;
    const covered = new Set(currentLines.filter((l) => l.depth >= 8).map((l) => l.multipv));
    if (covered.size < multiPv) return;
    const deepest = currentLines.reduce((m, l) => Math.max(m, l.depth), 0);
    if (deepest - partialEmittedAt < 3) return;
    const partial = buildResult(req.req, currentFen);
    if (partial.lines.length > 0) {
      partialEmittedAt = deepest;
      req.req.onUpdate(partial);
    }
  } else if (msg.startsWith("bestmove")) {
    const req = queue[0];
    if (req) {
      req.resolve(buildResult(req.req, currentFen));
      queue.shift();
    }
    currentLines = [];
    partialEmittedAt = 0;
    busy = false;
    runNext();
  }
}

function parseInfoLine(line: string): ParsedLine | null {
  const body = line.replace(/^info\s+/, "");
  const pvMatch = body.match(/\bpv\s+(.+)$/);
  const depthMatch = body.match(/\bdepth\s+(\d+)/);
  const cpMatch = body.match(/\bscore\s+cp\s+([-+]?\d+)/);
  const mateMatch = body.match(/\bscore\s+mate\s+([-+]?\d+)/);
  const multiMatch = body.match(/\bmultipv\s+(\d+)/);
  if (!pvMatch) return null;
  return {
    multipv: multiMatch ? parseInt(multiMatch[1], 10) : 1,
    depth: depthMatch ? parseInt(depthMatch[1], 10) : 0,
    cp: cpMatch ? parseInt(cpMatch[1], 10) : undefined,
    mate: mateMatch ? parseInt(mateMatch[1], 10) : undefined,
    pv: pvMatch[1].trim(),
  };
}

function ensureWorker(): Worker | null {
  if (initFailed) return null;
  if (worker) return worker;
  try {
    const w = new Worker("/engine/stockfish.js");
    worker = w;
    w.onmessage = handleMessage;
    w.onerror = () => {
      initFailed = true;
      worker = null;
      const failed = queue.splice(0, queue.length);
      for (const p of failed) p.resolve(null);
      busy = false;
    };
    // UCI init.
    w.postMessage("uci");
    w.postMessage("setoption name Threads value 1");
    w.postMessage("setoption name MultiPV value 3");
    return w;
  } catch {
    initFailed = true;
    worker = null;
    return null;
  }
}

function runNext() {
  if (busy) return;
  const pending = queue[0];
  if (!pending) return;
  const w = ensureWorker();
  if (!w) {
    const failed = queue.splice(0, queue.length);
    for (const p of failed) p.resolve(null);
    return;
  }
  busy = true;
  currentLines = [];
  partialEmittedAt = 0;
  currentFen = pending.req.fen;
  w.postMessage(`setoption name MultiPV value ${pending.req.multiPv || 3}`);
  w.postMessage(`position fen ${pending.req.fen}`);
  // Shallow-but-fast: depth 14 / 1.2s per position. Partial results stream in
  // from depth 8, so the user sees an eval almost immediately and the number
  // settles quickly instead of climbing for several seconds.
  w.postMessage(`go depth ${pending.req.depth || 14} movetime 1200`);
}

/**
 * Analyse a FEN with the local Stockfish WASM engine. Requests are queued so
 * only one analysis runs at a time. Returns null when the engine cannot start
 * (worker failed to load / WASM MIME mis-served), so the caller can fall back.
 */
export function analyzePosition(req: EngineRequest): Promise<EngineResult | null> {
  return new Promise((resolve) => {
    const pending = { req, resolve };
    if (busy && queue.length > 0) {
      // A search is already running (queue[0]). Drop every older *pending*
      // request (resolving them null so their awaiters don't hang) and keep
      // only the newest — stepping through a game fast must not queue up a
      // dozen stale positions that each take a second to analyse.
      const dropped = queue.slice(1);
      for (const d of dropped) d.resolve(null);
      queue = [queue[0], pending];
    } else {
      queue.push(pending);
    }
    runNext();
  });
}