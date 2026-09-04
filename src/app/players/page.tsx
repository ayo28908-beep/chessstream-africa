"use client";

import { useState, useCallback } from "react";
import { Users, Search, ExternalLink, Swords, Trophy } from "lucide-react";

interface PlayerResult {
  username: string;
  title?: string;
  rating?: { bullet?: number; blitz?: number; rapid?: number; classical?: number };
  url: string;
  games?: number;
  win?: number;
  loss?: number;
  draw?: number;
}

export default function PlayersPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const isVsQuery = /vs.?/i.test(query);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/search?q=" + encodeURIComponent(q));
      if (res.ok) {
        const data = await res.json();
        if (data.type === "search") setResults(data.results || []);
        else if (data.type === "h2h") { window.location.href = "/search?q=" + encodeURIComponent(q); return; }
      }
    } catch { }
    setLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isVsQuery) { window.location.href = "/search?q=" + encodeURIComponent(query); return; }
    doSearch(query);
  };

  return (<div className="wrap" style={{ padding: "32px 0" }}>
    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Player Search</h1>
    <p style={{ color: "var(--color-text-muted)", marginBottom: 32, fontSize: 16 }}>Search chess players. Type two names with vs for head-to-head.</p>
    <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}><div style={{ display: "flex", gap: 8, maxWidth: 640 }}><div style={{ flex: 1, position: "relative" }}><Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search player, or Adeyemi vs Okeke..." style={{ width: "100%", padding: "12px 14px 12px 40px", background: "var(--color-bg-raised)", border: "1px solid var(--color-border)", borderRadius: 8, color: "var(--color-text)", fontSize: 15, outline: "none" }} /></div><button type="submit" className="btn btn-primary" style={{ padding: "12px 24px" }}>{isVsQuery ? <Swords size={16} /> : <Search size={16} />} {isVsQuery ? "Compare" : "Search"}</button></div>{isVsQuery && <div style={{ marginTop: 8, fontSize: 13, color: "var(--color-gold)" }}><Swords size={14} /> Head-to-head mode</div>}</form>
    {loading && <div style={{ textAlign: "center", padding: 48 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-accent-muted)", animation: "pulse 1.5s ease-in-out infinite", margin: "0 auto 12px" }} /><div style={{ color: "var(--color-text-muted)" }}>Searching...</div></div>}
    {!loading && searched && results.length === 0 && <div style={{ textAlign: "center", padding: 48 }}><Users size={48} style={{ color: "var(--color-text-muted)", marginBottom: 16 }} /><div style={{ fontSize: 18, fontWeight: 700 }}>No players found</div></div>}
    {!loading && results.length > 0 && <div style={{ display: "grid", gap: 12, maxWidth: 800 }}>{results.map((pl) => <div key={pl.username} className="card board-card" style={{ padding: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}><div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>{pl.username.charAt(0).toUpperCase()}</div><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{pl.title && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-gold)", background: "var(--color-gold-muted)", padding: "1px 6px", borderRadius: 3 }}>{pl.title}</span>}<span style={{ fontSize: 16, fontWeight: 700 }}>{pl.username}</span></div><div style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 2 }}>{pl.games} games {pl.win}W {pl.draw}D {pl.loss}L</div></div><div style={{ display: "flex", gap: 12, fontSize: 12 }}>{pl.rating?.rapid && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Rapid</div><div style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{pl.rating.rapid}</div></div>}{pl.rating?.blitz && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Blitz</div><div style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{pl.rating.blitz}</div></div>}{pl.rating?.bullet && <div style={{ textAlign: "center" }}><div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Bullet</div><div style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{pl.rating.bullet}</div></div>}</div><a href={pl.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ fontSize: 13, padding: "8px 12px" }}>Lichess <ExternalLink size={12} /></a></div></div>)}</div>}
    {!searched && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginTop: 16 }}><div className="card" style={{ padding: 20 }}><Search size={24} style={{ color: "var(--color-accent)", marginBottom: 12 }} /><h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Search Players</h3><p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Type any player name to search Lichess.</p></div><div className="card" style={{ padding: 20 }}><Swords size={24} style={{ color: "var(--color-gold)", marginBottom: 12 }} /><h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Head-to-Head</h3><p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Type two names with vs to see their matchup.</p></div><div className="card" style={{ padding: 20 }}><Trophy size={24} style={{ color: "var(--color-accent)", marginBottom: 12 }} /><h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Live Games</h3><p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Players in broadcasts appear on our broadcasts page.</p></div></div>}
  </div>);
}