import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const EDGE_CACHE_SECONDS = 300;
const EDGE_STALE_SECONDS = 60;
const EDGE_CACHE_CONTROL = `public, s-maxage=${EDGE_CACHE_SECONDS}, stale-while-revalidate=${EDGE_STALE_SECONDS}`;
export const prerender = false;

type CloudflareCacheStorage = CacheStorage & {
    default?: Cache;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
    return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function asNonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function bindingValue(bindings: Record<string, unknown>, key: string): string | null {
    return asNonEmptyString(bindings[key]);
}

function asBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === 'playing') return true;
        if (lower === 'false' || lower === 'paused' || lower === 'stopped') return false;
    }
    return null;
}

function extractArtist(rawTrack: UnknownRecord): string {
    const directArtist = asNonEmptyString(rawTrack.artist) ?? asNonEmptyString(rawTrack.artistName);
    if (directArtist) return directArtist;

    const artists = Array.isArray(rawTrack.artists) ? rawTrack.artists : [];
    const first = artists[0];
    if (typeof first === 'string') return first;
    if (asRecord(first)) return asNonEmptyString(first.name) ?? '';

    return '';
}

function normalizeTrack(payload: UnknownRecord): UnknownRecord | null {
    const rawTrack =
        asRecord(payload.track) ??
        asRecord(payload.nowPlaying) ??
        asRecord(payload.now_playing) ??
        asRecord(payload.item);

    if (!rawTrack) return null;

    const name = asNonEmptyString(rawTrack.name) ?? asNonEmptyString(rawTrack.title) ?? '';
    const artist = extractArtist(rawTrack);
    const album = asNonEmptyString(rawTrack.album) ?? asNonEmptyString(rawTrack.albumName) ?? '';
    const albumArt =
        asNonEmptyString(rawTrack.albumArt) ??
        asNonEmptyString(rawTrack.albumArtUrl) ??
        asNonEmptyString(rawTrack.artworkUrl100) ??
        asNonEmptyString(rawTrack.artworkUrl) ??
        '';

    if (!name && !artist && !album && !albumArt) return null;

    return { name, artist, album, albumArt };
}

function nowPlayingUrl(base: string): string {
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return new URL('now-playing', normalized).toString();
}

function edgeCache(): Cache | null {
    if (typeof caches === 'undefined') return null;
    return (caches as CloudflareCacheStorage).default ?? null;
}

export const GET: RequestHandler = async ({ request, platform }) => {
    try {
        const bindings = (platform?.env ?? {}) as Record<string, unknown>;
        const requestHost = new URL(request.url).hostname;
        const allowLocalFallback = requestHost === 'localhost' || requestHost === '127.0.0.1';

        const nowPlayingBaseUrl =
            bindingValue(bindings, 'NOW_PLAYING_URL') ??
            env.NOW_PLAYING_URL?.trim() ??
            (allowLocalFallback ? 'http://localhost:3000' : null);
        const nowPlayingAuthToken =
            bindingValue(bindings, 'NOW_PLAYING_AUTH_TOKEN') ??
            env.NOW_PLAYING_AUTH_TOKEN?.trim();

        if (!nowPlayingBaseUrl) {
            console.error('[apple-music] missing NOW_PLAYING_URL', {
                host: requestHost,
                hasBindingUrl: Boolean(bindingValue(bindings, 'NOW_PLAYING_URL')),
                hasPrivateEnvUrl: Boolean(env.NOW_PLAYING_URL?.trim())
            });
            return json(
                { nowPlaying: null, lastTrack: null, isPlaying: false },
                { headers: { 'Cache-Control': 'no-store' } }
            );
        }

        const cache = edgeCache();
        const cacheKey = new Request(request.url, { method: 'GET' });
        if (cache) {
            const cached = await cache.match(cacheKey);
            if (cached) return cached;
        }

        const headers: HeadersInit = { accept: 'application/json' };
        if (nowPlayingAuthToken) {
            headers.authorization = `Bearer ${nowPlayingAuthToken}`;
        }

        const res = await globalThis.fetch(nowPlayingUrl(nowPlayingBaseUrl), {
            headers,
            signal: AbortSignal.timeout(5000)
        });

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

        const response = json({
            nowPlaying: track,
            lastTrack: track,
            isPlaying
        }, {
            headers: {
                'Cache-Control': EDGE_CACHE_CONTROL
            }
        });

        if (cache) {
            await cache.put(cacheKey, response.clone());
        }

        return response;
    } catch (err) {
        console.error('[apple-music]', err);
        return json(
            { nowPlaying: null, lastTrack: null, isPlaying: false },
            { headers: { 'Cache-Control': 'no-store' } }
        );
    }
};
