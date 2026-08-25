"use client";

const features = [
  {
    icon: "📺",
    title: "Live Board Grid",
    desc: "Watch every board in real-time with polling-based updates — no refresh needed.",
  },
  {
    icon: "💬",
    title: "Per-Board Chat",
    desc: "Discuss specific games with other viewers — not just tournament-wide chat.",
  },
  {
    icon: "🤖",
    title: "AI Commentary",
    desc: "AI-generated move analysis in real-time. Configurable per tournament.",
  },
  {
    icon: "📊",
    title: "Eval Bars",
    desc: "Polished, readable evaluation bars for every board showing engine analysis.",
  },
  {
    icon: "⚔️",
    title: "Head-to-Head",
    desc: "FIDE-sourced player history and win/draw records against any opponent.",
  },
  {
    icon: "🏆",
    title: "Qualification Scenarios",
    desc: "Live qualification/tiebreak panels with configurable logic per event.",
  },
  {
    icon: "🎥",
    title: "Streamer Links",
    desc: "Admin-attached live commentary streams per board or tournament.",
  },
  {
    icon: "🌍",
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
      {features.map((f) => (
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
          <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{f.title}</h3>
          <p style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.5 }}>{f.desc}</p>
        </div>
      ))}
    </div>
  );
}
