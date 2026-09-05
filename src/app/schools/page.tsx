import type { Metadata } from "next";
import Link from "next/link";
import SchoolsPage from "./schools-page";

export const metadata: Metadata = {
  title: "Schools & Federations",
  description: "Chess academies, schools, and federations across Africa. Get your institution listed on ChessStream Africa.",
  alternates: { canonical: "/schools" },
  openGraph: {
    title: "Schools & Federations | ChessStream Africa",
    description: "Chess academies, schools, and federations across Africa.",
  },
};

export default function Page() {
  return (
    <div>
      <div className="wrap" style={{ paddingTop: 24 }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16, display: "flex", gap: 6 }}>
          <Link href="/" style={{ color: "var(--color-text-muted)" }}>Home</Link>
          <span>›</span>
          <span style={{ color: "var(--color-text)" }}>Schools & Federations</span>
        </nav>
      </div>
      <SchoolsPage />
    </div>
  );
}
