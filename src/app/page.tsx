import Link from "next/link";
import BroadcastCard from "@/components/BroadcastCard";
import FeaturesGrid from "@/components/FeaturesGrid";

async function fetchBroadcastsFromProxy(): Promise<{ id: string; name: string; slug: string; tier?: number; location?: string; dates?: number[] }[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/lichess/broadcasts`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const all: { id: string; name: string; slug: string; tier?: number; location?: string; dates?: number[] }[] = [];
    if (data.featured) all.push(data.featured);
    if (data.recent) {
      for (const r of data.recent) {
        if (!all.find((b) => b.id === r.id)) all.push(r);
      }
    }
    return all;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  let broadcasts: Awaited<ReturnType<typeof fetchBroadcastsFromProxy>> = [];
  try {
    broadcasts = await fetchBroadcastsFromProxy();
  } catch {
    // Lichess API unavailable — show empty state
  }

  return (
    <>
      {/* Hero */}
      <section style={{
        position: "relative",
        overflow: "hidden",
        padding: "100px 0 80px",
        background: "linear-gradient(180deg, rgba(46, 160, 67, 0.06) 0%, transparent 100%)",
      }}>
        <div className="wrap" style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 999,
            background: "var(--color-accent-muted)",
            color: "var(--color-accent)",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 24,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-live)", animation: "pulse 1.5s ease-in-out infinite" }} />
            Live chess broadcasting for Africa
          </div>

          <h1 style={{
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 900,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            marginBottom: 20,
          }}>
            Every move. <span style={{ color: "var(--color-accent)" }}>Live.</span>
            <br />
            Every board. <span style={{ color: "var(--color-gold)" }}>Everywhere.</span>
          </h1>

          <p style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--color-text-muted)",
            maxWidth: 640,
            margin: "0 auto 36px",
            lineHeight: 1.6,
          }}>
            The definitive platform for live chess broadcasting across Africa.
            Real-time boards, AI-powered commentary, per-game analysis, and
            deep player data — built for federations, tournaments, and fans.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/broadcasts" className="btn btn-primary" style={{ padding: "14px 28px", fontSize: 16 }}>
              Watch Live Broadcasts →
            </Link>
            <Link href="/schools" className="btn btn-outline" style={{ padding: "14px 28px", fontSize: 16 }}>
              Feature Your Federation
            </Link>
          </div>

          {/* Stats strip */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 48,
            marginTop: 56,
            flexWrap: "wrap",
          }}>
            {[
              { n: "1,693", label: "Nigerian players" },
              { n: "45+", label: "African federations" },
              { n: "Live", label: "Real-time boards" },
              { n: "Free", label: "For all" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--color-accent)" }}>{s.n}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live / Upcoming Broadcasts */}
      <section style={{ padding: "60px 0" }}>
        <div className="wrap">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800 }}>Live & Upcoming</h2>
              <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginTop: 4 }}>
                Real-time broadcasts from tournaments across Africa
              </p>
            </div>
            <Link href="/broadcasts" className="btn btn-outline" style={{ fontSize: 13 }}>
              View all →
            </Link>
          </div>

          {broadcasts.length > 0 ? (
            <div className="broadcast-grid">
              {broadcasts.slice(0, 6).map((b) => (
                <BroadcastCard key={b.id} tournament={b} />
              ))}
            </div>
          ) : (
            <div className="card" style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>♟</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No live broadcasts right now</h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: 20 }}>
                Check back soon or browse upcoming tournaments
              </p>
              <Link href="/broadcasts" className="btn btn-primary">
                Browse Broadcasts
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "60px 0", background: "var(--color-bg-raised)" }}>
        <div className="wrap">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              Why ChessStream Africa?
            </h2>
            <p style={{ color: "var(--color-text-muted)", maxWidth: 520, margin: "0 auto" }}>
              Built for African chess — not a generic streaming platform with chess bolted on.
            </p>
          </div>
          <FeaturesGrid />
        </div>
      </section>

      {/* Federation CTA */}
      <section style={{ padding: "80px 0", textAlign: "center" }}>
        <div className="wrap">
          <div style={{
            background: "linear-gradient(135deg, rgba(46, 160, 67, 0.08) 0%, rgba(240, 180, 41, 0.08) 100%)",
            border: "1px solid var(--color-border)",
            borderRadius: 16,
            padding: "56px 32px",
          }}>
            <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, marginBottom: 12 }}>
              Ready to broadcast your tournament?
            </h2>
            <p style={{ color: "var(--color-text-muted)", maxWidth: 480, margin: "0 auto 28px", fontSize: 16 }}>
              ChessStream Africa is free for African chess federations and schools.
              Get your events featured with live boards, commentary, and AI analysis.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <a href="mailto:hello@chessstream.africa" className="btn btn-primary" style={{ padding: "14px 28px", fontSize: 16 }}>
                Get Started — It&apos;s Free
              </a>
              <Link href="/about" className="btn btn-outline" style={{ padding: "14px 28px", fontSize: 16 }}>
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
