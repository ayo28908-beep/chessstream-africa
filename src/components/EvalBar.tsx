"use client";

import React from "react";

interface EvalBarProps {
  eval_: number;
  vertical?: boolean;
  style?: React.CSSProperties;
}

export default function EvalBar({ eval_, vertical = true, style }: EvalBarProps) {
  // Convert centipawns to a percentage (0-100) for white advantage
  // eval_ is in pawns: 0 = equal, +1 = white up a pawn, etc.
  // We use a sigmoid to clamp the display
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const sigmoid = (x: number) => 100 / (1 + Math.exp(-x * 0.8));
  const whitePercent = clamp(sigmoid(eval_), 2, 98);
  const blackPercent = 100 - whitePercent;

  const evalText = eval_ === 0
    ? "0.0"
    : eval_ > 0
      ? `+${eval_.toFixed(1)}`
      : eval_.toFixed(1);

  const evalColor = eval_ > 0.5
    ? "var(--color-eval-good)"
    : eval_ < -0.5
      ? "var(--color-eval-bad)"
      : "var(--color-text-muted)";

  if (vertical) {
    return (
      <div style={{
        position: "relative",
        width: 10,
        background: "var(--color-eval-white)",
        overflow: "hidden",
        ...style,
      }}>
        {/* Black portion (grows from top) */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${blackPercent}%`,
          background: "var(--color-eval-black)",
          transition: "height 0.5s ease",
        }} />
        {/* Eval text */}
        <div style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%) rotate(-90deg)",
          fontSize: 8,
          fontWeight: 700,
          fontFamily: "var(--font-mono)",
          color: "var(--color-text)",
          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}>
          {evalText}
        </div>
      </div>
    );
  }

  // Horizontal mode (for list view)
  return (
    <div style={{
      height: 6,
      borderRadius: 3,
      overflow: "hidden",
      display: "flex",
      background: "var(--color-eval-white)",
      ...style,
    }}>
      <div style={{
        width: `${whitePercent}%`,
        background: "var(--color-eval-white)",
        transition: "width 0.5s ease",
      }} />
      <div style={{
        width: `${blackPercent}%`,
        background: "var(--color-eval-black)",
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}
