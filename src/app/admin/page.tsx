"use client";

import { useState } from "react";

interface StreamLink {
  id: string;
  title: string;
  url: string;
  platform: string;
  board: string;
  tournament: string;
  active: boolean;
}

interface TournamentConfig {
  id: string;
  name: string;
  aiCommentary: boolean;
  tiebreakSystem: string;
  streamLinks: StreamLink[];
}

export default function AdminPage() {
  const [tournaments, setTournaments] = useState<{id: string; name: string; aiCommentary: boolean; tiebreakSystem: string; streamLinks: {id: string; title: string; url: string; platform: string; board: string; tournament: string; active: boolean}[]}[]>([]);
  const [newStream, setNewStream] = useState({ title: "", url: "", platform: "YouTube", board: "All boards" });
  const [selectedTournament, setSelectedTournament] = useState("");

  const addStreamLink = () => {
    if (!newStream.title || !newStream.url) return;
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id !== selectedTournament) return t;
        return {
          ...t,
          streamLinks: [
            ...t.streamLinks,
            { ...newStream, id: String(Date.now()), tournament: selectedTournament, active: true },
          ],
        };
      })
    );
    setNewStream({ title: "", url: "", platform: "YouTube", board: "All boards" });
  };

  const removeStreamLink = (tournamentId: string, streamId: string) => {
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id !== tournamentId) return t;
        return { ...t, streamLinks: t.streamLinks.filter((s) => s.id !== streamId) };
      })
    );
  };

  const toggleAI = (tournamentId: string) => {
    setTournaments((prev) =>
      prev.map((t) => (t.id === tournamentId ? { ...t, aiCommentary: !t.aiCommentary } : t))
    );
  };

  const currentTournament = tournaments.find((t) => t.id === selectedTournament);

  return (
    <div className="wrap" style={{ paddingTop: 32, paddingBottom: 60 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Admin Panel</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: 14 }}>
          Manage streamer links, AI commentary, and tournament settings.
        </p>
      </div>

      {/* Tournament selector */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", display: "block", marginBottom: 6 }}>
          Select Tournament
        </label>
        <select
          value={selectedTournament}
          onChange={(e) => setSelectedTournament(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
            fontSize: 14,
            outline: "none",
            minWidth: 300,
          }}
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {currentTournament && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>
          {/* Stream Links */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--color-border)",
              fontWeight: 700,
              fontSize: 15,
            }}>
              Live Streamer Links
            </div>

            <div style={{ padding: "16px 20px" }}>
              {currentTournament.streamLinks.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: 16 }}>
                  No stream links attached yet.
                </p>
              ) : (
                <div style={{ display: "grid", gap: 8, marginBottom: 16 }}>
                  {currentTournament.streamLinks.map((stream) => (
                    <div
                      key={stream.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 14px",
                        background: "var(--color-surface)",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: stream.platform === "YouTube" ? "rgba(255,0,0,0.15)" : "rgba(145,70,255,0.15)",
                        color: stream.platform === "YouTube" ? "#ff4444" : "#9146ff",
                      }}>
                        {stream.platform}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{stream.title}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          {stream.board}
                        </div>
                      </div>
                      <button
                        onClick={() => removeStreamLink(currentTournament.id, stream.id)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--color-text-faint)",
                          cursor: "pointer",
                          fontSize: 16,
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new stream */}
              <div style={{
                borderTop: "1px solid var(--color-border)",
                paddingTop: 16,
              }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Add Stream Link</h4>
                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    value={newStream.title}
                    onChange={(e) => setNewStream((p) => ({ ...p, title: e.target.value }))}
                    placeholder="Stream title (e.g. Board 1 Commentary)"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      color: "var(--color-text)",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <input
                    value={newStream.url}
                    onChange={(e) => setNewStream((p) => ({ ...p, url: e.target.value }))}
                    placeholder="Stream URL (YouTube/Twitch link)"
                    style={{
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg)",
                      color: "var(--color-text)",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={newStream.platform}
                      onChange={(e) => setNewStream((p) => ({ ...p, platform: e.target.value }))}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                        fontSize: 13,
                        outline: "none",
                        flex: 1,
                      }}
                    >
                      <option>YouTube</option>
                      <option>Twitch</option>
                      <option>Facebook</option>
                      <option>Other</option>
                    </select>
                    <select
                      value={newStream.board}
                      onChange={(e) => setNewStream((p) => ({ ...p, board: e.target.value }))}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 6,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-bg)",
                        color: "var(--color-text)",
                        fontSize: 13,
                        outline: "none",
                        flex: 1,
                      }}
                    >
                      <option>All boards</option>
                      <option>Board 1</option>
                      <option>Board 2</option>
                      <option>Board 3</option>
                      <option>Board 4</option>
                    </select>
                  </div>
                  <button
                    onClick={addStreamLink}
                    className="btn btn-primary"
                    style={{ fontSize: 13, padding: "8px 16px" }}
                  >
                    Add Stream Link
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tournament Settings */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{
              padding: "14px 20px",
              borderBottom: "1px solid var(--color-border)",
              fontWeight: 700,
              fontSize: 15,
            }}>
              Tournament Settings
            </div>

            <div style={{ padding: "16px 20px", display: "grid", gap: 16 }}>
              {/* AI Commentary toggle */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 14px",
                background: "var(--color-surface)",
                borderRadius: 8,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>AI Commentary</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    Enable AI-generated move analysis
                  </div>
                </div>
                <button
                  onClick={() => toggleAI(currentTournament.id)}
                  style={{
                    width: 44,
                    height: 24,
                    borderRadius: 12,
                    border: "none",
                    background: currentTournament.aiCommentary ? "var(--color-accent)" : "var(--color-border)",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s ease",
                  }}
                >
                  <div style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "white",
                    position: "absolute",
                    top: 3,
                    left: currentTournament.aiCommentary ? 23 : 3,
                    transition: "left 0.2s ease",
                  }} />
                </button>
              </div>

              {/* Tiebreak system */}
              <div style={{
                padding: "12px 14px",
                background: "var(--color-surface)",
                borderRadius: 8,
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Tiebreak System</div>
                <select
                  value={currentTournament.tiebreakSystem}
                  onChange={(e) => {
                    setTournaments((prev) =>
                      prev.map((t) =>
                        t.id === currentTournament.id
                          ? { ...t, tiebreakSystem: e.target.value }
                          : t
                      )
                    );
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-bg)",
                    color: "var(--color-text)",
                    fontSize: 13,
                    outline: "none",
                  }}
                >
                  <option>Buchholz</option>
                  <option>Sonneborn-Berger</option>
                  <option>Direct Encounter</option>
                  <option>Most Wins</option>
                  <option>Modified Median</option>
                </select>
              </div>

              {/* Tournament info */}
              <div style={{
                padding: "12px 14px",
                background: "var(--color-surface)",
                borderRadius: 8,
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Tournament Info</div>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>ID</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{currentTournament.id}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>Stream links</span>
                    <span style={{ fontWeight: 600 }}>{currentTournament.streamLinks.length}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>AI commentary</span>
                    <span style={{
                      color: currentTournament.aiCommentary ? "var(--color-accent)" : "var(--color-text-muted)",
                      fontWeight: 600,
                    }}>
                      {currentTournament.aiCommentary ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
