import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms of service for using ChessStream Africa.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="wrap" style={{ padding: "24px 0", maxWidth: 720 }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
        <Link href="/" style={{ color: "var(--color-text-muted)" }}>Home</Link>
        <span>›</span>
        <span style={{ color: "var(--color-text)" }}>Terms of Service</span>
      </nav>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Terms of Service</h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 24 }}>Last updated: September 2026</p>

      <div style={{ display: "grid", gap: 20, fontSize: 14.5, lineHeight: 1.7, color: "var(--color-text-muted)" }}>
        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>Use of the service</h2>
          <p>ChessStream Africa provides live chess broadcasting, analysis tools, and player data. You may use these services for personal and educational purposes. Broadcasting or scraping the site at scale is not permitted.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>Commenting</h2>
          <p>Be respectful. We reserve the right to remove comments that are abusive, spam, or unrelated to the chess content. Administrators can delete messages at their discretion.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>Data sources</h2>
          <p>Broadcast data is provided by Lichess and subject to their terms. Player statistics are sourced from FIDE and Lichess public data. We do not guarantee the accuracy or availability of third-party data.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>Liability</h2>
          <p>The service is provided as is, without warranties of any kind. We are not liable for any damages arising from your use of the site or reliance on the data displayed.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--color-text)", marginBottom: 6 }}>Contact</h2>
          <p>Questions about these terms: <a href="mailto:hello@chessstream.africa" style={{ color: "var(--color-accent)" }}>hello@chessstream.africa</a>.</p>
        </section>
      </div>
    </div>
  );
}
