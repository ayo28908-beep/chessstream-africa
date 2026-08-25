"use client";

import { useState } from "react";

const DEMO_SCHOOLS = [
  { id: 1, name: "Prochess Academy", federation: "NCF", city: "Ibadan", players: 45, rating: 2180 },
  { id: 2, name: "Lagos Chess Club", federation: "NCF", city: "Lagos", players: 38, rating: 2150 },
  { id: 3, name: "Nigeria Chess Federation", federation: "NCF", city: "Abuja", players: 120, rating: 2200 },
  { id: 4, name: "Ghana Chess Association", federation: "GCA", city: "Accra", players: 65, rating: 2100 },
  { id: 5, name: "Kenya Chess Federation", federation: "KCF", city: "Nairobi", players: 82, rating: 2080 },
  { id: 6, name: "Edo Chess Association", federation: "NCF", city: "Benin City", players: 28, rating: 2050 },
  { id: 7, name: "Uganda Chess Federation", federation: "UCF", city: "Kampala", players: 55, rating: 2020 },
  { id: 8, name: "South Africa Chess Union", federation: "SACU", city: "Johannesburg", players: 95, rating: 2120 },
];

export default function SchoolsPage() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "players" | "rating">("rating");

  const filtered = DEMO_SCHOOLS
    .filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.federation.toLowerCase().includes(search.toLowerCase()) ||
        s.city.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "players") return b.players - a.players;
      if (sortBy === "rating") return b.rating - a.rating;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Schools & Federations</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
          Chess academies, schools, and federations across Africa
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search schools or federations..."
          style={{
            flex: 1,
            minWidth: 200,
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: 14,
            outline: "none",
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: 14,
            outline: "none",
          }}
        >
          <option value="rating">Sort by Rating</option>
          <option value="players">Sort by Players</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 12,
      }}>
        {filtered.map((school) => (
          <div key={school.id} className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "var(--color-accent-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 800,
                color: "var(--color-accent)",
              }}>
                {school.name.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>{school.name}</h3>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {school.federation} · {school.city}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Players: </span>
                <b>{school.players}</b>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>Avg rating: </span>
                <b style={{ fontFamily: "var(--font-mono)" }}>{school.rating}</b>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
