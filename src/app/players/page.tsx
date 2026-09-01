"use client";

import { useState, useEffect } from "react";
import { Users, Search, ExternalLink } from "lucide-react";

interface Player {
  name: string;
  fideId: string;
  rating: number;
  country: string;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // In a real implementation, this would fetch from a database
    // For now, we'll use the FIDE API
    setLoading(false);
  }, []);

  return (
    <div className="wrap" style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Player Directory</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 32, fontSize: 16 }}>
        Browse chess players and their FIDE profiles
      </p>

      <div style={{
        padding: 32,
        background: "var(--color-bg-raised)",
        borderRadius: 12,
        border: "1px solid var(--color-border)",
        textAlign: "center",
      }}>
        <Users size={48} style={{ color: "var(--color-text-muted)", marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Player profiles coming soon</h2>
        <p style={{ color: "var(--color-text-muted)", marginBottom: 20 }}>
          We&apos;re building a comprehensive player directory with FIDE ratings, game history, and head-to-head records.
        </p>
        <p style={{ fontSize: 14, color: "var(--color-text-muted)" }}>
          In the meantime, you can search for players on{" "}
          <a
            href="https://ratings.fide.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-accent)", display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            FIDE ratings <ExternalLink size={12} />
          </a>
        </p>
      </div>
    </div>
  );
}
