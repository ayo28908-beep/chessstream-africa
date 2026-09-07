import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Lichess cloud-eval lines encode castling the way Stockfish UCI does:
 * rook-to-king square (e1h1, e1a1, e8h8, e8a8). chess.js only accepts the
 * two-square king move (e1g1 / e1c1 / e8g8 / e8c8) for castling, so normalize
 * before calling chess.move(). Returns the original squares when not castling.
 */
export function normalizeUciCastle(from: string, to: string): { from: string; to: string } {
  const white = from === "e1";
  const black = from === "e8";
  if (!white && !black) return { from, to };
  if (to === "h1" || to === "h8") return { from, to: white ? "g1" : "g8" }; // kingside
  if (to === "a1" || to === "a8") return { from, to: white ? "c1" : "c8" }; // queenside
  return { from, to };
}
