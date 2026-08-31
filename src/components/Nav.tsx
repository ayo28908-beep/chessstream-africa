"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Tv, Target, BookOpen, Users, Zap } from "lucide-react";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
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
            <Zap size={22} style={{ color: "var(--color-accent)" }} />
            <span>ChessStream</span>
            <span style={{ color: "var(--color-gold)", fontSize: 13, fontWeight: 600 }}>AFRICA</span>
          </Link>

          {/* Desktop nav */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}>
            <NavLink href="/broadcasts"><Tv size={14} /> Broadcasts</NavLink>
            <NavLink href="/analyze"><Zap size={14} /> Analyze</NavLink>
            <NavLink href="/puzzles"><Target size={14} /> Puzzles</NavLink>
            <NavLink href="/courses"><BookOpen size={14} /> Courses</NavLink>
            <NavLink href="/players"><Users size={14} /> Players</NavLink>
            <a
              href="https://prochess-lovat.vercel.app"
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
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              Prochess Academy <span style={{ fontSize: 11 }}>↗</span>
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="btn-ghost"
            style={{ display: "none", padding: 8 }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position: "fixed",
          top: 56,
          left: 0,
          right: 0,
          background: "var(--color-bg)",
          borderBottom: "1px solid var(--color-border)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 49,
        }}>
          <MobileNavLink href="/broadcasts" onClick={() => setOpen(false)}><Tv size={16} /> Broadcasts</MobileNavLink>
          <MobileNavLink href="/analyze" onClick={() => setOpen(false)}><Zap size={16} /> Analyzer</MobileNavLink>
          <MobileNavLink href="/puzzles" onClick={() => setOpen(false)}><Target size={16} /> Puzzles</MobileNavLink>
          <MobileNavLink href="/courses" onClick={() => setOpen(false)}><BookOpen size={16} /> Courses</MobileNavLink>
          <MobileNavLink href="/players" onClick={() => setOpen(false)}><Users size={16} /> Players</MobileNavLink>
          <a
            href="https://prochess-lovat.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 16px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-accent)",
              border: "1px solid var(--color-accent)",
              marginTop: 8,
            }}
            onClick={() => setOpen(false)}
          >
            Prochess Academy <span style={{ fontSize: 11 }}>↗</span>
          </a>
        </div>
      )}
    </>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="btn-ghost"
      style={{
        padding: "6px 12px",
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 500,
        color: "var(--color-text-muted)",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children, onClick }: { href: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 16px",
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 500,
        color: "var(--color-text-muted)",
      }}
    >
      {children}
    </Link>
  );
}
