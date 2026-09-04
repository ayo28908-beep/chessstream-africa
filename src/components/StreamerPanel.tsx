"use client";

const DEMO_STREAMS = [
  {
    id: "s1",
    title: "GM Commentary — Board 1 Analysis",
    streamer: "ChessCoach_NG",
    platform: "YouTube",
    url: "#",
    viewers: 234,
    board: "Board 1",
  },
  {
    id: "s2",
    title: "Nigerian Chess Commentary",
    streamer: "ChessStreamNG",
    platform: "Twitch",
    url: "#",
    viewers: 156,
    board: "All boards",
  },
];

export default function StreamerPanel() {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>Live Commentary</h3>
      </div>

      <div>
        {DEMO_STREAMS.map((stream) => (
          <a
            key={stream.id}
            href={stream.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              padding: "10px 16px",
              borderBottom: "1px solid var(--color-border-muted)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--color-surface)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: 3,
                background: stream.platform === "YouTube" ? "rgba(255,0,0,0.15)" : "rgba(145,70,255,0.15)",
                color: stream.platform === "YouTube" ? "#ff4444" : "#9146ff",
              }}>
                {stream.platform}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{stream.streamer}</span>
              <span style={{
                marginLeft: "auto",
                fontSize: 11,
                color: "var(--color-live)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}>
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--color-live)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }} />
                {stream.viewers}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{stream.title}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-faint)", marginTop: 2 }}>
              {stream.board}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
