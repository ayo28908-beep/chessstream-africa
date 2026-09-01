import Link from "next/link";
import { Home, Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "calc(100vh - 56px)",
      padding: 32,
      textAlign: "center",
    }}>
      <div style={{
        fontSize: 72,
        fontWeight: 900,
        color: "var(--color-border)",
        marginBottom: 16,
      }}>
        404
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Page not found
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 24, maxWidth: 400 }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Home size={16} /> Back to Home
      </Link>
    </div>
  );
}
