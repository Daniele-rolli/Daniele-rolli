<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { blur, fade } from "svelte/transition";

    const EQUALIZER_BARS = [
        {
            delay: -0.12,
            duration: 1.55,
            min: 0.3,
            mid: 0.6,
            mid2: 0.48,
            peak: 0.98,
        },
        {
            delay: -0.4,
            duration: 1.86,
            min: 0.24,
            mid: 0.52,
            mid2: 0.7,
            peak: 0.9,
        },
        {
            delay: -0.58,
            duration: 1.36,
            min: 0.36,
            mid: 0.72,
            mid2: 0.54,
            peak: 1,
        },
        {
            delay: -0.24,
            duration: 1.94,
            min: 0.26,
            mid: 0.48,
            mid2: 0.62,
            peak: 0.82,
        },
        {
            delay: -0.72,
            duration: 1.48,
            min: 0.34,
            mid: 0.64,
            mid2: 0.5,
            peak: 0.94,
        },
    ] as const;

    const INTERNAL_NOW_PLAYING_ENDPOINT = "/api/apple-music";
    const PLAYING_GRACE_MS = 3 * 60_000;

    interface Track {
        name: string;
        artist: string;
        album: string;
        albumArt: string;
    }

    interface LyricLine {
        time: number;
        text: string;
    }

    interface AppleMusicData {
        nowPlaying: Track | null;
        lastTrack: Track | null;
        isPlaying: boolean;
        lyrics?: LyricLine[];
    }

    interface WordParticle {
        id: number;
        text: string;
        style: string;
    }

    type UnknownRecord = Record<string, unknown>;

    const publicNowPlayingEndpoint = buildNowPlayingUrl(
        (import.meta.env.PUBLIC_NOW_PLAYING_URL ?? "") as string,
    );

    export let initialData: AppleMusicData = {
        nowPlaying: null,
        lastTrack: null,
        isPlaying: false,
        lyrics: [],
    };

    let data: AppleMusicData = initialData;
    let interval: ReturnType<typeof setInterval>;
    let burstTimeout: ReturnType<typeof setTimeout> | undefined;
    let prefersReducedMotion = false;
    let mediaQuery: MediaQueryList | null = null;
    let isBursting = false;
    let isCoverHovered = false;
    let lastPlayingAt = 0;

    let currentPlaybackSeconds = 0;
    let playbackTimer: ReturnType<typeof setInterval> | undefined;
    let activeLyric = "";

    let particles: WordParticle[] = [];
    let particleIdCounter = 0;

    $: track = data.nowPlaying ?? data.lastTrack;
    $: isPlaying = data.isPlaying;
    $: shouldShow = Boolean(track && isPlaying);
    $: displaySong = track?.name ?? "";
    $: displayArtist = track?.artist ?? "";
    $: shouldMarquee = `${displaySong} ${displayArtist}`.trim().length > 26;
    $: trackKey = track ? `${track.name}-${track.artist}` : "idle";
    $: lyrics = data.lyrics ?? [];

    $: {
        if (lyrics.length > 0) {
            const line = [...lyrics]
                .reverse()
                .find((l) => currentPlaybackSeconds >= l.time);
            const newLyricText = line ? line.text.trim() : "";

            if (newLyricText && newLyricText !== activeLyric) {
                activeLyric = newLyricText;
                triggerWordBurst(activeLyric);
            }
        } else {
            activeLyric = "";
            particles = [];
        }
    }

    function triggerWordBurst(lyricText: string) {
        if (prefersReducedMotion || !lyricText) return;
        const allWords = lyricText.split(/\s+/).filter(Boolean);

        const chunks: string[] = [];
        const chunkSize = allWords.length > 8 ? 3 : 2;
        for (let i = 0; i < allWords.length; i += chunkSize) {
            chunks.push(allWords.slice(i, i + chunkSize).join(" "));
        }

        const totalChunks = chunks.length;
        chunks.forEach((chunkText, index) => {
            const id = particleIdCounter++;

            const stepWidth = totalChunks > 4 ? 40 : 32;
            const totalWidth = (totalChunks - 1) * stepWidth;
            const startX = -(totalWidth / 2) + index * stepWidth;

            const normalizedPosition =
                (index / (totalChunks - 1 || 1)) * Math.PI;

            const peakHeight = totalChunks > 4 ? -46 : -36;
            const targetY = (
                Math.sin(normalizedPosition) * 12 +
                peakHeight
            ).toFixed(1);

            const pushFactor = totalChunks > 4 ? 6 : 8;
            const targetX = (startX + index * pushFactor).toFixed(1);

            const cascadeDelay = index * 0.1;

            const style = `
                --target-x: ${targetX}px;
                --target-y: ${targetY}px;
                --target-rot: 0deg;
                --burst-delay: ${cascadeDelay}s;
            `;

            particles = [...particles, { id, text: chunkText, style }];
            setTimeout(() => {
                particles = particles.filter((p) => p.id !== id);
            }, 2200);
        });
    }

    function triggerFun() {
        if (prefersReducedMotion) return;
        isBursting = false;
        clearTimeout(burstTimeout);

        requestAnimationFrame(() => {
            isBursting = true;
            burstTimeout = setTimeout(() => {
                isBursting = false;
            }, 760);
        });
    }

    function asRecord(value: unknown): UnknownRecord | null {
        return value && typeof value === "object"
            ? (value as UnknownRecord)
            : null;
    }

    function asNonEmptyString(value: unknown): string | null {
        return typeof value === "string" && value.trim().length > 0
            ? (value as string)
            : null;
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

    function extractArtist(track: UnknownRecord): string {
        const directArtist =
            asNonEmptyString(track.artist) ??
            asNonEmptyString(track.artistName);
        if (directArtist) return directArtist;
        const artists = Array.isArray(track.artists) ? track.artists : [];
        const first = artists[0];
        if (typeof first === "string") return first;
        if (asRecord(first)) return asNonEmptyString(first.name) ?? "";
        return "";
    }

    function normalizeTrack(raw: unknown): Track | null {
        const track = asRecord(raw);
        if (!track) return null;
        const name =
            asNonEmptyString(track.name) ?? asNonEmptyString(track.title) ?? "";
        const artist = extractArtist(track);
        const album =
            asNonEmptyString(track.album) ??
            asNonEmptyString(track.albumName) ??
            "";
        const albumArt =
            asNonEmptyString(track.albumArt) ??
            asNonEmptyString(track.albumArtUrl) ??
            asNonEmptyString(track.artworkUrl100) ??
            asNonEmptyString(track.artworkUrl) ??
            "";
        if (!name && !artist && !album && !albumArt) return null;
        return { name, artist, album, albumArt };
    }

    function normalizeAppleMusicData(raw: unknown): AppleMusicData | null {
        const payload = asRecord(raw);
        if (!payload) return null;
        const track =
            normalizeTrack(payload.nowPlaying) ??
            normalizeTrack(payload.now_playing) ??
            normalizeTrack(payload.track) ??
            normalizeTrack(payload.item);
        const lastTrack = normalizeTrack(payload.lastTrack) ?? track;
        const trackObj = asRecord(payload.track);
        const isPlaying =
            asBoolean(payload.isPlaying) ??
            asBoolean(payload.is_playing) ??
            asBoolean(payload.playing) ??
            asBoolean(trackObj?.isPlaying) ??
            asBoolean(trackObj?.is_playing) ??
            false;
        const rawLyrics = payload.lyrics ?? trackObj?.lyrics;
        const lyrics: LyricLine[] = Array.isArray(rawLyrics)
            ? rawLyrics.map((l) => ({
                  time: Number(l.time ?? 0),
                  text: String(l.text ?? ""),
              }))
            : [];
        return { nowPlaying: track, lastTrack, isPlaying, lyrics };
    }

    function buildNowPlayingUrl(base: string): string | null {
        const trimmed = base.trim();
        if (!trimmed) return null;
        try {
            const normalized = trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
            return new URL("now-playing", normalized).toString();
        } catch {
            return null;
        }
    }

    async function fetchData() {
        const endpoints = [INTERNAL_NOW_PLAYING_ENDPOINT];
        if (
            publicNowPlayingEndpoint &&
            publicNowPlayingEndpoint !== INTERNAL_NOW_PLAYING_ENDPOINT
        ) {
            endpoints.push(publicNowPlayingEndpoint);
        }
        for (const endpoint of endpoints) {
            try {
                const res = await fetch(endpoint, {
                    headers: { accept: "application/json" },
                    cache: "no-store",
                });
                if (!res.ok) continue;
                const payload = normalizeAppleMusicData(await res.json());
                if (!payload) continue;
                const now = Date.now();
                if (payload.isPlaying) lastPlayingAt = now;
                const hasTrack = Boolean(
                    payload.nowPlaying ?? payload.lastTrack,
                );
                const forcedPlaying =
                    hasTrack && now - lastPlayingAt <= PLAYING_GRACE_MS;
                const oldTrackKey = track
                    ? `${track.name}-${track.artist}`
                    : "";
                const newTrackKey =
                    (payload.nowPlaying ?? payload.lastTrack)
                        ? `${(payload.nowPlaying ?? payload.lastTrack)?.name}-${(payload.nowPlaying ?? payload.lastTrack)?.artist}`
                        : "";
                if (oldTrackKey !== newTrackKey) {
                    currentPlaybackSeconds = 0;
                    activeLyric = "";
                    particles = [];
                }

                data = {
                    ...payload,
                    isPlaying: payload.isPlaying || forcedPlaying,
                };

                clearInterval(playbackTimer);
                if (data.isPlaying) {
                    playbackTimer = setInterval(() => {
                        currentPlaybackSeconds += 0.5;
                    }, 500);
                }
                return;
            } catch {}
        }
    }

    onMount(() => {
        mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const syncMotionPreference = () => {
            prefersReducedMotion = Boolean(mediaQuery?.matches);
        };
        syncMotionPreference();
        mediaQuery.addEventListener("change", syncMotionPreference);

        if (data.isPlaying) {
            playbackTimer = setInterval(() => {
                currentPlaybackSeconds += 0.5;
            }, 500);
        }

        interval = setInterval(fetchData, 15_000);
        return () => {
            mediaQuery?.removeEventListener("change", syncMotionPreference);
        };
    });

    onDestroy(() => {
        clearInterval(interval);
        clearInterval(playbackTimer);
        clearTimeout(burstTimeout);
    });
</script>

{#if shouldShow}
    <div
        class="relative w-full max-w-[20rem] pb-2"
        aria-live="polite"
        in:fade={{ duration: prefersReducedMotion ? 0 : 180 }}
        out:fade={{ duration: prefersReducedMotion ? 0 : 140 }}
    >
        <div
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 overflow-visible w-0 h-0 flex items-center justify-center"
        >
            {#each particles as particle (particle.id)}
                <span
                    class="radial-word text-[0.72rem] font-bold tracking-tight px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700/60 text-neutral-800 dark:text-neutral-200 bg-white/95 dark:bg-neutral-800/95 shadow-md whitespace-nowrap absolute select-none pointer-events-none"
                    style={particle.style}
                >
                    {particle.text}
                </span>
            {/each}
        </div>

        <button
            type="button"
            class={`relative flex h-[46px] w-full items-center gap-3 rounded-full border border-neutral-300/90 bg-white/80 px-2 text-left shadow-md backdrop-blur-md transition-all duration-300 hover:border-neutral-400 hover:shadow-lg dark:border-neutral-700 dark:bg-neutral-900/80 dark:hover:border-neutral-600 isolate ${prefersReducedMotion ? "" : "intro-expand"} ${isBursting ? "is-bursting" : ""}`}
            aria-label="Now playing on Apple Music."
            on:click={triggerFun}
        >
            {#if track?.albumArt}
                <span
                    class="relative z-50 h-8 w-8 shrink-0 flex items-center"
                    on:mouseenter={() => (isCoverHovered = true)}
                    on:mouseleave={() => (isCoverHovered = false)}
                >
                    <img
                        class={`absolute left-0 z-50 h-8 w-8 rounded-full object-cover ring-1 ring-neutral-300/70 transition-transform duration-300 ease-out dark:ring-neutral-700 ${isCoverHovered ? "-translate-x-0.5 -translate-y-4 scale-[3.5] rotate-3 shadow-2xl rounded-full" : ""} ${isBursting ? "cover-burst" : ""}`}
                        src={track.albumArt}
                        alt={`${displaySong}${displayArtist ? ` by ${displayArtist}` : ""}`}
                    />
                </span>
            {:else}
                <span
                    class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-neutral-200 text-[0.7rem] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 z-50"
                    aria-hidden="true">♪</span
                >
            {/if}

            <div
                class={`relative z-10 min-w-0 flex-1 h-full flex items-center overflow-hidden ${prefersReducedMotion ? "" : "intro-content"}`}
            >
                {#key trackKey}
                    <div
                        class="min-w-0 w-full relative flex items-center z-10"
                        in:blur={{
                            duration: prefersReducedMotion ? 0 : 240,
                            amount: 2,
                        }}
                        out:fade={{ duration: prefersReducedMotion ? 0 : 140 }}
                    >
                        <div
                            class="song-marquee {shouldMarquee
                                ? 'is-animated'
                                : ''} w-full"
                        >
                            <div
                                class="song-marquee-track inline-flex items-center gap-2"
                            >
                                <span
                                    class="whitespace-nowrap text-[0.78rem] font-semibold text-neutral-900 dark:text-neutral-50"
                                >
                                    {displaySong}
                                </span>
                                {#if displayArtist}
                                    <span
                                        class="whitespace-nowrap text-[0.73rem] text-neutral-500/85 dark:text-neutral-400/85"
                                    >
                                        {displayArtist}
                                    </span>
                                {/if}
                                {#if shouldMarquee}
                                    <span
                                        class="whitespace-nowrap text-sm font-semibold text-neutral-900 dark:text-white"
                                        aria-hidden="true"
                                    >
                                        {displaySong}
                                    </span>
                                    {#if displayArtist}
                                        <span
                                            class="whitespace-nowrap text-xs text-neutral-500/85 dark:text-neutral-400/85"
                                            aria-hidden="true"
                                        >
                                            {displayArtist}
                                        </span>
                                    {/if}
                                {/if}
                            </div>
                        </div>
                    </div>
                {/key}
            </div>

            <div
                class={`flex min-w-[2rem] items-center justify-end gap-[3px] pr-1 pl-1 h-full relative z-40 bg-gradient-to-l from-white via-white/80 to-transparent dark:from-neutral-900 dark:via-neutral-900/80 rounded-r-full ${prefersReducedMotion ? "" : "intro-content"}`}
                aria-hidden="true"
            >
                {#each EQUALIZER_BARS as bar}
                    <span
                        class="eq-bar is-playing h-3 w-[3px] rounded-[1px] bg-neutral-500/70 dark:bg-neutral-400/75"
                        style={`--eq-delay:${bar.delay}s;--eq-play-duration:${bar.duration}s;--eq-min:${bar.min};--eq-mid:${bar.mid};--eq-mid-2:${bar.mid2};--eq-peak:${bar.peak};`}
                    ></span>
                {/each}
            </div>
        </button>

        <span class="sr-only">Now playing on Apple Music</span>
    </div>
{/if}

<style>
    .song-marquee.is-animated .song-marquee-track {
        padding-right: 2.2rem;
        animation: song-marquee 12s linear infinite 0.6s;
    }

    .intro-expand {
        animation: intro-pill-expand 500ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .intro-content {
        animation: intro-content-reveal 300ms ease 150ms both;
    }

    .eq-bar {
        transform-origin: bottom;
    }

    .eq-bar.is-playing {
        animation: equalizer-wave var(--eq-play-duration, 1.8s) ease-in-out
            infinite;
    }

    .eq-bar.is-playing {
        animation-delay: var(--eq-delay, 0s);
    }

    .is-bursting .eq-bar.is-playing {
        animation-duration: calc(var(--eq-play-duration, 1.8s) * 0.72);
    }

    .cover-burst {
        animation: cover-burst 600ms cubic-bezier(0.25, 1, 0.5, 1);
    }

    .radial-word {
        opacity: 0;
        transform: translate3d(0, 0, 0) scale(0.5) rotate(0deg);
        animation: radial-glide 2.2s cubic-bezier(0.14, 1, 0.34, 1) forwards;
        animation-delay: var(--burst-delay, 0s);
    }

    @keyframes radial-glide {
        0% {
            opacity: 0;
            transform: translate3d(0, 0, 0) scale(0.6) rotate(0deg);
        }
        8% {
            opacity: 1;
        }
        80% {
            opacity: 0.95;
        }
        100% {
            opacity: 0;
            transform: translate3d(var(--target-x), var(--target-y), 0)
                scale(1.05) rotate(var(--target-rot));
        }
    }

    @keyframes equalizer-wave {
        0%,
        100% {
            transform: scaleY(var(--eq-min, 0.3));
        }
        50% {
            transform: scaleY(var(--eq-peak, 0.95));
        }
    }

    @keyframes intro-pill-expand {
        0% {
            width: 2.75rem;
        }
        100% {
            width: 100%;
        }
    }

    @keyframes intro-content-reveal {
        0% {
            opacity: 0;
            transform: translateX(-3px);
        }
        100% {
            opacity: 1;
            transform: translateX(0);
        }
    }

    @keyframes song-marquee {
        0% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-50%);
        }
    }

    @keyframes cover-burst {
        0%,
        100% {
            transform: scale(1);
        }
        30% {
            transform: scale(1.08);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .song-marquee.is-animated .song-marquee-track,
        .eq-bar.is-playing,
        .cover-burst,
        .radial-word {
            animation: none !important;
            transform: none !important;
            opacity: 1 !important;
        }
    }
</style>
