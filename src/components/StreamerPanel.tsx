"use client";

import { useEffect, useState } from "react";
import { Video, ExternalLink } from "lucide-react";

interface StreamLink {
  id: string;
  title: string;
  url: string;
  platform: string;
  board: string;
  tournament: string;
  active: boolean;
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? m[1] : null;
}

function extractTwitchChannel(url: string): string | null {
  const m = url.match(/twitch\.tv\/([\w-]+)/);
  return m ? m[1] : null;
}

export default function StreamerPanel({ tournamentId }: { tournamentId?: string }) {
  const [links, setLinks] = useState<StreamLink[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!tournamentId) return;
    let cancelled = false;
    fetch(`/api/streams?tournament=${encodeURIComponent(tournamentId)}`)
      .then((r) => (r.ok ? r.json() : { links: [] }))
      .then((data) => {
        if (!cancelled) setLinks(data.links || []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [tournamentId]);

  if (!tournamentId) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <PanelHeader />
        <div style={{ padding: 28, textAlign: "center" }}>
          <Video size={24} style={{ color: "var(--color-text-muted)", marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Select a tournament to see attached streams.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
      <PanelHeader count={links.length} />
      {!loaded && (
        <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
          Loading streams...
        </div>
      )}
      {loaded && links.length === 0 && (
        <div style={{ padding: 24, textAlign: "center" }}>
          <Video size={24} style={{ color: "var(--color-text-muted)", marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No live streams attached to this tournament.</p>
          <p style={{ fontSize: 11, color: "var(--color-text-faint)", marginTop: 4 }}>
            Organizers can attach streams in the admin panel.
          </p>
        </div>
      )}
      {links.length > 0 && (
        <div style={{ display: "grid", gap: 12, padding: 12 }}>
          {links.map((link) => (
            <StreamEmbed key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}

function PanelHeader({ count }: { count?: number }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
        <Video size={14} style={{ color: "var(--color-live)" }} /> Live Commentary
      </h3>
      {typeof count === "number" && count > 0 && (
        <span style={{ fontSize: 11, color: "var(--color-live)", fontWeight: 600 }}>{count} live</span>
      )}
    </div>
  );
}

function StreamEmbed({ link }: { link: StreamLink }) {
  const ytId = extractYouTubeId(link.url);
  const twitchChannel = extractTwitchChannel(link.url);

  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflow: "hidden" }}>
      {ytId ? (
        <iframe
          src={`https://www.youtube.com/embed/${ytId}`}
          title={link.title}
          style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : twitchChannel ? (
        <iframe
          src={`https://player.twitch.tv/?channel=${twitchChannel}&parent=${typeof window !== "undefined" ? window.location.hostname : "localhost"}`}
          title={link.title}
          style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }}
          allowFullScreen
        />
      ) : (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", gap: 8, padding: 14, fontSize: 13, color: "var(--color-accent)" }}
        >
          <ExternalLink size={14} /> Open stream in new tab
        </a>
      )}
      <div style={{ padding: "8px 12px", borderTop: "1px solid var(--color-border-muted)" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600 }}>{link.title}</div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {link.platform} · {link.board}
        </div>
      </div>
    </div>
  );
}
