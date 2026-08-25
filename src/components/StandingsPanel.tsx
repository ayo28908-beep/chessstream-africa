"use client";

const DEMO_STANDINGS = [
  { rank: 1, name: "Abdulraheem, A.", title: "FM", score: 7.5, tb: 48.5, rating: 2316 },
  { rank: 2, name: "Anwuli, D.", title: "IM", score: 7.0, tb: 45.0, rating: 2325 },
  { rank: 3, name: "Kigigha, B.", title: "FM", score: 6.5, tb: 42.5, rating: 2287 },
  { rank: 4, name: "Ekunke, O.", title: "FM", score: 6.5, tb: 40.0, rating: 2280 },
  { rank: 5, name: "Lapite, O.", score: 6.0, tb: 38.5, rating: 2228 },
  { rank: 6, name: "Adebayo, A.", score: 6.0, tb: 37.0, rating: 2272 },
  { rank: 7, name: "Sorungbe, A.", score: 5.5, tb: 35.5, rating: 2228 },
  { rank: 8, name: "Aikhoje, O.", score: 5.5, tb: 34.0, rating: 2246 },
  { rank: 9, name: "Olape, B.", score: 5.0, tb: 32.5, rating: 2186 },
  { rank: 10, name: "Akintoye, B.", score: 5.0, tb: 31.0, rating: 2220 },
  { rank: 11, name: "Adeyemi, O.", score: 4.5, tb: 29.5, rating: 2248 },
  { rank: 12, name: "Eyenuke, T.", score: 4.0, tb: 27.0, rating: 2256 },
];

export default function StandingsPanel() {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>Standings</h3>
        <select style={{
          padding: "3px 8px",
          borderRadius: 4,
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          color: "var(--color-text-muted)",
          fontSize: 11,
          fontWeight: 600,
        }}>
          <option>Buchholz</option>
          <option>Sonneborn-Berger</option>
          <option>Direct Encounter</option>
          <option>Most Wins</option>
        </select>
      </div>

      <div style={{ overflowY: "auto", maxHeight: 400 }}>
        {DEMO_STANDINGS.map((p, i) => (
          <div
            key={p.name}
            style={{
              display: "grid",
              gridTemplateColumns: "28px 1fr 50px 50px",
              gap: 8,
              alignItems: "center",
              padding: "8px 16px",
              borderBottom: "1px solid var(--color-border-muted)",
              background: i < 3 ? "var(--color-accent-muted)" : "transparent",
              fontSize: 13,
            }}
          >
            <span style={{
              fontWeight: 700,
              fontSize: 12,
              color: i < 3 ? "var(--color-accent)" : "var(--color-text-muted)",
              textAlign: "center",
            }}>
              {p.rank}
            </span>
            <div>
              <span style={{ fontWeight: 600 }}>
                {p.title && <span style={{ color: "var(--color-gold)", marginRight: 4, fontSize: 11 }}>{p.title}</span>}
                {p.name}
              </span>
            </div>
            <span style={{
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              textAlign: "right",
            }}>
              {p.score}
            </span>
            <span style={{
              fontSize: 11,
              color: "var(--color-text-muted)",
              fontFamily: "var(--font-mono)",
              textAlign: "right",
            }}>
              {p.tb}
            </span>
          </div>
        ))}
      </div>

      {/* Tiebreak legend */}
      <div style={{
        padding: "8px 16px",
        borderTop: "1px solid var(--color-border)",
        fontSize: 10,
        color: "var(--color-text-faint)",
        display: "flex",
        justifyContent: "space-between",
      }}>
        <span>Score</span>
        <span>TB1</span>
      </div>
    </div>
  );
}
