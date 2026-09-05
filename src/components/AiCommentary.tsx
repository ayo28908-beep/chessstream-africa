"use client";

import { useMemo } from "react";
import { Brain, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { generateCommentary, type EvalPoint } from "@/lib/commentary";
import type { AiFrequency } from "@/lib/tournamentConfig";

const TYPE_ICON: Record<string, { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; color: string; label: string }> = {
  blunder: { icon: AlertTriangle, color: "var(--color-eval-bad)", label: "Blunder" },
  brilliant: { icon: TrendingUp, color: "var(--color-accent)", label: "Strong move" },
  shift: { icon: Activity, color: "var(--color-gold)", label: "Momentum" },
  quiet: { icon: Activity, color: "var(--color-text-muted)", label: "Balanced" },
};

export default function AiCommentary({
  evals,
  whiteName,
  blackName,
  enabled,
  threshold,
  frequency,
}: {
  evals: EvalPoint[];
  whiteName?: string;
  blackName?: string;
  enabled: boolean;
  threshold: number;
  frequency: AiFrequency;
}) {
  const items = useMemo(
    () =>
      generateCommentary(evals || [], {
        threshold,
        frequency,
        whiteName,
        blackName,
      }),
    [evals, threshold, frequency, whiteName, blackName]
  );

  if (!enabled || items.length === 0) return null;

  return (
    <div style={{ borderTop: "1px solid var(--color-border)", padding: "10px 14px", background: "var(--color-bg-overlay)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <Brain size={13} style={{ color: "var(--color-accent)" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          Move Commentary
        </span>
      </div>
      <div style={{ display: "grid", gap: 5 }}>
        {items.map((item) => {
          const meta = TYPE_ICON[item.type];
          const Icon = meta.icon;
          return (
            <div key={item.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, lineHeight: 1.45 }}>
              <Icon size={13} style={{ color: meta.color, flexShrink: 0, marginTop: 1 }} />
              <span style={{ color: "var(--color-text-muted)" }}>
                <span style={{ color: meta.color, fontWeight: 700 }}>{meta.label}:</span> {item.text}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: "var(--color-text-faint)", marginTop: 6 }}>
        Generated from live engine evaluations in the broadcast feed.
      </div>
    </div>
  );
}
