<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { fade, slide } from "svelte/transition";
  import ThemeSwitch from "./ThemeSwitch.svelte";

  export let avatar = "https://avatars.githubusercontent.com/u/67503004?v=4";

  let scrolled = false;
  let isMenuOpen = false;
  const pages = ["Home", "About", "Projects", "Blog"];

  $: active =
    $page.url.pathname === "/"
      ? "Home"
      : pages.find((p) => `/${p.toLowerCase()}` === $page.url.pathname);

  $: if ($page.url.pathname) isMenuOpen = false;

  onMount(() => {
    const onScroll = () => (scrolled = window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  });
</script>

<header
  class="fixed top-0 left-0 right-0 z-50 px-2 pt-4 transition-all duration-300"
  class:scrolled
>
  <div class="mx-auto max-w-5xl">
    <nav
      class="flex items-center justify-between rounded-full border bg-white/80 px-2 py-2 shadow-lg backdrop-blur-md transition-all duration-300 dark:bg-neutral-900/80 {scrolled
        ? 'border-neutral-200 dark:border-neutral-700'
        : 'border-neutral-300 dark:border-neutral-600'}"
    >
      <div class="flex flex-1 justify-start">
        <a
          href="/"
          class="shrink-0 transition-transform active:scale-95"
          aria-label="Home"
        >
          <img
            src={avatar}
            alt="Profile"
            class="h-9 w-9 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700"
          />
        </a>
      </div>

      <ul class="hidden items-center gap-1 md:flex">
        {#each pages as pageName}
          <li>
            <a
              href={pageName === "Home" ? "/" : `/${pageName.toLowerCase()}`}
              class="px-3 py-1.5 text-sm font-medium transition-colors hover:text-primary"
              class:text-primary={active === pageName}
            >
              {pageName}
            </a>
          </li>
        {/each}
      </ul>

      <div class="flex flex-1 items-center justify-end gap-2">
        <ThemeSwitch />

        <button
          class="flex h-9 w-9 items-center justify-center rounded-full transition-colors active:bg-neutral-100 dark:active:bg-neutral-800 md:hidden"
          on:click={() => (isMenuOpen = !isMenuOpen)}
          aria-label={isMenuOpen ? "Close Menu" : "Open Menu"}
        >
          {#if isMenuOpen}
            <i class="hn hn-times-circle-solid text-xl"></i>
          {:else}
            <i class="hn hn-ellipses-horizontal-solid text-xl"></i>
          {/if}
        </button>
      </div>
    </nav>

    {#if isMenuOpen}
      <div
        transition:slide={{ duration: 200 }}
        class="mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white/80 p-2 shadow-xl backdrop-blur-lg dark:border-neutral-800 dark:bg-neutral-900/80 md:hidden"
      >
        {#each pages as pageName}
          <a
            href={pageName === "Home" ? "/" : `/${pageName.toLowerCase()}`}
            class="block rounded-xl px-4 py-3 text-base font-medium transition-colors active:bg-neutral-100 dark:active:bg-neutral-800"
            class:text-primary={active === pageName}
          >
            {pageName}
          </a>
        {/each}
      </div>
    {/if}
  </div>
</header>

<style>
  :global(body) {
    padding-top: 5.5rem;
  }

  header.scrolled {
    padding-top: 0.5rem;
  }
</style>
