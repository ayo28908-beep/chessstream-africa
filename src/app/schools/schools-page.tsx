"use client";

import { useState } from "react";
import { School, Search } from "lucide-react";

export default function SchoolsPage() {
  const [search, setSearch] = useState("");

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Schools & Federations</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
          Chess academies, schools, and federations across Africa
        </p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schools or federations..."
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: 14,
              outline: "none",
            }}
          />
        </div>
      </div>

      <div style={{ padding: 48, textAlign: "center" }}>
        <School size={48} style={{ color: "var(--color-text-muted)", marginBottom: 16 }} />
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No schools listed yet</h3>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
          Schools and federations will appear here as they register. Contact us to get your institution listed.
        </p>
      </div>
    </div>
  );
}
