import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { env } from "$env/dynamic/private";

const EDGE_CACHE_SECONDS = 5;
const EDGE_STALE_SECONDS = 15;
const EDGE_CACHE_CONTROL = `public, s-maxage=${EDGE_CACHE_SECONDS}, stale-while-revalidate=${EDGE_STALE_SECONDS}`;
const BROWSER_CACHE_CONTROL = "no-store";
export const prerender = false;

type CloudflareCacheStorage = CacheStorage & { default?: Cache };
type UnknownRecord = Record<string, unknown>;

interface LyricLine {
  time: number;
  text: string;
}

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" ? (value as UnknownRecord) : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function bindingValue(
  bindings: Record<string, unknown>,
  key: string,
): string | null {
  return asNonEmptyString(bindings[key]);
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true" || lower === "playing") return true;
    if (lower === "false" || lower === "paused" || lower === "stopped")
      return false;
  }
  return null;
}

function extractArtist(rawTrack: UnknownRecord): string {
  const directArtist =
    asNonEmptyString(rawTrack.artist) ?? asNonEmptyString(rawTrack.artistName);
  if (directArtist) return directArtist;
  const artists = Array.isArray(rawTrack.artists) ? rawTrack.artists : [];
  const first = artists[0];
  if (typeof first === "string") return first;
  if (asRecord(first)) return asNonEmptyString(first.name) ?? "";
  return "";
}

function normalizeTrack(payload: UnknownRecord): UnknownRecord | null {
  const rawTrack =
    asRecord(payload.track) ??
    asRecord(payload.nowPlaying) ??
    asRecord(payload.now_playing) ??
    asRecord(payload.item);
  if (!rawTrack) return null;

  const name =
    asNonEmptyString(rawTrack.name) ?? asNonEmptyString(rawTrack.title) ?? "";
  const artist = extractArtist(rawTrack);
  const album =
    asNonEmptyString(rawTrack.album) ??
    asNonEmptyString(rawTrack.albumName) ??
    "";
  const albumArt =
    asNonEmptyString(rawTrack.albumArt) ??
    asNonEmptyString(rawTrack.albumArtUrl) ??
    asNonEmptyString(rawTrack.artworkUrl100) ??
    asNonEmptyString(rawTrack.artworkUrl) ??
    "";

  if (!name && !artist && !album && !albumArt) return null;
  return { name, artist, album, albumArt };
}

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

async function fetchLyrics(
  title: string,
  artist: string,
): Promise<LyricLine[]> {
  try {
    const url = `https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
    const res = await globalThis.fetch(url, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) return [];

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const bestMatch = data.find((item) => item.syncedLyrics);
      if (bestMatch?.syncedLyrics) {
        return parseLyrics(bestMatch.syncedLyrics);
      }
    }
    return [];
  } catch {
    return [];
  }
}

export const GET: RequestHandler = async ({ request, platform }) => {
  try {
    const bindings = (platform?.env ?? {}) as Record<string, unknown>;
    const requestHost = new URL(request.url).hostname;
    const allowLocalFallback =
      requestHost === "localhost" || requestHost === "127.0.0.1";

    const nowPlayingBaseUrl =
      bindingValue(bindings, "NOW_PLAYING_URL") ??
      env.NOW_PLAYING_URL?.trim() ??
      (allowLocalFallback ? "http://localhost:3000" : null);
    const nowPlayingAuthToken =
      bindingValue(bindings, "NOW_PLAYING_AUTH_TOKEN") ??
      env.NOW_PLAYING_AUTH_TOKEN?.trim();

    if (!nowPlayingBaseUrl) {
      return json(
        { nowPlaying: null, lastTrack: null, isPlaying: false, lyrics: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    let cache: Cache | null = null;
    try {
      if (typeof caches !== "undefined" && caches && "default" in caches) {
        cache = (caches as any).default ?? null;
      }
    } catch {
      // Fail-safe fallback
    }

    const cacheKey = new Request(request.url, { method: "GET" });
    if (cache) {
      try {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
      } catch {
        // Fail-safe fallback
      }
    }

    const headers: HeadersInit = { accept: "application/json" };
    if (nowPlayingAuthToken) {
      headers.authorization = `Bearer ${nowPlayingAuthToken}`;
    }

    const res = await globalThis.fetch(
      new URL(
        "now-playing",
        nowPlayingBaseUrl.endsWith("/")
          ? nowPlayingBaseUrl
          : `${nowPlayingBaseUrl}/`,
      ).toString(),
      {
        headers,
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!res.ok) throw new Error(`Upstream ${res.status}`);

    const data = await res.json();
    const payload = asRecord(data) ?? {};
    const track = normalizeTrack(payload);

    const trackObj = asRecord(payload.track);
    const isPlaying =
      asBoolean(payload.isPlaying) ??
      asBoolean(payload.is_playing) ??
      asBoolean(payload.playing) ??
      asBoolean(trackObj?.isPlaying) ??
      asBoolean(trackObj?.is_playing) ??
      false;

    let lyrics: LyricLine[] = [];
    if (
      track &&
      typeof track.name === "string" &&
      typeof track.artist === "string"
    ) {
      lyrics = await fetchLyrics(track.name, track.artist);
    }

    const responseData = {
      nowPlaying: track,
      lastTrack: track,
      isPlaying,
      lyrics,
    };

    const response = json(responseData, {
      headers: {
        "Cache-Control": BROWSER_CACHE_CONTROL,
        "CDN-Cache-Control": EDGE_CACHE_CONTROL,
        "Cloudflare-CDN-Cache-Control": EDGE_CACHE_CONTROL,
      },
    });

    if (cache) {
      try {
        const cacheResponse = new Response(JSON.stringify(responseData), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${EDGE_CACHE_SECONDS}`,
          },
        });
        await cache.put(cacheKey, cacheResponse);
      } catch {
        // Fail-safe fallback
      }
    }

    return response;
  } catch (err) {
    console.error("[apple-music]", err);
    return json(
      { nowPlaying: null, lastTrack: null, isPlaying: false, lyrics: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
};
