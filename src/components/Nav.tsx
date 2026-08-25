import Link from "next/link";

export default function Nav() {
  return (
    <nav style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      height: 56,
      background: "rgba(13, 17, 23, 0.95)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--color-border)",
      display: "flex",
      alignItems: "center",
    }}>
      <div className="wrap" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}>
        <Link href="/" style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 800,
          fontSize: 18,
        }}>
          <span style={{ fontSize: 24 }}>♟</span>
          <span>ChessStream</span>
          <span style={{ color: "var(--color-gold)", fontSize: 13, fontWeight: 600 }}>AFRICA</span>
        </Link>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}>
          <NavLink href="/broadcasts">Broadcasts</NavLink>
          <NavLink href="/players">Players</NavLink>
          <NavLink href="/schools">Schools</NavLink>
          <NavLink href="/admin">Admin</NavLink>
          <a
            href="http://127.0.0.1:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent)",
              marginLeft: 8,
            }}
          >
            ♟ Prochess Academy
          </a>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="btn-ghost"
      style={{
        padding: "6px 14px",
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        color: "var(--color-text-muted)",
      }}
    >
      {children}
    </Link>
  );
}
