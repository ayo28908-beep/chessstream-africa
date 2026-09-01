import { Metadata } from "next";
import BroadcastViewer from "@/components/BroadcastViewer";

export const metadata: Metadata = {
  title: "Live Broadcasts",
  description: "Watch live chess broadcasts from tournaments across Africa. Real-time boards, player ratings, and game analysis.",
  openGraph: {
    title: "Live Broadcasts | ChessStream Africa",
    description: "Watch live chess broadcasts from tournaments across Africa.",
  },
};

export default function BroadcastsPage() {
  return (
    <div className="wrap" style={{ padding: "32px 0" }}>
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Live Broadcasts</h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 32, fontSize: 16 }}>
        Real-time chess broadcasts from tournaments across Africa
      </p>
      <BroadcastViewer />
    </div>
  );
}
