"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Swords, ExternalLink, ArrowLeft } from "lucide-react";

interface PlayerResult {
  username: string; title?: string; rating?: { bullet?: number; blitz?: number; rapid?: number; classical?: number }; url: string; games?: number; win?: number; loss?: number; draw?: number; }

interface H2HGame { white: string; black: string; result: string; url: string; }

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [data, setData] = useState<{ type: string; player1?: PlayerResult | null; player2?: PlayerResult | null; games?: H2HGame[]; results?: PlayerResult[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!q) { setLoading(false); return; }
    fetch("/api/search?q=" + encodeURIComponent(q)).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, [q]);

  if (loading) return <div className="wrap" style={{ padding: "32px 0" }}><div style={{ textAlign: "center", padding: 48 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-accent-muted)", animation: "pulse 1.5s ease-in-out infinite", margin: "0 auto 12px" }} /><div style={{ color: "var(--color-text-muted)" }}>Loading head-to-head...</div></div></div>;

  if (!data || data.type !== "h2h") return <div className="wrap" style={{ padding: "32px 0" }}><h1>No results</h1><Link href="/players" className="btn btn-outline" style={{ marginTop: 16 }}><ArrowLeft size={14} /> Back to search</Link></div>;

  const p1 = data.player1;
  const p2 = data.player2;
  const games = data.games || [];

  const p1Wins = games.filter(g => (g.white === p1?.username && g.result === "1-0") || (g.black === p1?.username && g.result === "0-1")).length;
  const p2Wins = games.filter(g => (g.white === p2?.username && g.result === "1-0") || (g.black === p2?.username && g.result === "0-1")).length;
  const draws = games.length - p1Wins - p2Wins;

  return (<div className="wrap" style={{ padding: "32px 0" }}>
    <Link href="/players" style={{ fontSize: 14, color: "var(--color-text-muted)", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}><ArrowLeft size={14} /> Back to search</Link>
    <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}><Swords size={28} style={{ display: "inline", marginRight: 8, color: "var(--color-gold)" }} />Head-to-Head</h1>

    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 24, marginBottom: 32, alignItems: "center" }}>
      <PlayerCard player={p1 ?? null} label="White" />
      <div style={{ textAlign: "center" }}><div style={{ fontSize: 36, fontWeight: 900, color: "var(--color-gold)" }}>{p1Wins} - {draws} - {p2Wins}</div><div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{games.length} games</div></div>
      <PlayerCard player={p2 ?? null} label="Black" />
    </div>

    {games.length > 0 && <div><h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Recent Games</h2><div style={{ display: "grid", gap: 8 }}>{games.map((g, i) => <a key={i} href={g.url} target="_blank" rel="noopener noreferrer" className="card board-card" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none" }}><div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14 }}><span style={{ fontWeight: g.result === "1-0" ? 700 : 500, color: g.result === "1-0" ? "var(--color-accent)" : "var(--color-text)" }}>{g.white}</span><span style={{ color: "var(--color-text-muted)" }}>vs</span><span style={{ fontWeight: g.result === "0-1" ? 700 : 500, color: g.result === "0-1" ? "var(--color-accent)" : "var(--color-text)" }}>{g.black}</span></div><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14 }}>{g.result}</span><ExternalLink size={12} style={{ color: "var(--color-text-muted)" }} /></div></a>)}</div></div>}

    {games.length === 0 && <div style={{ padding: 32, background: "var(--color-bg-raised)", borderRadius: 12, border: "1px solid var(--color-border)", textAlign: "center" }}><p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>No recorded games found between these players on Lichess.</p></div>}
  </div>);
}

function PlayerCard({ player, label }: { player: PlayerResult | null; label: string }) {
  if (!player) return <div className="card" style={{ padding: 20, textAlign: "center" }}><div style={{ color: "var(--color-text-muted)" }}>{label} not found</div></div>;
  return (<div className="card" style={{ padding: 20 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--color-surface)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}>{player.username.charAt(0).toUpperCase()}</div>
      <div><div style={{ display: "flex", alignItems: "center", gap: 4 }}>{player.title && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-gold)", background: "var(--color-gold-muted)", padding: "1px 6px", borderRadius: 3 }}>{player.title}</span>}<span style={{ fontSize: 18, fontWeight: 700 }}>{player.username}</span></div><div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{player.games} games · {player.win}W {player.draw}D {player.loss}L</div></div>
    </div>
    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>{player.rating?.rapid && <div><div style={{ color: "var(--color-text-muted)" }}>Rapid</div><div style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{player.rating.rapid}</div></div>}{player.rating?.blitz && <div><div style={{ color: "var(--color-text-muted)" }}>Blitz</div><div style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{player.rating.blitz}</div></div>}{player.rating?.bullet && <div><div style={{ color: "var(--color-text-muted)" }}>Bullet</div><div style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{player.rating.bullet}</div></div>}</div>
    <a href={player.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ width: "100%", marginTop: 12, fontSize: 13, justifyContent: "center" }}>Lichess Profile <ExternalLink size={12} /></a>
  </div>);
}

export default function SearchPageWrapper() {
  return <Suspense fallback={<div className="wrap" style={{ padding: "32px 0" }}><div style={{ textAlign: "center", padding: 48 }}><div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-accent-muted)", animation: "pulse 1.5s ease-in-out infinite", margin: "0 auto 12px" }} /><div style={{ color: "var(--color-text-muted)" }}>Loading...</div></div></div>}><SearchContent /></Suspense>;
}