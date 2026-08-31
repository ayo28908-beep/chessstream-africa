"use client";

import { Tv, MessageSquare, Brain, BarChart3, Swords, Trophy, Video, Globe } from "lucide-react";

const features = [
  {
    icon: Tv,
    title: "Live Board Grid",
    desc: "Watch every board in real-time with polling-based updates — no refresh needed.",
  },
  {
    icon: MessageSquare,
    title: "Per-Board Chat",
    desc: "Discuss specific games with other viewers — not just tournament-wide chat.",
  },
  {
    icon: Brain,
    title: "AI Commentary",
    desc: "AI-generated move analysis in real-time. Configurable per tournament.",
  },
  {
    icon: BarChart3,
    title: "Eval Bars",
    desc: "Polished, readable evaluation bars for every board showing engine analysis.",
  },
  {
    icon: Swords,
    title: "Head-to-Head",
    desc: "FIDE-sourced player history and win/draw records against any opponent.",
  },
  {
    icon: Trophy,
    title: "Qualification Scenarios",
    desc: "Live qualification/tiebreak panels with configurable logic per event.",
  },
  {
    icon: Video,
    title: "Streamer Links",
    desc: "Admin-attached live commentary streams per board or tournament.",
  },
  {
    icon: Globe,
    title: "African Focus",
    desc: "Built for African federations, schools, and tournaments — free for all.",
  },
];

export default function FeaturesGrid() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
      gap: 16,
    }}>
      {features.map((f) => {
        const Icon = f.icon;
        return (
          <div
            key={f.title}
            className="card"
            style={{
              padding: "24px 20px",
              transition: "border-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
            }}
          >
            <Icon size={28} style={{ color: "var(--color-accent)", marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
            <p style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        );
      })}
    </div>
  );
}
