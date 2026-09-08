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

function handleMessage(event: MessageEvent) {
  const msg = String(event.data);
  if (msg.startsWith("info ")) {
    const parsed = parseInfoLine(msg);
    if (parsed) currentLines.push(parsed);
  } else if (msg.startsWith("bestmove")) {
    // Search finished for the current request — take the deepest line per
    // MultiPV index, ordered by MultiPV (so index 1 is the best move).
    const req = queue[0];
    if (req) {
      const byPv = new Map<number, ParsedLine>();
      for (const l of currentLines) {
        const prev = byPv.get(l.multipv);
        if (!prev || l.depth > prev.depth) byPv.set(l.multipv, l);
      }
      const ordered = [...byPv.values()].sort((a, b) => a.multipv - b.multipv);
      const lines = ordered.map((l) => ({ san: l.pv, evalCp: l.cp, evalMate: l.mate }));
      const maxDepth = ordered.reduce((m, l) => Math.max(m, l.depth), 0);
      req.resolve({
        fen: req.req.fen,
        depth: maxDepth || 1,
        lines,
      });
      queue.shift();
    }
    currentLines = [];
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
  currentFen = pending.req.fen;
  w.postMessage(`setoption name MultiPV value ${pending.req.multiPv || 3}`);
  w.postMessage(`position fen ${pending.req.fen}`);
  // Search to the requested depth but never run longer than 2s per position —
  // deep enough for stable evals, fast enough that stepping through a game
  // never feels stuck. (Stockfish stops at whichever limit comes first.)
  w.postMessage(`go depth ${pending.req.depth || 18} movetime 2000`);
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
      // request and keep only the newest one — stepping through a game fast
      // must not queue up a dozen stale positions that each take a second to
      // analyse (that backlog is what made the eval bar lag and flip-flop).
      // The running search finishes, its result is discarded as stale by the
      // caller, and the newest position runs immediately after.
      queue = [queue[0], pending];
    } else {
      queue.push(pending);
    }
    runNext();
  });
}