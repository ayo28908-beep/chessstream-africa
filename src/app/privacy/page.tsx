import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ChessStream Africa collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="wrap" style={{ padding: "24px 0", maxWidth: 720 }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
        <Link href="/" style={{ color: "var(--color-text-muted)" }}>Home</Link>
        <span>›</span>
        <span style={{ color: "var(--color-text)" }}>Privacy Policy</span>
      </nav>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Privacy Policy</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 24 }}>Last updated: September 2026</p>

      <div style={{ display: "grid", gap: 20, fontSize: 14.5, lineHeight: 1.7, color: "var(--color-text-muted)" }}>
        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>What we collect</h2>
          <p>ChessStream Africa displays live chess broadcast data sourced from Lichess. We do not require an account to watch broadcasts, analyze games, or solve puzzles.</p>
          <p style={{ marginTop: 8 }}>When you post a comment on a board, we store the name you enter and the comment text so other viewers can read the thread. Comment threads are held in server memory and are deleted when the server restarts.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>Player data</h2>
          <p>Player profiles, ratings, and head-to-head records are fetched from public sources: the Lichess API and ratings.fide.com. We cache this data for performance and do not sell or share it.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>Cookies and analytics</h2>
          <p>We use essential browser storage for preferences such as your admin session. If analytics are added later, this policy will be updated.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>Contact</h2>
          <p>Questions about this policy can be sent to <a href="mailto:hello@chessstream.africa" style={{ color: "var(--color-accent)" }}>hello@chessstream.africa</a>.</p>
        </section>
      </div>
    </div>
  );
}
