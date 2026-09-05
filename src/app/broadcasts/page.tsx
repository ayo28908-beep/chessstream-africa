import type { Metadata } from "next";
import Link from "next/link";
import BroadcastViewer from "@/components/BroadcastViewer";

export const metadata: Metadata = {
  title: "Live Broadcasts",
  description: "Watch live chess broadcasts from tournaments across Africa. Real-time boards, player ratings, move commentary, and game analysis.",
  alternates: { canonical: "/broadcasts" },
  openGraph: {
    title: "Live Broadcasts | ChessStream Africa",
    description: "Watch live chess broadcasts from tournaments across Africa.",
  },
};

export default function BroadcastsPage() {
  return (
    <div className="wrap" style={{ padding: "24px 0" }}>
      <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
        <Link href="/" style={{ color: "var(--color-text-muted)" }}>Home</Link>
        <span>›</span>
        <span style={{ color: "var(--color-text)" }}>Live Broadcasts</span>
      </nav>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Live Broadcasts</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 24, fontSize: 16 }}>
        Real-time chess broadcasts from tournaments across Africa
      </p>
      <BroadcastViewer />
    </div>
  );
}
