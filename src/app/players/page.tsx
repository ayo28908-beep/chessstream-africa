"use client";

import { useState } from "react";
import { Users, Search, AlertTriangle } from "lucide-react";
import FidePlayerDetail from "@/components/FidePlayerDetail";

// Demo data — clearly labeled. Real FIDE data will be loaded from the database.
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
    <div className="wrap" style={{ padding: "32px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
          <Users style={{ display: "inline", width: 24, height: 24, verticalAlign: "middle", marginRight: 8 }} />
          Nigerian Players
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
          Browse players and their head-to-head records — sourced from FIDE
        </p>
      </div>

      {/* Demo warning */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderRadius: 8,
        background: "rgba(240,180,41,0.1)", border: "1px solid rgba(240,180,41,0.3)",
        marginBottom: 20, fontSize: 13, color: "var(--color-gold)",
      }}>
        <AlertTriangle size={16} style={{ flexShrink: 0 }} />
        <span>
          <strong>Demo data</strong> — These are sample players for testing. Real FIDE data for 1,693+ Nigerian players will be loaded from the database once deployed.
        </span>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, maxWidth: 400, position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, title, or FIDE ID..."
          style={{
            width: "100%", padding: "10px 14px 10px 36px", borderRadius: 8,
            border: "1px solid var(--color-border)", background: "var(--color-surface)",
            color: "var(--color-text)", fontSize: 14, outline: "none",
          }}
        />
      </div>

      {/* Main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 20, alignItems: "start" }}>
        {/* Player list */}
        <div className="card" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)", fontSize: 14 }}>
              No players match your search.
            </div>
          ) : (
            filtered.map((p) => (
              <div
                key={p.fideId}
                onClick={() => setSelectedPlayer(p)}
                style={{
                  display: "grid", gridTemplateColumns: "40px 1fr 60px", gap: 12, alignItems: "center",
                  padding: "12px 16px", borderBottom: "1px solid var(--color-border-muted)", cursor: "pointer",
                  background: selectedPlayer?.fideId === p.fideId ? "var(--color-surface)" : "transparent",
                  transition: "background 0.15s ease",
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 8, background: "var(--color-bg-overlay)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Users size={16} style={{ color: "var(--color-text-muted)" }} />
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
                <div style={{ textAlign: "right", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 14 }}>
                  {p.rating}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Player detail */}
        <div style={{ position: "sticky", top: 72 }}>
          {selectedPlayer ? (
            <FidePlayerDetail player={selectedPlayer} allPlayers={DEMO_PLAYERS} />
          ) : (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <Users size={32} style={{ color: "var(--color-text-muted)", marginBottom: 12 }} />
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
