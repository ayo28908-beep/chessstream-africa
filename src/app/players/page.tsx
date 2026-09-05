import type { Metadata } from "next";
import Link from "next/link";
import PlayersPage from "./players-page";

export const metadata: Metadata = {
  title: "Player Search",
  description: "Search chess players by name, view their ratings and records, or compare two players head-to-head with Adeyemi vs Okeke style queries.",
  alternates: { canonical: "/players" },
  openGraph: {
    title: "Player Search | ChessStream Africa",
    description: "Search players and compare head-to-head records.",
  },
};

export default function Page() {
  return (
    <div>
      <div className="wrap" style={{ paddingTop: 24 }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
          <Link href="/" style={{ color: "var(--color-text-muted)" }}>Home</Link>
          <span>›</span>
          <span style={{ color: "var(--color-text)" }}>Player Search</span>
        </nav>
      </div>
      <PlayersPage />
    </div>
  );
}
