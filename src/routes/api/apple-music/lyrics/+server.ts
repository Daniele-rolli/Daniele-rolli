import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface LyricLine {
  time: number;
  text: string;
}

const EDGE_CACHE_SECONDS = 3600;
const EDGE_STALE_SECONDS = 86400;

function parseLyrics(syncedLyrics: string): LyricLine[] {
  const lines = syncedLyrics.split("\n");
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d+):(\d+)\.(\d+)\]/;

  for (const line of lines) {
    const match = timeRegex.exec(line);
    if (!match) continue;

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const ms = parseInt(match[3], 10);

    const time = minutes * 60 + seconds + ms / 100;
    const text = line.replace(timeRegex, "").trim();

    if (text) {
      result.push({ time, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

export const GET: RequestHandler = async ({ url }) => {
  const track = url.searchParams.get("track");
  const artist = url.searchParams.get("artist");

  if (!track || !artist) {
    return json({ lyrics: [] }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const lrcUrl = `https://lrclib.net/api/search?track_name=${encodeURIComponent(track)}&artist_name=${encodeURIComponent(artist)}`;
    const res = await globalThis.fetch(lrcUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return json({ lyrics: [] }, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        },
      });
    }

    const data = await res.json();
    let lyrics: LyricLine[] = [];

    if (Array.isArray(data) && data.length > 0) {
      const bestMatch = data.find((item: Record<string, unknown>) => item.syncedLyrics);
      if (bestMatch?.syncedLyrics && typeof bestMatch.syncedLyrics === "string") {
        lyrics = parseLyrics(bestMatch.syncedLyrics);
      }
    }

    return json({ lyrics }, {
      headers: {
        "Cache-Control": `public, s-maxage=${EDGE_CACHE_SECONDS}, stale-while-revalidate=${EDGE_STALE_SECONDS}`,
      },
    });
  } catch {
    return json({ lyrics: [] }, {
      headers: { "Cache-Control": "no-store" },
    });
  }
};
