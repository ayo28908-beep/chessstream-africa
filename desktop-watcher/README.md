# ChessStream Watcher (desktop app)

Watches a folder on your computer — where your DGT board software writes PGN
files — and uploads every change to a ChessStream Africa broadcast about once
per second. The broadcast stays live while games are in progress, with no
manual uploads.

- Subfolders become **categories** (`U12`, `U16`, `Open`, `Women`, ...). Files
  directly in the watched folder land in `Main`.
- Each PGN file becomes a **round**, named after the file (`Round 1.pgn` →
  `Round 1`).
- Files are re-uploaded automatically whenever their contents change (DGT
  software rewrites the PGN on every move).

## Quick start (Windows EXE)

1. Build it once (requires [Node.js](https://nodejs.org) ≥ 20; works offline):

   ```cmd
   cd desktop-watcher
   build.cmd
   ```

   This uses Node's built-in SEA (Single Executable Application) feature — no
   packages are downloaded. It produces `ChessStream-Watcher.exe` (~88 MB).

2. Double-click `ChessStream-Watcher.exe`. First run asks for:
   - your broadcast link (`https://chessstream-africa.vercel.app/broadcast/xxxx`)
   - the folder your DGT board writes PGNs into.

   Settings are saved to `chessstream-watcher.json` next to the EXE; a log is
   written to `chessstream-watcher.log`.

   Or skip the prompts:

   ```cmd
   ChessStream-Watcher.exe --url https://chessstream-africa.vercel.app/broadcast/xxxx --dir "C:\Users\you\Documents\DGT PGNs"
   ```

## Run from source (any OS)

```bash
node watcher.js            # interactive setup on first run
```

or with arguments:

```bash
node watcher.js --url https://chessstream-africa.vercel.app/broadcast/xxxx --dir "/path/to/pgns"
```

## How live updating works

The watcher re-reads every PGN in the folder once per second (`intervalMs` in
the config). A file is uploaded only when its SHA-1 hash changed, so DGT
software rewriting files every move does not spam the server. Uploads that
fail (offline, server restart) are retried on the next tick.

## Folder layout example

```
DGT PGNs/
├── Open/
│   ├── Round 1.pgn
│   └── Round 2.pgn
└── U12/
    └── Round 1.pgn
```

becomes a broadcast with categories **Open** (Round 1, Round 2) and **U12**
(Round 1) that viewers can switch between.

> Note: the web `/setup` page also supports one-shot folder upload (subfolders
> → categories) in any modern browser, but only this watcher keeps the
> broadcast continuously live while the DGT writes moves.
