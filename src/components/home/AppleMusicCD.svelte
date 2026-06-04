<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { fade } from "svelte/transition";

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
        lyrics: LyricLine[];
    }

    interface WordParticle {
        id: number;
        text: string;
        style: string;
    }

    const INTERNAL_NOW_PLAYING_ENDPOINT = "/api/apple-music";

    let data: AppleMusicData = {
        nowPlaying: null,
        lastTrack: null,
        isPlaying: false,
        lyrics: [],
    };

    let interval: ReturnType<typeof setInterval>;
    let prefersReducedMotion = false;
    let mediaQuery: MediaQueryList | null = null;

    let currentPlaybackSeconds = 0;
    let playbackTimer: ReturnType<typeof setInterval> | undefined;

    let particles: WordParticle[] = [];
    let particleIdCounter = 0;
    let activeLyric = "";
    let lastLyricsTrackKey = "";

    $: track = data.nowPlaying ?? data.lastTrack;
    $: isPlaying = data.isPlaying;
    $: shouldShow = Boolean(track && isPlaying);
    $: lyrics = data.lyrics ?? [];

    $: displayArtist = truncateString(track?.artist ?? "Unknown Artist", 26);
    $: displayTitle = truncateString(track?.name ?? "Unknown Track", 32);

    $: {
        if (lyrics.length > 0) {
            const line = [...lyrics]
                .reverse()
                .find((l) => currentPlaybackSeconds >= l.time);
            const newText = line ? line.text : "";

            if (newText && newText !== activeLyric) {
                activeLyric = newText;
                triggerWordBurst(activeLyric);
            }
        }
    }

    function truncateString(str: string, maxLen: number): string {
        if (str.length <= maxLen) return str;
        return str.slice(0, maxLen - 3) + "...";
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

        const totalArc =
            totalChunks > 4 ? Math.min(220, totalChunks * 45) : 140;
        const startAngle = -90 - totalArc / 2;

        chunks.forEach((chunkText, index) => {
            const id = particleIdCounter++;

            const baseAngle =
                totalChunks > 1
                    ? startAngle + index * (totalArc / (totalChunks - 1))
                    : -90;

            const maxJitter =
                totalChunks > 1 ? (totalArc / (totalChunks - 1)) * 0.15 : 5;
            const jitter = (Math.random() * 2 - 1) * maxJitter;
            const finalAngleDeg = baseAngle + jitter;
            const angleRad = (finalAngleDeg * Math.PI) / 180;

            const layerOffset = (index % 2) * 20;
            const distance = 115 + layerOffset + Math.random() * 20;

            const targetX = (Math.cos(angleRad) * distance).toFixed(1);
            const targetY = (Math.sin(angleRad) * distance).toFixed(1);

            const randomRot = (Math.random() * 14 - 7).toFixed(1);
            const delay = index * 0.12;

            const style = `
                --target-x: ${targetX}px;
                --target-y: ${targetY}px;
                --target-rot: ${randomRot}deg;
                --burst-delay: ${delay}s;
            `;

            particles = [...particles, { id, text: chunkText, style }];

            setTimeout(() => {
                particles = particles.filter((p) => p.id !== id);
            }, 2600);
        });
    }

    async function fetchLyrics(trackName: string, artistName: string) {
        try {
            const res = await fetch(
                `/api/apple-music/lyrics?track=${encodeURIComponent(trackName)}&artist=${encodeURIComponent(artistName)}`,
                { headers: { accept: "application/json" } },
            );
            if (!res.ok) return;
            const payload = await res.json();
            if (Array.isArray(payload.lyrics)) {
                data = { ...data, lyrics: payload.lyrics };
            }
        } catch {}
    }

    async function fetchData() {
        try {
            const res = await fetch(INTERNAL_NOW_PLAYING_ENDPOINT, {
                headers: { accept: "application/json" },
                cache: "no-store",
            });
            if (!res.ok) return;

            const payload = await res.json();
            const oldTrackKey = track ? `${track.name}-${track.artist}` : "";
            const newTrackKey = payload.nowPlaying
                ? `${payload.nowPlaying.name}-${payload.nowPlaying.artist}`
                : "";

            if (oldTrackKey !== newTrackKey) {
                currentPlaybackSeconds = 0;
                activeLyric = "";
                particles = [];
            }

            data = payload;

            if (newTrackKey && newTrackKey !== lastLyricsTrackKey) {
                lastLyricsTrackKey = newTrackKey;
                fetchLyrics(payload.nowPlaying.name, payload.nowPlaying.artist);
            }

            clearInterval(playbackTimer);
            if (data.isPlaying) {
                playbackTimer = setInterval(() => {
                    currentPlaybackSeconds += 0.5;
                }, 500);
            }
        } catch {
            // Fallback
        }
    }

    onMount(() => {
        mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const syncMotionPreference = () => {
            prefersReducedMotion = Boolean(mediaQuery?.matches);
        };

        syncMotionPreference();
        mediaQuery.addEventListener("change", syncMotionPreference);

        fetchData();
        interval = setInterval(fetchData, 15_000);

        return () => {
            mediaQuery?.removeEventListener("change", syncMotionPreference);
        };
    });

    onDestroy(() => {
        clearInterval(interval);
        clearInterval(playbackTimer);
    });
