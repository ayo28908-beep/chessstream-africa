"use client";

import { useState } from "react";
import FidePlayerDetail from "@/components/FidePlayerDetail";

const DEMO_PLAYERS = [
  { fideId: 8510003, name: "Anwuli, Daniel", title: "IM", rating: 2325, federation: "NGR", school: "Prochess Academy" },
  { fideId: 8510001, name: "Abdulraheem, A.", title: "FM", rating: 2316, federation: "NGR", school: "Lagos Chess Club" },
  { fideId: 8510002, name: "Kigigha, Bomo Lovet", title: "FM", rating: 2287, federation: "NGR", school: "Prochess Academy" },
  { fideId: 8510006, name: "Ekunke, Odey Goodness", title: "FM", rating: 2280, federation: "NGR", school: "NCF" },
  { fideId: 8510004, name: "Adebayo, Adegboyega Joel", rating: 2272, federation: "NGR", school: "Prochess Academy" },
  { fideId: 8510007, name: "Eyenuke, Denyefa Callistus", rating: 2256, federation: "NGR", school: "Lagos Chess Club" },
  { fideId: 8510008, name: "Adeyemi, Oluwafemi", rating: 2248, federation: "NGR", school: "Prochess Academy" },
  { fideId: 8510009, name: "Aikhoje, Odion", rating: 2246, federation: "NGR", school: "Edo Chess Association" },
  { fideId: 8510005, name: "Lapite, Oluwadurotimi", rating: 2228, federation: "NGR", school: "Prochess Academy" },
  { fideId: 8510011, name: "Sorungbe, Ademola", rating: 2228, federation: "NGR", school: "Lagos Chess Club" },
  { fideId: 8510010, name: "Akintoye, B.", rating: 2220, federation: "NGR", school: "NCF" },
  { fideId: 8510012, name: "Olape, Bunmi", rating: 2186, federation: "NGR", school: "Lagos Chess Club" },
];

export default function PlayersPage() {
  const [search, setSearch] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<typeof DEMO_PLAYERS[0] | null>(null);

  const filtered = DEMO_PLAYERS.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.fideId.toString().includes(search) ||
      (p.title || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Players</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
          Browse players and their head-to-head records — sourced from FIDE.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, maxWidth: 400 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, title, or FIDE ID..."
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {/* Main layout: list + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 20, alignItems: "start" }}>
        {/* Player list */}
        <div className="card" style={{ padding: 0 }}>
          {filtered.map((p) => (
            <div
              key={p.fideId}
              onClick={() => setSelectedPlayer(p)}
              style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr 60px",
                gap: 12,
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid var(--color-border-muted)",
                cursor: "pointer",
                background: selectedPlayer?.fideId === p.fideId ? "var(--color-surface)" : "transparent",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (selectedPlayer?.fideId !== p.fideId) {
                  (e.currentTarget as HTMLElement).style.background = "var(--color-surface-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (selectedPlayer?.fideId !== p.fideId) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                background: "var(--color-bg-overlay)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}>
                ♟
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {p.title && <span style={{ color: "var(--color-gold)", marginRight: 4, fontSize: 12 }}>{p.title}</span>}
                  {p.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {p.federation} · FIDE {p.fideId}
                </div>
              </div>
              <div style={{
                textAlign: "right",
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                fontSize: 14,
              }}>
                {p.rating}
              </div>
            </div>
          ))}
        </div>

        {/* Player detail / head-to-head */}
        <div style={{ position: "sticky", top: 72 }}>
          {selectedPlayer ? (
            <FidePlayerDetail player={selectedPlayer} allPlayers={DEMO_PLAYERS} />
          ) : (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>♟</div>
              <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
                Select a player to view their profile and head-to-head records
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
