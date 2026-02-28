<script lang="ts">
  import { onMount } from "svelte";
  import World from "./World.svelte";

  let now: Date = new Date();
  let interval: ReturnType<typeof setInterval>;

  let modal: string | null = null;

  function openModal(name: string): void {
    modal = name;
  }

  function closeModal(): void {
    modal = null;
  }

  interface Post {
    slug: string;
    title: string;
    date: string;
    description: string;
  }
  let latestPost: Post | null = null;

  let royHovered: boolean = false;
  let waveActive: boolean = false;

  function triggerWave(): void {
    if (waveActive) return;
    waveActive = true;
    setTimeout(() => {
      waveActive = false;
    }, 1000);
  }

  onMount(() => {
    interval = setInterval(() => {
      now = new Date();
    }, 1000);

    (async () => {
      try {
        const res = await fetch("/blog?_data");
        if (res.ok) {
          const data = await res.json();
          latestPost = (data?.posts?.[0] as Post) ?? null;
        }
      } catch (_) {}

      if (!latestPost) {
        try {
          const mods = import.meta.glob("/src/routes/blog/posts/*.md", {
            eager: true,
          }) as Record<string, { metadata?: Partial<Post> }>;

          const posts: Post[] = Object.entries(mods)
            .map(([path, mod]) => ({
              slug: path.split("/").pop()?.replace(".md", "") ?? "",
              title:
                mod.metadata?.title ??
                path.split("/").pop()?.replace(".md", "") ??
                "",
              date: mod.metadata?.date ?? "",
              description: mod.metadata?.description ?? "",
            }))
            .sort((a, b) => (b.date > a.date ? 1 : -1));

          latestPost = posts[0] ?? null;
        } catch (err) {
          console.error(err);
        }
      }
    })();

    return () => clearInterval(interval);
  });

  function romeTime(): string {
    return now.toLocaleTimeString("en-GB", {
      timeZone: "Europe/Rome",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function romeDate(): string {
    return now.toLocaleDateString("en-GB", {
      timeZone: "Europe/Rome",
      weekday: "long",
      month: "short",
    });
  }

  function localTime(): string {
    return now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function localDate(): string {
    return now.toLocaleDateString("en-GB", {
      weekday: "long",
      month: "short",
    });
  }
</script>

<div
  class="grid grid-cols-1 md:grid-cols-4 gap-3.5 py-6 m-4 md:[grid-auto-rows:160px]"
>
  <div
    class="col-span-1 md:col-span-2 min-h-[160px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-6 flex items-center shadow-sm dark:shadow-none"
  >
    <div class="flex items-center gap-6 w-full">
      <div class="flex flex-col gap-0.5 flex-1">
        <span
          class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-mono"
          >Rome</span
        >
        <h1
          class="text-3xl font-light text-neutral-900 dark:text-neutral-100 tracking-tight leading-none tabular-nums"
        >
          {romeTime()}
        </h1>
        <span class="text-[11px] text-neutral-400 dark:text-neutral-600 mt-1"
          >{romeDate()}</span
        >
      </div>

      <div class="w-px h-14 bg-neutral-200 dark:bg-neutral-800 shrink-0"></div>

      <div class="flex flex-col gap-0.5 flex-1">
        <span
          class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-mono"
          >Local (You)</span
        >
        <h1
          class="text-3xl font-light text-neutral-900 dark:text-neutral-100 tracking-tight leading-none tabular-nums"
        >
          {localTime()}
        </h1>
        <span class="text-[11px] text-neutral-400 dark:text-neutral-600 mt-1"
          >{localDate()}</span
        >
      </div>
    </div>
  </div>

  <div
    class="flex gap-8 md:gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 items-center justify-center"
  >
    <a
      href="/projects"
      class="group flex flex-col items-center gap-2 no-underline transition-all duration-200 hover:scale-105"
    >
      <div class="w-16 h-14 relative">
        <img
          src="/assets/icons/folder-green.webp"
          alt="Projects"
          class="w-full h-full object-contain"
        />
      </div>
      <span
        class="text-[11px] text-neutral-500 dark:text-neutral-400 tracking-wide font-medium"
        >Projects</span
      >
    </a>

    <a
      href="/about"
      class="group flex flex-col items-center gap-2 no-underline transition-all duration-200 hover:scale-105"
    >
      <div class="w-16 h-14 relative">
        <img
          src="/assets/icons/folder-yellow.webp"
          alt="About"
          class="w-full h-full object-contain"
        />
      </div>
      <span
        class="text-[11px] text-neutral-500 dark:text-neutral-400 tracking-wide font-medium"
        >About</span
      >
    </a>

    <a
      href="/blog"
      class="group flex flex-col items-center gap-2 no-underline transition-all duration-200 hover:scale-105"
    >
      <div class="w-16 h-14 relative">
        <img
          src="/assets/icons/folder-blue.webp"
          alt="Blog"
          class="w-full h-full object-contain"
        />
      </div>
      <span
        class="text-[11px] text-neutral-500 dark:text-neutral-400 tracking-wide font-medium"
        >Blog</span
      >
    </a>
  </div>

  <div
    class="h-[160px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden relative cursor-pointer transition-all duration-200 hover:scale-[1.015]"
    on:click={triggerWave}
    on:mouseenter={() => (royHovered = true)}
    on:mouseleave={() => (royHovered = false)}
    role="button"
    tabindex="0"
  >
    <img
      src="/assets/images/roy.jpeg"
      alt="Roy"
      class="absolute inset-0 w-full h-full object-cover transition-transform duration-500 {royHovered
        ? 'scale-105'
        : 'scale-100'}"
    />
    <div
      class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
    ></div>
    <div class="absolute bottom-0 left-0 right-0 p-3 text-white">
      <p
        class="text-[10px] uppercase tracking-widest opacity-70 font-mono leading-none"
      >
        Say hi to
      </p>
      <p class="text-sm font-medium mt-0.5">Roy</p>
    </div>
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <span class="text-5xl {waveActive ? 'animate-wave' : 'opacity-0'}"
        >👋</span
      >
    </div>
  </div>

  <a
    href={latestPost ? `/blog/${latestPost.slug}` : "/blog"}
    class="h-[160px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 no-underline flex flex-col justify-between group transition-all duration-200 hover:scale-[1.01]"
  >
    <div>
      <span
        class="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 font-mono"
        >Latest post</span
      >
      {#if latestPost}
        <h3
          class="text-base text-neutral-900 dark:text-neutral-200 mt-1.5 font-medium leading-snug line-clamp-2"
        >
          {latestPost.title}
        </h3>
      {:else}
        <p class="text-sm text-neutral-400 mt-1">Loading…</p>
      {/if}
    </div>
    <div class="flex items-center gap-1 text-neutral-400 text-xs mt-2">
      <span
        class="group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors"
        >Read →</span
      >
    </div>
  </a>

  <div
    class="col-span-1 md:col-span-2 h-[160px] flex flex-col overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition hover:scale-[1.015] cursor-pointer"
    on:click={() => openModal("world")}
    role="button"
    tabindex="0"
  >
    <span
      class="px-4 pt-4 text-[0.65rem] uppercase tracking-[0.12em] text-neutral-400 font-sans"
      >World Visited</span
    >
    <div class="flex flex-1 items-end overflow-hidden">
      <div class="max-h-full w-full"><World /></div>
    </div>
  </div>

  <div
    class="h-[160px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col gap-3 w-full"
  >
    <div class="grid grid-cols-2 gap-2 h-full">
      <a
        href="https://bsky.app/profile/danielerolli.bsky.social"
        class="group flex items-center justify-center bg-neutral-50 dark:bg-neutral-800/40 hover:bg-blue-500/10 border border-neutral-200 dark:border-neutral-800 rounded-xl transition-all"
      >
        <i
          class="hn hn-bluesky text-xl text-neutral-400 group-hover:text-blue-500"
        ></i>
      </a>
      <a
        href="https://github.com/Daniele-rolli"
        class="group flex items-center justify-center bg-neutral-50 dark:bg-neutral-800/40 hover:bg-neutral-900/10 dark:hover:bg-white/10 border border-neutral-200 dark:border-neutral-800 rounded-xl transition-all"
      >
        <i
          class="hn hn-github text-xl text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white"
        ></i>
      </a>
      <a
        href="https://mastodon.social/@danielerolli"
        class="group flex items-center justify-center bg-neutral-50 dark:bg-neutral-800/40 hover:bg-[#6364FF]/10 border border-neutral-200 dark:border-neutral-800 rounded-xl transition-all"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i
          class="hn hn-mastodon text-xl text-neutral-400 group-hover:text-[#6364FF]"
        ></i>
      </a>
      <a
        href="https://x.com/danyrolli"
        class="group flex items-center justify-center bg-neutral-50 dark:bg-neutral-800/40 hover:bg-blue-500/10 border border-neutral-200 dark:border-neutral-800 rounded-xl transition-all"
        target="_blank"
        rel="noopener noreferrer"
      >
        <i
          class="hn hn-twitter text-xl text-neutral-400 group-hover:text-blue-500"
        ></i>
      </a>
    </div>
  </div>
</div>

{#if modal}
  <div
    class="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
    on:click={closeModal}
    role="dialog"
  >
    <div
      class="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-[20px] p-8 w-[80%] max-w-[900px] max-h-[90vh] overflow-auto relative"
      on:click|stopPropagation
    >
      <button
        on:click={closeModal}
        class="absolute top-4 right-4 w-7 h-7 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-700"
        >✕</button
      >
      {#if modal === "world"}<World />{/if}
    </div>
  </div>
{/if}

<style>
  @keyframes wave {
    0% {
      opacity: 0;
      transform: scale(0.6) rotate(-20deg);
      transform-origin: 70% 70%;
    }
    10% {
      opacity: 1;
      transform: scale(1.15) rotate(20deg);
    }
    100% {
      opacity: 0;
      transform: scale(0.6) rotate(0deg);
    }
  }
  :global(.animate-wave) {
    animation: wave 1000ms ease-in-out forwards;
  }
</style>
