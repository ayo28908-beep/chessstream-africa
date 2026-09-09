#!/usr/bin/env node
"use strict";

// ChessStream Africa — DGT folder watcher
// ----------------------------------------
// Watches a folder on your computer (where your DGT board writes PGN files)
// and uploads changes to a ChessStream Africa broadcast about once per second.
//
//   - Subfolders under the watched folder become CATEGORIES (U12, U16, Open,
//     Women, Finals...). Files directly inside the folder land in "Main".
//   - Each PGN file becomes a ROUND, named after the file (Round1.pgn -> Round1).
//   - A file is re-uploaded whenever its contents change (DGT writes moves
//     continuously, so the broadcast stays live during play).
//
// Usage:
//   First run (asks for the broadcast URL and folder):
//     node watcher.js
//     ChessStream-Watcher.exe          (double-click — same thing)
//   Or configure on the command line:
//     node watcher.js --url https://chessstream-africa.vercel.app/broadcast/abc123 --dir "C:\Users\DELL\Documents\DGT PGNs"
//
// Settings are saved to chessstream-watcher.json next to this file / the EXE.
// A log is written to chessstream-watcher.log.

const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const readline = require("readline");
const crypto = require("crypto");

const VERSION = "1.0.0";
// When packaged (pkg EXE or Node SEA exe), put settings/logs NEXT TO the exe
// (process.execPath), not inside the embedded snapshot.
const isPkg = typeof process.pkg !== "undefined";
const isSea = (() => { try { return require("node:sea").isSea(); } catch (_) { return false; } })();
const APP_DIR = (isPkg || isSea) ? path.dirname(process.execPath) : __dirname;
const CONFIG_PATH = path.join(APP_DIR, "chessstream-watcher.json");
const LOG_PATH = path.join(APP_DIR, "chessstream-watcher.log");

const config = { url: "", dir: "", intervalMs: 1000 };

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try { fs.appendFileSync(LOG_PATH, line + "\n"); } catch (_) { /* log file locked */ }
}

function err(msg) {
  const line = `[${new Date().toISOString()}] ERROR: ${msg}`;
  console.error(line);
  try { fs.appendFileSync(LOG_PATH, line + "\n"); } catch (_) { /* ignore */ }
}

// ---------- config ----------

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const c = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      if (c && c.url && c.dir) {
        config.url = String(c.url);
        config.dir = String(c.dir);
        config.intervalMs = Number(c.intervalMs) || 1000;
      }
    }
  } catch (e) {
    err("Could not read config: " + e.message);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
    log("Settings saved to " + CONFIG_PATH);
  } catch (e) {
    err("Could not save config: " + e.message);
  }
}

// ---------- helpers ----------

// Accepts "https://chessstream-africa.vercel.app/broadcast/abc123" (or any
// origin) and returns { origin, sessionId }.
function parseBroadcastUrl(raw) {
  let u;
  try { u = new URL(String(raw).trim()); } catch (_) { return null; }
  const m = u.pathname.match(/\/broadcast\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  return { origin: u.origin, sessionId: m[1] };
}

function postJson(url, body, cb) {
  const payload = JSON.stringify(body);
  const mod = url.protocol === "https:" ? https : http;
  const req = mod.request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
    timeout: 8000,
  }, (res) => {
    let data = "";
    res.on("data", (chunk) => (data += chunk));
    res.on("end", () => cb(null, res.statusCode, data));
  });
  req.on("error", (e) => cb(e));
  req.on("timeout", () => req.destroy(new Error("timeout")));
  req.write(payload);
  req.end();
}

// ---------- folder scanning ----------

function listPgnFiles(dir) {
  const out = [];
  const walk = (d, rel) => {
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch (_) { return; }
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      const relPath = rel ? path.join(rel, ent.name) : ent.name;
      if (ent.isDirectory()) walk(full, relPath);
      else if (/\.(pgn|txt)$/i.test(ent.name)) out.push({ full, relPath });
    }
  };
  walk(dir, "");
  return out;
}

// Queue every file whose contents changed since the last scan.
const lastHashes = new Map();       // relPath -> sha1 of contents
const pendingUploads = new Map();   // relPath -> { pgn, category, round }

function scanAndQueue() {
  const files = listPgnFiles(config.dir);
  const seen = new Set();
  for (const f of files) {
    seen.add(f.relPath);
    let text;
    try { text = fs.readFileSync(f.full, "utf8"); } catch (_) { continue; }
    if (text.trim().length < 20) continue; // not a real PGN yet
    const h = crypto.createHash("sha1").update(text).digest("hex");
    if (lastHashes.get(f.relPath) === h) continue;
    lastHashes.set(f.relPath, h);
    const parts = f.relPath.split(path.sep);
    const round = parts.pop().replace(/\.(pgn|txt)$/i, "");
    const category = parts.length ? parts.join(" / ") : "Main";
    pendingUploads.set(f.relPath, { pgn: text, category, round });
  }
  // Forget files that were deleted (they no longer exist).
  for (const key of lastHashes.keys()) {
    if (!seen.has(key)) lastHashes.delete(key);
  }
}

