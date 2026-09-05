"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Shield, Save, Video, Trash2, Plus } from "lucide-react";

interface TournamentConfig {
  tournamentId: string;
  aiCommentary: boolean;
  aiThreshold: number;
  aiFrequency: "all" | "notable" | "rare";
  tiebreakSystem: string;
  qualificationSpots: number;
  streamLinks: { id: string; title: string; url: string; platform: string; board: string; active: boolean }[];
}

const PASSCODE_KEY = "cs_admin_passcode";

export default function AdminPage() {
  const [passcode, setPasscode] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [tournamentId, setTournamentId] = useState("default");
  const [knownTournaments, setKnownTournaments] = useState<{ id: string; name: string }[]>([]);
  const [config, setConfig] = useState<TournamentConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stream, setStream] = useState({ title: "", url: "", platform: "YouTube", board: "All boards" });

  useEffect(() => {
    const stored = sessionStorage.getItem(PASSCODE_KEY);
    if (stored) {
      setPasscode(stored);
      setAuthed(true);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch("/api/lichess/broadcasts")
      .then((r) => (r.ok ? r.json() : { featured: null, recent: [] }))
      .then((data) => {
        const list: { id: string; name: string }[] = [];
        if (data.featured) list.push({ id: data.featured.id, name: data.featured.name });
        for (const b of data.recent || []) {
          if (!list.find((x) => x.id === b.id)) list.push({ id: b.id, name: b.name });
        }
        setKnownTournaments(list);
      })
      .catch(() => {});
  }, [authed]);

  const tryLogin = () => {
    setAuthError(null);
    fetch(`/api/config?tournament=default`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
      body: JSON.stringify({}),
    })
      .then(async (res) => {
        if (res.ok) {
          sessionStorage.setItem(PASSCODE_KEY, passcode);
          setAuthed(true);
          setTournamentId("default");
        } else {
          const data = await res.json().catch(() => ({}));
          setAuthError(data.error || "Incorrect passcode");
        }
      })
      .catch(() => setAuthError("Network error"));
  };

  const loadConfig = useCallback(async (id: string) => {
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/config?tournament=${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
      }
    } catch {
      // keep old config
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authed && tournamentId) loadConfig(tournamentId);
  }, [authed, tournamentId, loadConfig]);

  const saveConfig = async () => {
    if (!config) return;
    const res = await fetch(`/api/config?tournament=${encodeURIComponent(config.tournamentId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
      body: JSON.stringify({
        aiCommentary: config.aiCommentary,
        aiThreshold: config.aiThreshold,
        aiFrequency: config.aiFrequency,
        tiebreakSystem: config.tiebreakSystem,
        qualificationSpots: config.qualificationSpots,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  const addStream = async () => {
    if (!stream.title.trim() || !stream.url.trim() || !config) return;
    const res = await fetch("/api/streams", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-passcode": passcode },
      body: JSON.stringify({
        tournament: config.tournamentId,
        title: stream.title,
        url: stream.url,
        platform: stream.platform,
        board: stream.board,
      }),
    });
    if (res.ok) {
      setStream({ title: "", url: "", platform: "YouTube", board: "All boards" });
      loadConfig(config.tournamentId);
    }
  };

  const removeStream = async (id: string) => {
    if (!config) return;
    const res = await fetch(`/api/streams?id=${id}&tournament=${encodeURIComponent(config.tournamentId)}`, {
      method: "DELETE",
      headers: { "x-admin-passcode": passcode },
    });
    if (res.ok) loadConfig(config.tournamentId);
  };

  if (!authed) {
    return (
      <div className="wrap" style={{ padding: "64px 0", maxWidth: 420 }}>
        <div className="card" style={{ padding: 32 }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--color-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Lock size={26} style={{ color: "var(--color-accent)" }} />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 800 }}>Admin Access</h1>
            <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginTop: 4 }}>
              Enter the organizer passcode to manage tournaments.
            </p>
          </div>
          {authError && (
            <div style={{ fontSize: 12.5, color: "var(--color-eval-bad)", background: "rgba(218,54,51,0.1)", padding: "8px 12px", borderRadius: 6, marginBottom: 12 }}>
              {authError}
            </div>
          )}
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryLogin()}
            placeholder="Passcode"
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 8,
              border: "1px solid var(--color-border)", background: "var(--color-bg)",
              color: "var(--color-text)", fontSize: 14, outline: "none", marginBottom: 12,
            }}
          />
          <button onClick={tryLogin} className="btn btn-primary" style={{ width: "100%", padding: "12px" }}>
            <Shield size={15} /> Unlock Admin Panel
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 60, maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Admin Panel</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
            Per-tournament settings: move commentary, tiebreak system, qualification line, stream links.
          </p>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem(PASSCODE_KEY); setAuthed(false); }}
          className="btn btn-ghost"
          style={{ fontSize: 13 }}
        >
          Log out
        </button>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>
          Tournament
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-text)", fontSize: 14,
              outline: "none", flex: 1, minWidth: 260,
            }}
          >
            <option value="default">Default settings (all tournaments)</option>
            {knownTournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            placeholder="Or paste a tournament ID"
            style={{
              padding: "10px 14px", borderRadius: 8, border: "1px solid var(--color-border)",
              background: "var(--color-surface)", color: "var(--color-text)", fontSize: 13,
              outline: "none", width: 220,
            }}
          />
        </div>
      </div>

      {loading && <div style={{ color: "var(--color-text-muted)", padding: 24 }}>Loading...</div>}

      {config && (
        <div style={{ display: "grid", gap: 20 }}>
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", fontWeight: 700, fontSize: 15 }}>
              Tournament Settings
            </div>
            <div style={{ padding: "16px 20px", display: "grid", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "var(--color-surface)", borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>AI Move Commentary</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    Rule-based commentary from live engine evals
                  </div>
                </div>
                <button
                  onClick={() => setConfig((c) => (c ? { ...c, aiCommentary: !c.aiCommentary } : c))}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: "none",
                    background: config.aiCommentary ? "var(--color-accent)" : "var(--color-border)",
                    cursor: "pointer", position: "relative", transition: "background 0.2s ease",
                  }}
                >
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 3, left: config.aiCommentary ? 23 : 3, transition: "left 0.2s ease" }} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Frequency
                  <select
                    value={config.aiFrequency}
                    onChange={(e) => setConfig((c) => (c ? { ...c, aiFrequency: e.target.value as TournamentConfig["aiFrequency"] } : c))}
                    style={selectStyle()}
                  >
                    <option value="notable">Notable moves only</option>
                    <option value="all">Every move</option>
                    <option value="rare">Only big swings</option>
                  </select>
                </label>
                <label style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Eval swing threshold ({config.aiThreshold} pawns)
                  <input
                    type="number" min={0.1} max={5} step={0.1}
                    value={config.aiThreshold}
                    onChange={(e) => setConfig((c) => (c ? { ...c, aiThreshold: parseFloat(e.target.value) || 1.0 } : c))}
                    style={inputStyle()}
                  />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Tiebreak system
                  <select
                    value={config.tiebreakSystem}
                    onChange={(e) => setConfig((c) => (c ? { ...c, tiebreakSystem: e.target.value } : c))}
                    style={selectStyle()}
                  >
                    <option value="sonneborn-berger">Sonneborn-Berger</option>
                    <option value="buchholz">Buchholz</option>
                    <option value="direct-encounter">Direct Encounter</option>
                    <option value="most-wins">Most Wins</option>
                  </select>
                </label>
                <label style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  Qualification spots
                  <input
                    type="number" min={1} max={64}
                    value={config.qualificationSpots}
                    onChange={(e) => setConfig((c) => (c ? { ...c, qualificationSpots: parseInt(e.target.value) || 4 } : c))}
                    style={inputStyle()}
                  />
                </label>
              </div>

              <button onClick={saveConfig} className="btn btn-primary" style={{ justifyContent: "center" }}>
                <Save size={14} /> {saved ? "Saved" : "Save Settings"}
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", fontWeight: 700, fontSize: 15 }}>
              Live Streamer Links ({config.streamLinks.length})
            </div>
            <div style={{ padding: "16px 20px" }}>
              {config.streamLinks.length > 0 && (
                <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                  {config.streamLinks.map((s) => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--color-surface)", borderRadius: 8, fontSize: 13 }}>
                      <Video size={15} style={{ color: "var(--color-live)" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600 }}>{s.title}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.platform} · {s.board} · {s.url}
                        </div>
                      </div>
                      <button onClick={() => removeStream(s.id)} style={{ background: "none", border: "none", color: "var(--color-text-faint)", cursor: "pointer" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
        
              )}

              <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Attach a stream link</h4>
              <div style={{ display: "grid", gap: 8 }}>
                <input value={stream.title} onChange={(e) => setStream((p) => ({ ...p, title: e.target.value }))} placeholder="Stream title (e.g. Board 1 Commentary)" style={inputStyle()} />
                <input value={stream.url} onChange={(e) => setStream((p) => ({ ...p, url: e.target.value }))} placeholder="Stream URL (YouTube / Twitch)" style={inputStyle()} />
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={stream.platform} onChange={(e) => setStream((p) => ({ ...p, platform: e.target.value }))} style={{ ...selectStyle(), flex: 1 }}>
                    <option>YouTube</option><option>Twitch</option><option>Facebook</option><option>Other</option>
                  </select>
                  <select value={stream.board} onChange={(e) => setStream((p) => ({ ...p, board: e.target.value }))} style={{ ...selectStyle(), flex: 1 }}>
                    <option>All boards</option><option>Board 1</option><option>Board 2</option><option>Board 3</option><option>Board 4</option>
                  </select>
                </div>
                <button onClick={addStream} className="btn btn-primary" style={{ justifyContent: "center" }}>
                  <Plus size={14} /> Attach Stream Link
                </button>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 11.5, color: "var(--color-text-faint)" }}>
            Settings apply immediately. Stream links and config are stored in memory on the server and reset on redeploy
            until a database is connected. The default admin passcode is &quot;chessstream-admin&quot;; set the ADMIN_PASSCODE
            environment variable in production.
          </p>
        </div>
      )}
    </div>
  );
}

function selectStyle(): React.CSSProperties {
  return {
    width: "100%", padding: "9px 12px", borderRadius: 6,
    border: "1px solid var(--color-border)", background: "var(--color-bg)",
    color: "var(--color-text)", fontSize: 13, outline: "none", marginTop: 4,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%", padding: "9px 12px", borderRadius: 6,
    border: "1px solid var(--color-border)", background: "var(--color-bg)",
    color: "var(--color-text)", fontSize: 13, outline: "none", marginTop: 4,
  };
}
