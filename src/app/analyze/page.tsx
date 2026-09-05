import type { Metadata } from "next";
import Link from "next/link";
import AnalyzePage from "./analyze-page";

export const metadata: Metadata = {
  title: "Game Analyzer",
  description: "Import any chess game as PGN and analyze it move by move with ChessStream Africa. Works with files from Lichess, Chess.com, and more.",
  alternates: { canonical: "/analyze" },
  openGraph: {
    title: "Game Analyzer | ChessStream Africa",
    description: "Analyze any chess game move by move with PGN import.",
  },
};

export default function Page() {
  return (
    <div>
      <div className="wrap" style={{ paddingTop: 24 }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
          <Link href="/" style={{ color: "var(--color-text-muted)" }}>Home</Link>
          <span>›</span>
          <span style={{ color: "var(--color-text)" }}>Game Analyzer</span>
        </nav>
      </div>
      <AnalyzePage />
    </div>
  );
}
