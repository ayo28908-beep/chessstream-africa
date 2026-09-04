"use client";

import { Video } from "lucide-react";

export default function StreamerPanel() {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--color-border)",
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700 }}>Live Commentary</h3>
      </div>
      <div style={{ padding: 32, textAlign: "center" }}>
        <Video size={24} style={{ color: "var(--color-text-muted)", marginBottom: 8 }} />
        <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
          No live streams attached yet.
        </p>
        <p style={{ fontSize: 11, color: "var(--color-text-faint)", marginTop: 4 }}>
          Tournament organizers can attach stream links via the admin panel.
        </p>
      </div>
    </div>
  );
}
