import { NextResponse } from "next/server";

// GET /api/lichess/broadcasts
// Proxies Lichess broadcast list, parses NDJSON into structured response
export const revalidate = 30; // cache 30s

export async function GET() {
  try {
    const res = await fetch("https://lichess.org/api/broadcast", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Lichess API returned ${res.status}` },
        { status: 502 }
      );
    }

    // Lichess returns NDJSON (one JSON object per line)
    const text = await res.text();
    const lines = text.trim().split("\n");

    let featured: Record<string, unknown> | null = null;
    const upcoming: Record<string, unknown>[] = [];
    const recent: Record<string, unknown>[] = [];

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.tour && !featured) {
          // First object is the featured/live tournament
          featured = {
            id: obj.tour.id,
            name: obj.tour.name,
            slug: obj.tour.slug,
            description: obj.tour.info?.format || "",
            location: obj.tour.info?.location || "",
            players: obj.tour.info?.players || "",
            timeZone: obj.tour.info?.timeZone || "",
            tier: obj.tour.tier || 0,
            image: obj.tour.image || "",
            url: obj.tour.url || "",
            dates: obj.tour.dates || [],
            rounds: (obj.rounds || []).map((r: Record<string, unknown>) => ({
              id: r.id,
              name: r.name,
              slug: r.slug,
              startsAt: r.startsAt,
              finished: r.finished || false,
              ongoing: r.ongoing || false,
              finishedAt: r.finishedAt,
              nbGames: r.nbGames || 0,
            })),
            defaultRoundId: obj.defaultRoundId,
          };
        } else if (Array.isArray(obj)) {
          // Array of upcoming or recent broadcasts
          for (const item of obj) {
            const t = item.tour || item;
            const entry = {
              id: t.id,
              name: t.name,
              slug: t.slug,
              location: t.info?.location || "",
              tier: t.tier || 0,
              image: t.image || "",
              dates: t.dates || [],
              roundCount: item.rounds?.length || 0,
            };
            upcoming.push(entry);
          }
        }
      } catch {
        // Skip malformed lines
      }
    }

    // Also fetch the full broadcast list with round IDs for recent events
    try {
      const prevRes = await fetch(
        "https://lichess.org/api/broadcast?nb=20",
        { headers: { Accept: "application/x-ndjson" } }
      );
      if (prevRes.ok) {
        const prevText = await prevRes.text();
        for (const line of prevText.trim().split("\n")) {
          try {
            const obj = JSON.parse(line);
            if (obj.tour) {
              const rounds = (obj.rounds || []).map((r: Record<string, unknown>) => ({
                id: r.id,
                name: r.name,
                slug: r.slug,
                startsAt: r.startsAt,
                finished: r.finished || false,
                ongoing: r.ongoing || false,
                nbGames: r.nbGames || 0,
              }));
              recent.push({
                id: obj.tour.id,
                name: obj.tour.name,
                slug: obj.tour.slug,
                location: obj.tour.info?.location || "",
                players: obj.tour.info?.players || "",
                tier: obj.tour.tier || 0,
                image: obj.tour.image || "",
                dates: obj.tour.dates || [],
                rounds,
                defaultRoundId: obj.defaultRoundId,
              });
            }
          } catch {
            // Skip
          }
        }
      }
    } catch {
      // Not critical
    }

    return NextResponse.json({ featured, upcoming, recent });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch broadcasts", detail: String(err) },
      { status: 500 }
    );
  }
}