function flushPending() {
  if (pendingUploads.size === 0) return;
  const parsed = parseBroadcastUrl(config.url);
  if (!parsed) {
    err("Invalid broadcast URL in " + CONFIG_PATH + ". Run with --setup.");
    return;
  }
  const apiUrl = new URL(`/api/selfhost/${parsed.sessionId}/pgn`, parsed.origin);
  for (const [rel, p] of pendingUploads) {
    postJson(apiUrl, { pgn: p.pgn, category: p.category, round: p.round }, (uploadErr, status, body) => {
      if (uploadErr) {
        err(`Upload failed (${rel}): ${uploadErr.message} — will retry on the next tick.`);
        return; // keep pending so the next tick retries
      }
      pendingUploads.delete(rel);
      if (status === 200 || status === 201) {
        log(`Uploaded ${rel}  ->  ${p.category} / ${p.round}  (${body})`);
      } else if (status === 404) {
        err(`Broadcast not found (HTTP 404) for ${rel}. The broadcast session may have reset — create the broadcast again on the site and update the URL in ${CONFIG_PATH}.`);
      } else {
        err(`Upload rejected (${rel}): HTTP ${status} ${String(body).slice(0, 200)}`);
      }
    });
  }
}

// ---------- setup & main ----------

function runSetup() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log("ChessStream Africa — DGT folder watcher setup");
  console.log("");
  console.log("1. Open your broadcast on the ChessStream site and copy its link.");
  console.log("   It looks like:  https://chessstream-africa.vercel.app/broadcast/abc123");
  console.log("2. Point this app at the folder your DGT board writes PGN files into.");
  console.log("   Subfolders inside it become categories (U12, U16, Open...).");
  console.log("");
  rl.question("Broadcast URL: ", (url) => {
    const cleanUrl = url.trim();
    if (!parseBroadcastUrl(cleanUrl)) {
      console.error("That does not look like a ChessStream broadcast link (should contain /broadcast/xxxxx).");
      process.exit(1);
    }
    rl.question("Folder path (e.g. C:\\Users\\DELL\\Documents\\DGT PGNs): ", (dir) => {
      const cleanDir = dir.trim().replace(/^"|"$/g, "");
      if (!cleanDir || !fs.existsSync(cleanDir)) {
        console.error("That folder does not exist. Create it first, then run this again.");
        process.exit(1);
      }
      config.url = cleanUrl;
      config.dir = cleanDir;
      saveConfig();
      rl.close();
      start();
    });
  });
}

function start() {
  if (!parseBroadcastUrl(config.url)) {
    err("Invalid broadcast URL. Run with --setup or edit " + CONFIG_PATH);
    process.exit(1);
  }
  if (!fs.existsSync(config.dir)) {
    err("Folder not found: " + config.dir + ". Run with --setup or edit " + CONFIG_PATH);
    process.exit(1);
  }
  log("ChessStream folder watcher v" + VERSION + " started");
  log("Watching : " + config.dir);
  log("Uploading: " + config.url + "  (every " + config.intervalMs + " ms)");
  log("Subfolders become categories; each PGN file becomes a round.");
  console.log("");
  console.log("Watching for changes. Press Ctrl+C to stop.");
  console.log("Settings: " + CONFIG_PATH);
  console.log("Log     : " + LOG_PATH);
  console.log("");

  // Initial full sync, then keep polling. DGT boards rewrite the PGN file on
  // every move, so a 1s poll keeps the broadcast live with no file locks.
  scanAndQueue();
  flushPending();
  setInterval(() => {
    scanAndQueue();
    flushPending();
  }, config.intervalMs);
}

// ---------- entry ----------

const args = process.argv.slice(2);
if (args.includes("--version")) {
  console.log("ChessStream folder watcher v" + VERSION);
  process.exit(0);
}
const urlArg = args.indexOf("--url");
const dirArg = args.indexOf("--dir");
if (urlArg > -1 && args[urlArg + 1]) config.url = args[urlArg + 1];
if (dirArg > -1 && args[dirArg + 1]) config.dir = args[dirArg + 1];

loadConfig();

if (args.includes("--setup") || !config.url || !config.dir) {
  runSetup();
} else {
  start();
}