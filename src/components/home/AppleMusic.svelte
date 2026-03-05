<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { blur, fade } from "svelte/transition";

  const EQUALIZER_BARS = [
    { delay: -0.12, duration: 1.55, min: 0.3, mid: 0.6, mid2: 0.48, peak: 0.98 },
    { delay: -0.4, duration: 1.86, min: 0.24, mid: 0.52, mid2: 0.7, peak: 0.9 },
    { delay: -0.58, duration: 1.36, min: 0.36, mid: 0.72, mid2: 0.54, peak: 1 },
    { delay: -0.24, duration: 1.94, min: 0.26, mid: 0.48, mid2: 0.62, peak: 0.82 },
    { delay: -0.72, duration: 1.48, min: 0.34, mid: 0.64, mid2: 0.5, peak: 0.94 },
  ] as const;
  const INTERNAL_NOW_PLAYING_ENDPOINT = "/api/apple-music";
  const PLAYING_GRACE_MS = 3 * 60_000;

  interface Track {
    name: string;
    artist: string;
    album: string;
    albumArt: string;
  }

  interface AppleMusicData {
    nowPlaying: Track | null;
    lastTrack: Track | null;
    isPlaying: boolean;
  }

  type UnknownRecord = Record<string, unknown>;

  const publicNowPlayingEndpoint = buildNowPlayingUrl(
    (import.meta.env.PUBLIC_NOW_PLAYING_URL ?? "") as string
  );

  let data: AppleMusicData = {
    nowPlaying: null,
    lastTrack: null,
    isPlaying: false,
  };

  let interval: ReturnType<typeof setInterval>;
  let burstTimeout: ReturnType<typeof setTimeout> | undefined;
  let prefersReducedMotion = false;
  let mediaQuery: MediaQueryList | null = null;
  let isBursting = false;
  let isCoverHovered = false;
  let lastPlayingAt = 0;

  $: track = data.nowPlaying ?? data.lastTrack;
  $: isPlaying = data.isPlaying;
  $: shouldShow = Boolean(track && isPlaying);
  $: displaySong = track?.name ?? "";
  $: displayArtist = track?.artist ?? "";
  $: shouldMarquee = `${displaySong} ${displayArtist}`.trim().length > 34;
  $: trackKey = track ? `${track.name}-${track.artist}` : "idle";

  function asRecord(value: unknown): UnknownRecord | null {
    return value && typeof value === "object" ? (value as UnknownRecord) : null;
  }

  function asNonEmptyString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
  }

  function asBoolean(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase();
      if (lower === "true" || lower === "playing") return true;
      if (lower === "false" || lower === "paused" || lower === "stopped") return false;
    }
    return null;
  }

  function extractArtist(track: UnknownRecord): string {
    const directArtist = asNonEmptyString(track.artist) ?? asNonEmptyString(track.artistName);
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

    const name = asNonEmptyString(track.name) ?? asNonEmptyString(track.title) ?? "";
    const artist = extractArtist(track);
    const album = asNonEmptyString(track.album) ?? asNonEmptyString(track.albumName) ?? "";
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

    return {
      nowPlaying: track,
      lastTrack,
      isPlaying,
    };
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

  function getEndpoints(): string[] {
    const endpoints: string[] = [INTERNAL_NOW_PLAYING_ENDPOINT];
    if (publicNowPlayingEndpoint && publicNowPlayingEndpoint !== INTERNAL_NOW_PLAYING_ENDPOINT) {
      endpoints.push(publicNowPlayingEndpoint);
    }

    return endpoints;
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

  async function fetchData() {
    for (const endpoint of getEndpoints()) {
      try {
        const res = await fetch(endpoint, {
          headers: { accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) continue;

        const payload = normalizeAppleMusicData(await res.json());
        if (!payload) continue;

        const now = Date.now();
        if (payload.isPlaying) {
          lastPlayingAt = now;
        }

        const hasTrack = Boolean(payload.nowPlaying ?? payload.lastTrack);
        const forcedPlaying = hasTrack && now - lastPlayingAt <= PLAYING_GRACE_MS;

        data = {
          ...payload,
          isPlaying: payload.isPlaying || forcedPlaying,
        };
        return;
      } catch {
        // keep showing stale data
      }
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
    interval = setInterval(fetchData, 30_000);

    return () => {
      mediaQuery?.removeEventListener("change", syncMotionPreference);
    };
  });

  onDestroy(() => {
    clearInterval(interval);
    clearTimeout(burstTimeout);
  });
</script>

{#if shouldShow}
  <div
    class={`relative mb-4 w-full max-w-[22rem] min-w-[11rem] mx-auto sm:mx-0 ${isCoverHovered ? "z-[60]" : "z-20"}`}
    aria-live="polite"
    in:fade={{ duration: prefersReducedMotion ? 0 : 180 }}
    out:fade={{ duration: prefersReducedMotion ? 0 : 140 }}
  >
    <div class="pointer-events-none absolute -top-2 left-3 z-30 overflow-visible text-xs text-neutral-500 dark:text-neutral-400">
      <span class={`note-pop note-a ${isBursting ? "is-active" : ""}`}>♪</span>
      <span class={`note-pop note-b ${isBursting ? "is-active" : ""}`}>♫</span>
    </div>

    <button
      type="button"
      class={`relative flex w-full origin-left items-center gap-2 rounded-full border border-neutral-300/90 bg-white/80 px-2 py-1.5 text-left shadow-lg backdrop-blur-md transition-all duration-300 hover:border-neutral-400 hover:shadow-xl dark:border-neutral-700 dark:bg-neutral-900/80 dark:hover:border-neutral-600 ${prefersReducedMotion ? "" : "intro-expand"} ${isBursting ? "is-bursting" : ""}`}
      aria-label="Now playing on Apple Music. Tap for a fun pulse."
      on:click={triggerFun}
    >
      {#if track?.albumArt}
        <span
          class="relative z-40 h-8 w-8 shrink-0"
          on:mouseenter={() => (isCoverHovered = true)}
          on:mouseleave={() => (isCoverHovered = false)}
        >
          <img
            class={`absolute left-0 top-0 z-50 h-8 w-8 rounded-md object-cover ring-1 ring-neutral-300 transition-transform duration-300 ease-out dark:ring-neutral-700 ${isCoverHovered ? "-translate-x-2 -translate-y-3 scale-[4] rotate-3" : ""} ${isBursting ? "cover-burst" : ""}`}
            src={track.albumArt}
            alt={`${displaySong}${displayArtist ? ` by ${displayArtist}` : ""}`}
          />
        </span>
      {:else}
        <span
          class="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-neutral-200 text-[0.7rem] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-200"
          aria-hidden="true"
        >
          ♪
        </span>
      {/if}

      <div class={`relative z-0 min-w-0 flex-1 ${prefersReducedMotion ? "" : "intro-content"}`}>
        {#key trackKey}
          <div
            class="min-w-0"
            in:blur={{ duration: prefersReducedMotion ? 0 : 240, amount: 3 }}
            out:fade={{ duration: prefersReducedMotion ? 0 : 140 }}
          >
            <div class="song-marquee {shouldMarquee ? 'is-animated' : ''} overflow-hidden">
              <div class="song-marquee-track inline-flex w-max items-center gap-1.5">
                <span class="whitespace-nowrap text-[0.78rem] font-semibold leading-none text-neutral-900 dark:text-neutral-50">
                  {displaySong}
                </span>
                {#if displayArtist}
                  <span class="whitespace-nowrap text-[0.73rem] leading-none text-neutral-500 dark:text-neutral-400">
                    {displayArtist}
                  </span>
                {/if}
                {#if shouldMarquee}
                  <span
                    class="whitespace-nowrap text-[0.78rem] font-semibold leading-none text-neutral-900 dark:text-neutral-50"
                    aria-hidden="true"
                  >
                    {displaySong}
                  </span>
                  {#if displayArtist}
                    <span
                      class="whitespace-nowrap text-[0.73rem] leading-none text-neutral-500 dark:text-neutral-400"
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

      <div class={`flex min-w-[2.4rem] items-center justify-center gap-[3px] pr-1 ${prefersReducedMotion ? "" : "intro-content"}`} aria-hidden="true">
        {#each EQUALIZER_BARS as bar}
          <span
            class="eq-bar is-playing h-3 w-[3px] rounded-[2px] bg-neutral-500/65 dark:bg-neutral-300/70"
            style={`--eq-delay:${bar.delay}s;--eq-play-duration:${bar.duration}s;--eq-min:${bar.min};--eq-mid:${bar.mid};--eq-mid-2:${bar.mid2};--eq-peak:${bar.peak};`}
          ></span>
        {/each}
      </div>

      <span class={`grid h-5 w-5 shrink-0 place-items-center rounded-full bg-neutral-200/80 text-[10px] text-neutral-600 dark:bg-neutral-700/80 dark:text-neutral-300 ${prefersReducedMotion ? "" : "intro-content"}`} aria-hidden="true">
        <i class="hn hn-star-solid"></i>
      </span>
    </button>

    <span class="sr-only">Now playing on Apple Music</span>
  </div>
{/if}

<style>
  .song-marquee.is-animated .song-marquee-track {
    padding-right: 0.9rem;
    animation: song-marquee 11s linear infinite 0.4s;
  }

  .intro-expand {
    animation: intro-pill-expand 620ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  }

  .intro-content {
    animation: intro-content-reveal 340ms ease 180ms both;
  }

  .eq-bar {
    transform-origin: center;
  }

  .eq-bar.is-playing {
    animation: equalizer-wave var(--eq-play-duration, 1.8s) ease-in-out infinite;
    animation-delay: var(--eq-delay, 0s);
  }

  .is-bursting .eq-bar.is-playing {
    animation-duration: calc(var(--eq-play-duration, 1.8s) * 0.72);
  }

  .cover-burst {
    animation: cover-burst 760ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .note-pop {
    position: absolute;
    opacity: 0;
    transform: translateY(0) scale(0.92);
  }

  .note-a {
    left: 0;
  }

  .note-b {
    left: 0.9rem;
  }

  .note-pop.is-active.note-a {
    animation: note-pop-a 760ms ease-out;
  }

  .note-pop.is-active.note-b {
    animation: note-pop-b 760ms ease-out 70ms;
  }

  @keyframes equalizer-wave {
    0% {
      transform: scaleY(var(--eq-min, 0.35));
      opacity: 0.42;
    }
    25% {
      transform: scaleY(var(--eq-mid, 0.62));
      opacity: 0.58;
    }
    50% {
      transform: scaleY(var(--eq-peak, 1));
      opacity: 0.74;
    }
    75% {
      transform: scaleY(var(--eq-mid-2, 0.66));
      opacity: 0.6;
    }
    100% {
      transform: scaleY(var(--eq-min, 0.35));
      opacity: 0.42;
    }
  }

  @keyframes intro-pill-expand {
    0% {
      width: 2.8rem;
    }
    100% {
      width: 100%;
    }
  }

  @keyframes intro-content-reveal {
    0% {
      opacity: 0;
      transform: translateX(-8px);
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
    0% {
      transform: rotate(0deg) scale(1);
    }
    30% {
      transform: rotate(-7deg) scale(1.08);
    }
    60% {
      transform: rotate(5deg) scale(1.04);
    }
    100% {
      transform: rotate(0deg) scale(1);
    }
  }

  @keyframes note-pop-a {
    0% {
      opacity: 0;
      transform: translateY(0) scale(0.8);
    }
    30% {
      opacity: 0.8;
    }
    100% {
      opacity: 0;
      transform: translateY(-16px) translateX(5px) scale(1.05);
    }
  }

  @keyframes note-pop-b {
    0% {
      opacity: 0;
      transform: translateY(0) scale(0.82);
    }
    35% {
      opacity: 0.75;
    }
    100% {
      opacity: 0;
      transform: translateY(-18px) translateX(10px) scale(1.08);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .song-marquee.is-animated .song-marquee-track,
    .eq-bar.is-playing,
    .cover-burst,
    .note-pop.is-active.note-a,
    .note-pop.is-active.note-b {
      animation: none;
    }
  }
</style>
