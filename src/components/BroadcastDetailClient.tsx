"use client";

import { useEffect, useState } from "react";
import BroadcastViewer from "./BroadcastViewer";
import StandingsPanel from "./StandingsPanel";
import StreamerPanel from "./StreamerPanel";
import type { StandingGame } from "@/lib/standings";
import type { TiebreakSystem } from "@/lib/tournamentConfig";

interface LiveGame {
  id: string;
  white: { name: string; title?: string; rating?: number; fideId?: number; federation?: string };
  black: { name: string; title?: string; rating?: number; fideId?: number; federation?: string };
  fen: string;
  result: string;
  eval: number;
  lastMove?: string;
  moveCount: number;
  status: string;
  opening?: string;
  eco?: string;
  pgnUrl?: string;
  moves?: string[];
  evals?: { moveNumber: number; san: string; eval: number; side: "w" | "b" }[];
}

export default function BroadcastDetailClient({ tournamentId, tournamentName, customSessionId }: { tournamentId: string; tournamentName: string; customSessionId?: string }) {
  const [games, setGames] = useState<LiveGame[]>([]);
  const [tiebreak, setTiebreak] = useState<TiebreakSystem>("sonneborn-berger");
  const [qualificationSpots, setQualificationSpots] = useState(4);

  useEffect(() => {
    fetch(`/api/config?tournament=${encodeURIComponent(tournamentId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.config) {
          setTiebreak(data.config.tiebreakSystem || "sonneborn-berger");
          setQualificationSpots(data.config.qualificationSpots || 4);
        }
      })
      .catch(() => {});
  }, [tournamentId]);

  const standingGames: StandingGame[] = games.map((g) => ({
    white: g.white.name,
    black: g.black.name,
    result: g.result,
  }));

  return (
    <div
      className="wrap"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        gap: 20,
        alignItems: "start",
      }}
    >
      {/* Boards */}
      <div>
        <BroadcastViewer tournamentId={tournamentId} onGamesChange={setGames} customSessionId={customSessionId} />
      </div>

      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 72 }}>
        <StreamerPanel tournamentId={tournamentId} />
        <StandingsPanel games={standingGames} tiebreakSystem={tiebreak} qualificationSpots={qualificationSpots} />
      </div>
    </div>
  );
}