</script>

{#if shouldShow}
    <div
        class="relative w-85 h-85 flex items-center justify-center select-none mx-auto transition-transform duration-300"
        in:fade={{ duration: 250 }}
    >
        <div
            class="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-visible"
        >
            {#each particles as particle (particle.id)}
                <span
                    class="radial-word text-[0.78rem] font-bold text-neutral-800 dark:text-neutral-200 bg-[#FAF9F5]/90 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 px-2.5 py-0.5 rounded-full shadow-sm absolute tracking-wide whitespace-nowrap"
                    style={particle.style}
                >
                    {particle.text}
                </span>
            {/each}
        </div>

        <div
            class="relative w-64 h-64 rounded-full bg-[#E5E2DA] dark:bg-neutral-800 border-[6px] border-white dark:border-neutral-950 shadow-xl overflow-hidden flex items-center justify-center transition-colors duration-300"
        >
            <div
                class="absolute inset-0 w-full h-full object-cover transition-transform rounded-full bg-cover bg-center"
                style="background-image: url('{track?.albumArt || ''}');"
                class:spinning={isPlaying && !prefersReducedMotion}
            >
                <div
                    class="absolute inset-0 bg-black/25 dark:bg-black/40 mix-blend-multiply rounded-full"
                ></div>

                <svg
                    class="absolute inset-0 w-full h-full z-20 overflow-visible pointer-events-none drop-shadow-md"
                    viewBox="0 0 256 256"
                >
                    <defs>
                        <path
                            id="artistPath"
                            d="M 38,128 A 90,90 0 0,1 218,128"
                            fill="none"
                        />
                        <path
                            id="titlePath"
                            d="M 218,128 A 90,90 0 0,1 38,128"
                            fill="none"
                        />
                    </defs>

                    <text
                        class="text-[12px] font-extrabold tracking-[0.16em] fill-white uppercase font-sans"
                    >
                        <textPath
                            href="#artistPath"
                            startOffset="50%"
                            text-anchor="middle"
                        >
                            {displayArtist}
                        </textPath>
                    </text>

                    <text
                        class="text-[10px] font-bold tracking-[0.12em] fill-white/85 dark:fill-white/70 uppercase font-sans"
                    >
                        <textPath
                            href="#titlePath"
                            startOffset="50%"
                            text-anchor="middle"
                        >
                            {displayTitle}
                        </textPath>
                    </text>
                </svg>
            </div>

            <div
                class="relative z-30 w-24 h-24 rounded-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 shadow-md flex items-center justify-center transition-colors duration-300"
            >
                <div
                    class="w-20 h-20 rounded-full border border-neutral-200 dark:border-neutral-800 bg-[#FAF9F5] dark:bg-neutral-950 flex items-center justify-center transition-colors duration-300"
                >
                    <div
                        class="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-700 bg-[#E5E2DA] dark:bg-neutral-800 shadow-inner transition-colors duration-300"
                    ></div>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .spinning {
        animation: rotate-vinyl 25s linear infinite;
    }

    @keyframes rotate-vinyl {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    .radial-word {
        opacity: 0;
        top: 50%;
        left: 50%;
        transform: translate3d(-50%, -50%, 0) scale(0.5);
        animation: radial-glide 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        animation-delay: var(--burst-delay, 0s);
        transform-origin: center center;
    }

    @keyframes radial-glide {
        0% {
            opacity: 0;
            transform: translate3d(-50%, -50%, 0) scale(0.5) rotate(0deg);
        }
        10% {
            opacity: 1;
        }
        75% {
            opacity: 1;
        }
        100% {
            opacity: 0;
            transform: translate3d(
                    calc(-50% + var(--target-x)),
                    calc(-50% + var(--target-y)),
                    0
                )
                scale(1.02) rotate(var(--target-rot));
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .spinning,
        .radial-word {
            animation: none !important;
        }
    }
</style>
