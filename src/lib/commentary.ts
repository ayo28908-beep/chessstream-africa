// ChessStream Africa — deterministic move commentary engine.
// Comments are generated from real engine evaluations embedded in the
// Lichess broadcast PGN ([%eval ...] annotations). No LLM, no fake text:
// every comment is derived from an actual evaluation swing.

import type { AiFrequency } from "./tournamentConfig";

export interface EvalPoint {
  moveNumber: number; // full move number (1, 2, 3...)
  san: string; // the move in SAN notation
  eval: number; // evaluation in pawns from White's perspective
  side: "w" | "b"; // which side played this move
}

export interface CommentaryItem {
  id: string;
  moveNumber: number;
  san: string;
  type: "blunder" | "brilliant" | "shift" | "quiet";
  text: string;
}

function fmt(v: number): string {
  return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
}

// Eval points are absolute (from White's perspective). For a move played by
// White, a drop in eval means White made a mistake. For Black, the reverse.
export function generateCommentary(
  evals: EvalPoint[],
  opts: {
    threshold: number;
    frequency: AiFrequency;
    whiteName?: string;
    blackName?: string;
  }
): CommentaryItem[] {
  if (!evals || evals.length < 2) return [];

  const { threshold, frequency } = opts;
  const whiteName = opts.whiteName || "White";
  const blackName = opts.blackName || "Black";
  const swingThreshold =
    frequency === "rare" ? threshold * 2.2 : frequency === "all" ? Math.min(threshold, 0.4) : threshold;

  const items: CommentaryItem[] = [];

  for (let i = 1; i < evals.length; i++) {
    const prev = evals[i - 1];
    const cur = evals[i];
    const sideName = cur.side === "w" ? whiteName : blackName;

    // swing from the mover's perspective
    const swing = cur.side === "w" ? cur.eval - prev.eval : prev.eval - cur.eval;

    if (swing <= -swingThreshold) {
      items.push({
        id: `m${cur.moveNumber}${cur.san}`,
        moveNumber: cur.moveNumber,
        san: cur.san,
        type: "blunder",
        text: `Blunder by ${sideName} on move ${cur.moveNumber}. ${cur.san} dropped the evaluation from ${fmt(prev.eval)} to ${fmt(cur.eval)}.`,
      });
    } else if (swing >= swingThreshold * 1.6) {
      items.push({
        id: `m${cur.moveNumber}${cur.san}`,
        moveNumber: cur.moveNumber,
        san: cur.san,
        type: "brilliant",
        text: `Strong move by ${sideName} on move ${cur.moveNumber}. ${cur.san} swung the evaluation from ${fmt(prev.eval)} to ${fmt(cur.eval)}.`,
      });
    } else if (swing >= swingThreshold) {
      items.push({
        id: `m${cur.moveNumber}${cur.san}`,
        moveNumber: cur.moveNumber,
        san: cur.san,
        type: "shift",
        text: `Momentum shift on move ${cur.moveNumber}: ${sideName}'s ${cur.san} improved the position from ${fmt(prev.eval)} to ${fmt(cur.eval)}.`,
      });
    } else if (frequency === "all") {
      items.push({
        id: `m${cur.moveNumber}${cur.san}`,
        moveNumber: cur.moveNumber,
        san: cur.san,
        type: "quiet",
        text: `Move ${cur.moveNumber}. ${cur.san} keeps the position balanced at ${fmt(cur.eval)}.`,
      });
    }
  }

  // Cap the number of items to keep the UI readable
  return items.slice(-8);
}
