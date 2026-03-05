import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const NOW_PLAYING_BASE_URL =
    env.NOW_PLAYING_URL?.trim() ??
    env.VITE_NOW_PLAYING_URL?.trim() ??
    'http://localhost:3000';


const NOW_PLAYING_AUTH_TOKEN =
    env.NOW_PLAYING_AUTH_TOKEN?.trim() ??
    env.VITE_NOW_PLAYING_AUTH_TOKEN?.trim();

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
    return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function asNonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value : null;
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

export const GET: RequestHandler = async () => {
    try {
        const headers: HeadersInit = { accept: 'application/json' };
        if (NOW_PLAYING_AUTH_TOKEN) {
            headers.authorization = `Bearer ${NOW_PLAYING_AUTH_TOKEN}`;
        }

        const res = await globalThis.fetch(nowPlayingUrl(NOW_PLAYING_BASE_URL), {
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

        return json({
            nowPlaying: track,
            lastTrack: track,
            isPlaying
        });
    } catch (err) {
        console.error('[apple-music]', err);
        return json({ nowPlaying: null, lastTrack: null, isPlaying: false });
    }
};
