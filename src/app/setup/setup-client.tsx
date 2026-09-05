"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Radio, Calendar, MapPin, Clock, Users, FileText, Link2, FolderOpen,
  Check, AlertTriangle, ExternalLink, Play,
} from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
  background: "var(--color-bg)", color: "var(--color-text)", fontSize: 14, outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 5,
};

// Minimal typing for the File System Access API (Chrome/Edge only).
interface FileSystemFileHandle {
  getFile: () => Promise<File>;
}
declare global {
  interface Window {
    showOpenFilePicker?: (opts?: { types?: { description?: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle[]>;
  }
}

type SourceMode = "local-pgn" | "lichess";

export default function SetupClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [format, setFormat] = useState("swiss");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rounds, setRounds] = useState("");
  const [timeControl, setTimeControl] = useState("");
  const [venue, setVenue] = useState("");
  const [country, setCountry] = useState("");
  const [federation, setFederation] = useState("NGA");
  const [sections, setSections] = useState("");
  const [players, setPlayers] = useState("");
  const [description, setDescription] = useState("");

  const [mode, setMode] = useState<SourceMode>("local-pgn");
  const [lichessUrl, setLichessUrl] = useState("");
  const [pgnText, setPgnText] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; url: string } | null>(null);

  // Local PGN watcher state
  const [fsaSupported] = useState(() => typeof window !== "undefined" && typeof window.showOpenFilePicker === "function");
  const [watchState, setWatchState] = useState<"idle" | "watching" | "error">("idle");
  const [watchFile, setWatchFile] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<string | null>(null);
  const [gameCount, setGameCount] = useState<number | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);
  const handleRef = useRef<FileSystemFileHandle | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastContentRef = useRef("");

  const createSession = useCallback(async (src: SourceMode, lichessRoundId?: string) => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/selfhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          source: src,
          lichessRoundId,
          details: {
            format, startDate, endDate, rounds, timeControl, venue, country, federation,
            sections, players, description,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create broadcast");
      setCreated({ id: data.id, url: data.url });
      sessionIdRef.current = data.id;
      return data.id as string;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create broadcast");
      return null;
    } finally {
      setCreating(false);
    }
  }, [name, format, startDate, endDate, rounds, timeControl, venue, country, federation, sections, players, description]);

  const uploadPgn = useCallback(async (id: string, pgn: string) => {
    try {
      const res = await fetch(`/api/selfhost/${id}/pgn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn }),
      });
      const data = await res.json();
      if (res.ok) {
        setGameCount(data.gameCount);
        setLastUpload(new Date().toLocaleTimeString());
        setWatchError(null);
        return true;
      }
      setWatchError(data.error || "Upload failed");
      return false;
    } catch {
      setWatchError("Upload failed - check the connection");
      return false;
    }
  }, []);

  const stopWatcher = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    handleRef.current = null;
    setWatchState("idle");
    setWatchFile(null);
  }, []);

  // Read the watched file once and upload if changed
  const pollFile = useCallback(async () => {
    const handle = handleRef.current;
    const id = sessionIdRef.current;
    if (!handle || !id) return;
    try {
      const file = await handle.getFile();
      const text = await file.text();
      if (text && text !== lastContentRef.current && text.trim().length >= 20) {
        lastContentRef.current = text;
        await uploadPgn(id, text);
      }
    } catch {
      setWatchError("Lost access to the PGN file. Re-select it to resume.");
      setWatchState("error");
      stopWatcher();
    }
  }, [uploadPgn, stopWatcher]);

  const startWatch = useCallback(async (id: string) => {
    if (!window.showOpenFilePicker) {
      setWatchError("This browser cannot watch a local file. Use Chrome or Edge, or paste the PGN below.");
      return;
    }
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: "PGN file", accept: { "application/x-chess-pgn": [".pgn", ".txt"] } }],
      });
      handleRef.current = handle;
      const file = await handle.getFile();
      setWatchFile(file.name);
      setWatchState("watching");
      lastContentRef.current = "";
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(pollFile, 1000);
      await pollFile();
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // user cancelled picker
      setWatchError("Could not open that file. It may be locked by the DGT software.");
      setWatchState("error");
    }
  }, [pollFile]);

  useEffect(() => stopWatcher, [stopWatcher]);

  const createLocal = async () => {
    const id = await createSession("local-pgn");
    if (!id) return;
    if (pgnText.trim()) {
      lastContentRef.current = pgnText;
      await uploadPgn(id, pgnText);
    }
  };

  const startLichess = async () => {
    const roundId = extractRoundId(lichessUrl);
    if (!roundId) {
      setError("That does not look like a Lichess broadcast URL. Paste a lichess.org/broadcast/... link or a round id.");
      return;
    }
    await createSession("lichess", roundId);
  };

  const goLive = () => {
    if (created) router.push(created.url);
  };

  const canCreateLocal = name.trim().length > 0;
  const canCreateLichess = canCreateLocal && lichessUrl.trim().length > 0;

  return (
    <div className="wrap" style={{ padding: "24px 0 60px", maxWidth: 880 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>
        <Radio size={26} style={{ display: "inline", marginRight: 8, color: "var(--color-accent)" }} />Set Up Your Broadcast
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 28, fontSize: 15 }}>
        Broadcast your own tournament live. Two supported sources: a local PGN file from your DGT board, or a Lichess broadcast link. Importing an existing Lichess tournament from the <a href="/broadcasts" style={{ color: "var(--color-accent)" }}>broadcasts page</a> still works the same as before.
      </p>

      <div style={{ display: "grid", gap: 20 }}>
        {/* Tournament details */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Tournament details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Tournament name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Blazing Kings Monthly Rapid Championship" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} style={inputStyle}>
                <option value="swiss">Swiss</option>
                <option value="round-robin">Round-Robin</option>
                <option value="knockout">Knockout</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Time control</label>
              <input value={timeControl} onChange={(e) => setTimeControl(e.target.value)} placeholder="e.g. 90+30" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Start date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>End date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Rounds</label>
              <input value={rounds} onChange={(e) => setRounds(e.target.value)} placeholder="e.g. 6" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Federation</label>
              <input value={federation} onChange={(e) => setFederation(e.target.value)} placeholder="NGA" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Venue</label>
              <input value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Ibadan Chess Centre" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>City / Country</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Ibadan, Nigeria" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Sections</label>
              <input value={sections} onChange={(e) => setSections(e.target.value)} placeholder="e.g. Open, U12, U16" style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Players (one per line: Name, Rating)</label>
              <textarea value={players} onChange={(e) => setPlayers(e.target.value)} placeholder="Adeyemi O. Ayodeji, 2200" style={{ ...inputStyle, height: 90, fontFamily: "var(--font-mono)", fontSize: 13, resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Anything viewers should know about the event." style={{ ...inputStyle, height: 70, resize: "vertical" }} />
            </div>
          </div>
        </div>

        {/* Data source */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Data source</h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setMode("local-pgn")}
              style={{
                padding: "8px 16px", borderRadius: 6, border: "1px solid",
                borderColor: mode === "local-pgn" ? "var(--color-accent)" : "var(--color-border)",
                background: mode === "local-pgn" ? "var(--color-accent-muted)" : "transparent",
                color: mode === "local-pgn" ? "var(--color-accent)" : "var(--color-text-muted)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              <FileText size={14} style={{ display: "inline", marginRight: 6 }} />Local PGN file (DGT board)
            </button>
            <button
              onClick={() => setMode("lichess")}
              style={{
                padding: "8px 16px", borderRadius: 6, border: "1px solid",
                borderColor: mode === "lichess" ? "var(--color-accent)" : "var(--color-border)",
                background: mode === "lichess" ? "var(--color-accent-muted)" : "transparent",
                color: mode === "lichess" ? "var(--color-accent)" : "var(--color-text-muted)",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Link2 size={14} style={{ display: "inline", marginRight: 6 }} />Lichess broadcast link
            </button>
          </div>

          {mode === "local-pgn" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                Your DGT board writes live moves to a PGN file on your desktop. Create the broadcast below, then pick that
                file. In Chrome or Edge, ChessStream watches the file and uploads new moves every second. Other browsers can paste the PGN below instead.
              </div>
              <div>
                <label style={labelStyle}>Paste PGN (optional, works in every browser)</label>
                <textarea
                  value={pgnText}
                  onChange={(e) => setPgnText(e.target.value)}
                  placeholder={'[Event "Round 1"]\n[White "Adeyemi, O."]\n[Black "Okeke, C."]\n\n1. e4 e5 2. Nf3 ...'}
                  style={{ ...inputStyle, height: 110, fontFamily: "var(--font-mono)", fontSize: 12.5, resize: "vertical" }}
                />
              </div>
              {watchState === "watching" && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--color-accent-muted)", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)", animation: "pulse 1.5s ease-in-out infinite", flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>
                    Watching <b>{watchFile}</b> — {gameCount !== null ? `${gameCount} games uploaded` : "waiting for first upload"}
                    {lastUpload && <span style={{ color: "var(--color-text-muted)" }}> · last update {lastUpload}</span>}
                  </span>
                  <button onClick={stopWatcher} className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 12 }}>Stop</button>
                </div>
              )}
              {watchError && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(218,54,51,0.08)", border: "1px solid rgba(218,54,51,0.2)", fontSize: 13, color: "var(--color-eval-bad)", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={14} /> {watchError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button onClick={createLocal} disabled={creating || !canCreateLocal} className="btn btn-primary" style={{ padding: "12px 24px" }}>
                  {creating ? "Creating..." : <><Play size={15} /> Create broadcast</>}
                </button>
                {created && (
                  <button onClick={() => startWatch(sessionIdRef.current || "")} disabled={!fsaSupported} className="btn btn-outline" style={{ padding: "12px 24px" }}>
                    <FolderOpen size={15} /> Watch PGN file
                  </button>
                )}
                {!fsaSupported && created && (
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Live file watching needs Chrome or Edge. You can still paste PGN above.</span>
                )}
              </div>
            </div>
          )}

          {mode === "lichess" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                Link an existing Lichess broadcast (or the round page URL) and this site will render it with the full
                ChessStream viewer: live boards, eval bars, commentary, standings, chat.
              </div>
              <div>
                <label style={labelStyle}>Lichess broadcast URL or round id</label>
                <input
                  value={lichessUrl}
                  onChange={(e) => setLichessUrl(e.target.value)}
                  placeholder="https://lichess.org/broadcast/-/-/yourroundid"
                  style={inputStyle}
                />
              </div>
              <div>
                <button onClick={startLichess} disabled={creating || !canCreateLichess} className="btn btn-primary" style={{ padding: "12px 24px" }}>
                  {creating ? "Creating..." : <><Link2 size={15} /> Link and create broadcast</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(218,54,51,0.08)", border: "1px solid rgba(218,54,51,0.2)", color: "var(--color-eval-bad)", fontSize: 14 }}>
            {error}
          </div>
        )}

        {created && (
          <div className="card" style={{ padding: 24, borderColor: "var(--color-accent)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Check size={20} style={{ color: "var(--color-accent)" }} />
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Broadcast created</h2>
            </div>
            <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 16 }}>
              Share this link with your viewers. Boards appear as soon as moves are uploaded.
              Note: sessions are stored in memory and reset when the server redeploys (persistent storage is the next step).
            </p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <a href={created.url} className="btn btn-primary" style={{ padding: "12px 24px" }}>
                Go to live broadcast <ExternalLink size={15} />
              </a>
              <code style={{ padding: "10px 14px", background: "var(--color-bg)", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: 13 }}>
                {window.location.origin}{created.url}
              </code>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8, fontSize: 12.5, color: "var(--color-text-faint)", flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Calendar size={13} /> Dates</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> Venue</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={13} /> Time control</span>
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Users size={13} /> Player list</span>
        </div>
      </div>
    </div>
  );
}

// Pull a Lichess round id out of a broadcast URL, or accept a bare round id.
function extractRoundId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9]{5,}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!url.hostname.includes("lichess")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^[a-zA-Z0-9]{5,}$/.test(parts[i])) return parts[i];
    }
    return null;
  } catch {
    return null;
  }
}
