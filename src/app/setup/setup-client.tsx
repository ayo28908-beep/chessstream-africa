"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Radio, Calendar, MapPin, Clock, Users, FileText, Link2, FolderOpen,
  Check, AlertTriangle, ExternalLink, Play, Plus, X, Loader2, Layers,
} from "lucide-react";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px", borderRadius: 6, border: "1px solid var(--color-border)",
  background: "var(--color-bg)", color: "var(--color-text)", fontSize: 14, outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 5,
};

// Minimal typing for the File System Access API (Chrome/Edge only).
interface FileSystemHandle {
  kind: "file" | "directory";
  name: string;
}
interface FileSystemFileHandle extends FileSystemHandle {
  kind: "file";
  getFile: () => Promise<File>;
}
declare global {
  interface Window {
    showOpenFilePicker?: (opts?: { types?: { description?: string; accept: Record<string, string[]> }[] }) => Promise<FileSystemFileHandle[]>;
  }
}

type SourceMode = "local-pgn" | "lichess";

interface PendingFile {
  category: string;
  round: string;
  pgn: string;
}
interface UploadResult {
  category: string;
  round: string;
  games: number;
}

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

  // ---------- Local PGN watcher state (single file) ----------
  const [fsaSupported] = useState(() => typeof window !== "undefined" && typeof window.showOpenFilePicker === "function");
  const [watchState, setWatchState] = useState<"idle" | "watching" | "error">("idle");
  const [watchFile, setWatchFile] = useState<string | null>(null);
  const [lastUpload, setLastUpload] = useState<string | null>(null);
  const [gameCount, setGameCount] = useState<number | null>(null);
  const [watchError, setWatchError] = useState<string | null>(null);
  const handleRef = useRef<FileSystemFileHandle | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastContentRef = useRef("");

  // ---------- Folder upload state ----------
  // webkitdirectory is the only input attribute that hands us the folder
  // STRUCTURE (subfolder = category). Detect real support instead of assuming.
  const [folderState, setFolderState] = useState<"idle" | "reading" | "uploading" | "done" | "error">("idle");
  const [folderFiles, setFolderFiles] = useState<PendingFile[]>([]);
  // Files picked BEFORE the broadcast exists — they upload automatically on create.
  const [stagedFolder, setStagedFolder] = useState<PendingFile[]>([]);
  const [folderResults, setFolderResults] = useState<UploadResult[]>([]);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [webkitDirSupported] = useState(() => {
    if (typeof document === "undefined") return false;
    const input = document.createElement("input");
    return "webkitdirectory" in input;
  });

  // ---------- Lichess multi-section state ----------
  const [pendingTournament, setPendingTournament] = useState<{ id: string; name: string; rounds: { id: string; name: string }[]; isRound?: boolean } | null>(null);
  const [linkedSections, setLinkedSections] = useState<{ label: string; tournamentId?: string; rounds: { id: string; label: string }[] }[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [sectionLabel, setSectionLabel] = useState("");
  const [lichessNote, setLichessNote] = useState<string | null>(null);

  const createSession = useCallback(async (src: SourceMode, lichessSections?: { label: string; tournamentId?: string; rounds: { id: string; label: string }[] }[]) => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/selfhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          source: src,
          lichessSections: src === "lichess" ? lichessSections : undefined,
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

  const uploadPgn = useCallback(async (id: string, pgn: string, category?: string, round?: string) => {
    try {
      const res = await fetch(`/api/selfhost/${id}/pgn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pgn, category, round }),
      });
      const data = await res.json();
      if (res.ok) {
        setGameCount(data.gameCount);
        setLastUpload(new Date().toLocaleTimeString());
        setWatchError(null);
        return { ok: true as const, gameCount: data.gameCount as number };
      }
      setWatchError(data.error || "Upload failed");
      return { ok: false as const, error: data.error || "Upload failed" };
    } catch {
      setWatchError("Upload failed - check the connection");
      return { ok: false as const, error: "Upload failed - check the connection" };
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

  // ---------- Folder upload ----------
  // Uses a plain <input type="file" webkitdirectory multiple> so folder upload
  // works in EVERY browser (Chrome, Edge, Firefox, Safari) — no Chrome-only
  // directory-picker API required. Subfolders become categories (U12, U16,
  // Women...) and each PGN file becomes a round.
  const handleFolderPicked = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setFolderState("reading");
    setFolderError(null);
    setFolderResults([]);
    const files: PendingFile[] = [];
    for (const file of Array.from(fileList)) {
      if (!/\.(pgn|txt)$/i.test(file.name)) continue;
      // webkitRelativePath looks like "TournamentFolder/U12/Round1.pgn" —
      // the first segment is the folder the user picked, drop it, and the
      // remaining directory chain is the CATEGORY (U12, Senior/U12, ...).
      // Files directly inside the picked folder land in "Main".
      const rel = (file as File & { webkitRelativePath?: string }).webkitRelativePath || "";
      const relParts = rel.split("/").filter(Boolean);
      const dirParts = relParts.length > 1 ? relParts.slice(1, -1) : [];
      const category = dirParts.length > 0 ? dirParts.join(" / ") : "Main";
      const round = (relParts.length > 1 ? relParts[relParts.length - 1] : file.name).replace(/\.(pgn|txt)$/i, "");
      let text = "";
      try {
        text = await file.text();
      } catch {
        continue;
      }
      if (text.trim().length < 20) continue;
      files.push({ category, round, pgn: text });
    }
    if (files.length === 0) {
      setFolderState("error");
      setFolderError("No PGN files found in that folder. Put .pgn files in the folder (subfolders become categories like U12, U16).");
      return;
    }
    // Dedupe identical category/round pairs (keeps a re-pick from stacking).
    const seen = new Set<string>();
    const unique = files.filter((f) => {
      const key = `${f.category}/${f.round}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setFolderFiles(unique);
    // No session yet? Stage the files — they upload automatically on create.
    const id = sessionIdRef.current;
    if (!id) {
      setStagedFolder(unique);
      setFolderState("idle");
      setFolderError(null);
      return;
    }
    setFolderState("uploading");
    const results: UploadResult[] = [];
    let failures = 0;
    for (const f of unique) {
      const res = await uploadPgn(id, f.pgn, f.category, f.round);
      if (res.ok) results.push({ category: f.category, round: f.round, games: res.gameCount });
      else failures++;
    }
    setFolderResults(results);
    setFolderState("done");
    if (failures > 0) setFolderError(`${failures} file(s) failed to upload.`);
  }, [uploadPgn]);

  // ---------- Lichess linking ----------
  const detectLichessLink = useCallback(async () => {
    const id = extractLichessId(lichessUrl);
    if (!id) {
      setError("That does not look like a Lichess broadcast URL or id. Paste a lichess.org/broadcast/... link (round or tournament) or a bare id.");
      return;
    }
    setDetecting(true);
    setError(null);
    setLichessNote(null);
    try {
      const res = await fetch(`/api/lichess/tournament/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (res.ok && data.rounds && data.rounds.length > 0) {
        // It's a tournament. If it belongs to a broadcast group (e.g. the
        // same event has U12/U16/Open, or Finals + Preliminary), auto-create
        // a section for every category instead of linking them one by one.
        try {
          const secRes = await fetch(`/api/lichess/tournament/${encodeURIComponent(id)}/sections`);
          const secData = await secRes.json();
          if (secRes.ok && secData.sections && secData.sections.length > 1) {
            const sections: { label: string; tournamentId: string; rounds: { id: string; label: string }[] }[] = secData.sections.map((s: { label: string; tournamentId: string; rounds: { id: string; name: string }[] }) => ({
              label: s.label,
              tournamentId: s.tournamentId,
              rounds: s.rounds.map((r: { id: string; name: string }) => ({ id: r.id, label: r.name })),
            }));
            setLinkedSections(sections);
            setPendingTournament(null);
            setSectionLabel("");
            setLichessUrl("");
            setLichessNote(
              `Found ${sections.length} categories under \u201C${secData.group}\u201D and linked them all automatically: ` +
              sections.map((s) => s.label).join(", ") +
              ". You can rename or remove any below before creating the broadcast."
            );
            setDetecting(false);
            return;
          }
        } catch {
          // Group discovery failed — fall through to the single-section flow.
        }
        // Single tournament (no group): remember it as a pending section.
        setPendingTournament({ id: data.tournament.id, name: data.tournament.name, rounds: data.rounds, isRound: false });
        setSectionLabel(data.tournament.name);
      } else if (res.status === 404) {
        // Not a tournament — treat the id as a single round, but first try to
        // resolve it UP to its parent tournament. Lichess has no round JSON
        // API, so our /api/lichess/round/[id] route reverse-looks-up the
        // tournament (via the round PGN slug + broadcast list scan). When it
        // succeeds we can auto-link the whole tournament (all rounds) and any
        // sibling categories (U12/U16/Open, Finals/Preliminary...) from one
        // pasted round link. isRound stays true so a bare round id is never
        // wrongly stored as a tournamentId.
        let roundResolved = false;
        try {
          const roundRes = await fetch(`/api/lichess/round/${encodeURIComponent(id)}`);
          const roundData = await roundRes.json();
          if (roundRes.ok && roundData.sections && roundData.sections.length > 0) {
            if (roundData.sections.length > 1) {
              // Found sibling categories under a broadcast group — link them all.
              const sections: { label: string; tournamentId?: string; rounds: { id: string; label: string }[] }[] =
                roundData.sections.map((s: { label: string; tournamentId?: string; rounds: { id: string; name: string }[] }) => ({
                  label: s.label,
                  tournamentId: s.tournamentId || undefined,
                  rounds: (s.rounds || []).map((r: { id: string; name: string }) => ({ id: r.id, label: r.name })),
                }));
              setLinkedSections(sections);
              setPendingTournament(null);
              setSectionLabel("");
              setLichessUrl("");
              setLichessNote(
                `That round belongs to \u201C${roundData.group || roundData.tournamentName}\u201D — found ${sections.length} categories with all their rounds and linked them automatically: ` +
                sections.map((s) => s.label).join(", ") +
                ". You can rename or remove any below before creating the broadcast."
              );
              roundResolved = true;
            } else if (roundData.sections[0].rounds.length > 1 && roundData.tournamentId) {
              // The round's tournament has several rounds but no sibling
              // categories — link the whole tournament as one section so
              // viewers get every round, not just the one pasted.
              const s = roundData.sections[0];
              setPendingTournament({
                id: roundData.tournamentId,
                name: roundData.tournamentName || s.label || "Tournament",
                rounds: s.rounds.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })),
                isRound: false,
              });
              setSectionLabel(s.label || roundData.tournamentName || "Main");
              roundResolved = true;
            }
          }
        } catch {
          // round resolution failed — fall through to single-round flow
        }
        if (!roundResolved) {
          setPendingTournament({ id, name: "Round", rounds: [{ id, name: "Linked round" }], isRound: true });
          setSectionLabel("Main");
        }
      } else {
        setError(data.error || "Could not reach Lichess to check that link. Try again in a moment.");
      }
    } catch {
      setError("Could not reach Lichess to check that link. Try again in a moment.");
    } finally {
      setDetecting(false);
    }
  }, [lichessUrl]);

  const addSectionFromPending = useCallback(() => {
    if (!pendingTournament) return;
    const rounds = pendingTournament.rounds.map((r) => ({ id: r.id, label: r.name }));
    if (rounds.length === 0) return;
    setLinkedSections((prev) => [
      ...prev,
      {
        label: sectionLabel.trim() || pendingTournament.name,
        // A single-round link has no tournament id — leave it undefined so the
        // API probes the round itself instead of wrongly treating it as a
        // tournament (that mismatch caused "does not point at a broadcast").
        tournamentId: pendingTournament.isRound ? undefined : pendingTournament.id,
        rounds,
      },
    ]);
    setPendingTournament(null);
    setSectionLabel("");
    setLichessUrl("");
  }, [pendingTournament, sectionLabel]);

  const removeSection = useCallback((index: number) => {
    setLinkedSections((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateSectionLabel = useCallback((index: number, label: string) => {
    setLinkedSections((prev) => prev.map((s, i) => (i === index ? { ...s, label } : s)));
  }, []);

  const createLocal = async () => {
    const id = await createSession("local-pgn");
    if (!id) return;
    if (stagedFolder.length > 0) {
      // A folder was picked before creating — upload everything now.
      setFolderState("uploading");
      const results: UploadResult[] = [];
      let failures = 0;
      for (const f of stagedFolder) {
        const res = await uploadPgn(id, f.pgn, f.category, f.round);
        if (res.ok) results.push({ category: f.category, round: f.round, games: res.gameCount });
        else failures++;
      }
      setFolderResults(results);
      setFolderState("done");
      if (failures > 0) setFolderError(`${failures} file(s) failed to upload.`);
      setStagedFolder([]);
    } else if (pgnText.trim()) {
      lastContentRef.current = pgnText;
      await uploadPgn(id, pgnText, "Main", "Round 1");
    }
  };

  const startLichess = async () => {
    if (linkedSections.length === 0) {
      // Single quick link path: try detecting first, then require Add.
      await detectLichessLink();
      return;
    }
    await createSession("lichess", linkedSections);
  };

  const goLive = () => {
    if (created) router.push(created.url);
  };

  const canCreateLocal = name.trim().length > 0;
  const canCreateLichess = canCreateLocal && linkedSections.length > 0;

  return (
    <div className="wrap" style={{ padding: "24px 0 60px", maxWidth: 880 }}>
      <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 8 }}>
        <Radio size={26} style={{ display: "inline", marginRight: 8, color: "var(--color-accent)" }} />Set Up Your Broadcast
      </h1>
      <p style={{ color: "var(--color-text-muted)", marginBottom: 28, fontSize: 15 }}>
        Broadcast your own tournament live. Two supported sources: a local PGN file or folder from your DGT board, or Lichess broadcast links.
        Importing an existing Lichess tournament from the <a href="/broadcasts" style={{ color: "var(--color-accent)" }}>broadcasts page</a> still works the same as before.
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
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
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
              <FileText size={14} style={{ display: "inline", marginRight: 6 }} />Local PGN (DGT board)
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
                Your DGT board writes live moves to a PGN file on your desktop. <b>Choose a folder first</b> — subfolders
                become categories (U12, U16, Women...) and each PGN file becomes a round — then create the broadcast and
                everything uploads at once. For continuous live updating while the DGT writes moves, run the desktop
                watcher app (<code style={{ fontFamily: "var(--font-mono)" }}>desktop-watcher/</code>) pointed at the same folder.
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
              {(folderState === "reading" || folderState === "uploading") && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--color-accent-muted)", fontSize: 13.5, display: "flex", alignItems: "center", gap: 8 }}>
                  <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ flex: 1 }}>
                    {folderState === "reading" ? "Reading folder..." : `Uploading ${folderFiles.length} PGN files...`}
                  </span>
                </div>
              )}
              {folderResults.length > 0 && (
                <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 13 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <Layers size={14} style={{ color: "var(--color-accent)" }} /> Folder uploaded — {folderResults.length} files
                  </div>
                  <div style={{ display: "grid", gap: 4, maxHeight: 180, overflowY: "auto" }}>
                    {folderResults.map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "var(--color-text-muted)" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          <b style={{ color: "var(--color-text)" }}>{r.category}</b> / {r.round}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", flexShrink: 0 }}>{r.games} games</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {watchError && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(218,54,51,0.08)", border: "1px solid rgba(218,54,51,0.2)", fontSize: 13, color: "var(--color-eval-bad)", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={14} /> {watchError}
                </div>
              )}
              {folderError && (
                <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(218,54,51,0.08)", border: "1px solid rgba(218,54,51,0.2)", fontSize: 13, color: "var(--color-eval-bad)", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={14} /> {folderError}
                </div>
              )}
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={createLocal} disabled={creating || !canCreateLocal} className="btn btn-primary" style={{ padding: "12px 24px" }}>
                  {creating ? (stagedFolder.length > 0 ? `Creating + uploading ${stagedFolder.length} files...` : "Creating...") : <><Play size={15} /> Create broadcast</>}
                </button>
                {stagedFolder.length > 0 && (
                  <span style={{ fontSize: 13, color: "var(--color-accent)", fontWeight: 600 }}>
                    <Layers size={14} style={{ display: "inline", marginRight: 4, verticalAlign: "-2px" }} />
                    {stagedFolder.length} PGN file{stagedFolder.length === 1 ? "" : "s"} staged ({[...new Set(stagedFolder.map(f => f.category))].join(", ")}) — uploads on create
                  </span>
                )}
                <label className="btn btn-outline" style={{ padding: "12px 24px", cursor: "pointer" }}>
                  <Layers size={15} /> Choose folder (categories + rounds)
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                    onChange={(e) => {
                      handleFolderPicked(e.target.files);
                      // Reset the value so picking the same folder again re-fires.
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </label>
                {created && (
                  <button onClick={() => startWatch(sessionIdRef.current || "")} disabled={!fsaSupported} className="btn btn-outline" style={{ padding: "12px 24px" }}>
                    <FolderOpen size={15} /> Watch PGN file
                  </button>
                )}
                {!webkitDirSupported && (
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    This browser cannot pick a whole folder. Use Chrome or Edge, or run the desktop watcher app under <code style={{ fontFamily: "var(--font-mono)" }}>desktop-watcher/</code>.
                  </span>
                )}
              </div>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                Folder upload sorts subfolders into categories (U12, U16...). For continuous auto-updating while your DGT board writes moves, use the
                <b> ChessStream desktop watcher</b> (<code style={{ fontFamily: "var(--font-mono)" }}>desktop-watcher/ChessStream-Watcher.exe</code>) — it re-reads the folder about once a second and uploads changes automatically.
              </span>
            </div>
          )}

          {mode === "lichess" && (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                Link one Lichess broadcast — a <b>tournament</b> (all its rounds are watched) or a single <b>round</b> — then add more
                sections for other categories (U12, U16, Women, Finals...). Each linked section becomes a category viewers can switch between.
              </div>
              <div>
                <label style={labelStyle}>Lichess broadcast URL or id (round or tournament)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={lichessUrl}
                    onChange={(e) => setLichessUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") detectLichessLink(); }}
                    placeholder="https://lichess.org/broadcast/... or a round/tournament id"
                    style={inputStyle}
                  />
                  <button onClick={detectLichessLink} disabled={detecting || !lichessUrl.trim()} className="btn btn-outline" style={{ padding: "0 16px", whiteSpace: "nowrap" }}>
                    {detecting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Detect"}
                  </button>
                </div>
              </div>

              {lichessNote && (
                <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid var(--color-accent)", background: "var(--color-accent-muted)", fontSize: 13, lineHeight: 1.6 }}>
                  <Check size={14} style={{ display: "inline", marginRight: 6, color: "var(--color-accent)", verticalAlign: "-2px" }} />
                  {lichessNote}
                </div>
              )}

              {pendingTournament && (
                <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid var(--color-accent)", background: "var(--color-accent-muted)", fontSize: 13 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                    <Check size={14} style={{ color: "var(--color-accent)" }} />
                    {pendingTournament.rounds.length > 1
                      ? <>Found tournament: <b>{pendingTournament.name}</b> ({pendingTournament.rounds.length} rounds)</>
                      : <>Linked round: <b>{pendingTournament.name}</b></>}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                    <input
                      value={sectionLabel}
                      onChange={(e) => setSectionLabel(e.target.value)}
                      placeholder="Category label (e.g. U16, Finals, Open)"
                      style={{ ...inputStyle, maxWidth: 280 }}
                    />
                    <button onClick={addSectionFromPending} className="btn btn-primary" style={{ padding: "8px 14px", fontSize: 13 }}>
                      <Plus size={13} /> Add as section
                    </button>
                    <button onClick={() => { setPendingTournament(null); setSectionLabel(""); setLichessNote(null); }} className="btn btn-ghost" style={{ padding: "8px 10px", fontSize: 12 }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {linkedSections.length > 0 && (
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text-muted)" }}>
                    Linked sections ({linkedSections.length}) — viewers switch between these categories
                  </div>
                  {linkedSections.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 13 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)", flexShrink: 0 }} />
                      <input
                        value={s.label}
                        onChange={(e) => updateSectionLabel(i, e.target.value)}
                        style={{ ...inputStyle, maxWidth: 200, padding: "6px 10px" }}
                        title="Category label"
                      />
                      <span style={{ color: "var(--color-text-muted)", fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.tournamentId ? `${s.tournamentId} · ` : ""}{s.rounds.length} round{s.rounds.length > 1 ? "s" : ""}
                      </span>
                      <button onClick={() => removeSection(i)} style={{ background: "none", border: "none", color: "var(--color-text-faint)", cursor: "pointer", padding: 4 }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <button onClick={startLichess} disabled={creating || !canCreateLichess} className="btn btn-primary" style={{ padding: "12px 24px" }}>
                  {creating ? "Creating..." : <><Link2 size={15} /> {linkedSections.length === 0 ? "Detect link first" : "Link sections and create broadcast"}</>}
                </button>
                {linkedSections.length === 0 && (
                  <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>
                    Paste a tournament or round link above, click <b>Detect</b>, then <b>Add as section</b>.
                  </span>
                )}
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
          <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Layers size={13} /> Categories & rounds</span>
        </div>
      </div>
    </div>
  );
}

// Pull a Lichess id out of a broadcast URL (tournament or round), or accept a bare id.
function extractLichessId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9]{4,}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!url.hostname.includes("lichess")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      if (/^[a-zA-Z0-9]{4,}$/.test(parts[i])) return parts[i];
    }
    return null;
  } catch {
    return null;
  }
}