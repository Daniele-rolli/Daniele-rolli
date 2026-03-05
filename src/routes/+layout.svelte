<script>
  import { onMount } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { fade, fly } from "svelte/transition";
  import "@hackernoon/pixel-icon-library/fonts/iconfont.css";
  import { page } from "$app/stores";
  import Header from "../components/app/Header.svelte";
  import "../app.css";
  import Footer from "../components/app/Footer.svelte";

  const SITE_URL = "https://daniele-rolli.com";
  const DEFAULT_TITLE = "Daniele Rolli | Software Developer & OSS Maintainer";
  const DEFAULT_DESCRIPTION =
    "Personal website of Daniele Rolli, software developer and open source maintainer.";
  const DEFAULT_SHARE_IMAGE = "/images/banner.png";

  const toAbsoluteUrl = (value = "") => {
    if (!value) return SITE_URL;
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
  };

  let pathname = "/";
  let currentUrl = SITE_URL;
  let isBlogPost = false;
  let defaultImageUrl = toAbsoluteUrl(DEFAULT_SHARE_IMAGE);
  let prefersReducedMotion = false;

  onMount(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => {
      prefersReducedMotion = mediaQuery.matches;
    };

    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);

    return () => mediaQuery.removeEventListener("change", syncMotionPreference);
  });

  $: pathname = $page.url.pathname;
  $: currentUrl = toAbsoluteUrl(pathname);
  $: isBlogPost = /^\/blog\/[^/]+\/?$/.test(pathname);
  $: defaultImageUrl = toAbsoluteUrl(DEFAULT_SHARE_IMAGE);
</script>

<svelte:head>
  {#if !isBlogPost}
    <title>{DEFAULT_TITLE}</title>
    <meta name="description" content={DEFAULT_DESCRIPTION} />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Daniele Rolli" />
    <meta property="og:title" content={DEFAULT_TITLE} />
    <meta property="og:description" content={DEFAULT_DESCRIPTION} />
    <meta property="og:url" content={currentUrl} />
    <meta property="og:image" content={defaultImageUrl} />
    <meta property="og:image:alt" content="Daniele Rolli website share image" />

    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={DEFAULT_TITLE} />
    <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
    <meta name="twitter:image" content={defaultImageUrl} />
  {/if}

  <link
    rel="alternate"
    type="application/rss+xml"
    title="Daniele Rolli Blog RSS Feed"
    href="/rss.xml"
  />
</svelte:head>

<main class="min-h-screen flex flex-col">
  <Header avatar="https://avatars.githubusercontent.com/u/67503004?v=4" />

  {#key pathname}
    <div
      class="flex-1 page-shell"
      in:fly={{
        y: prefersReducedMotion ? 0 : 14,
        opacity: prefersReducedMotion ? 1 : 0,
        duration: prefersReducedMotion ? 0 : 260,
        easing: cubicOut,
      }}
      out:fade={{ duration: prefersReducedMotion ? 0 : 140 }}
    >
      <slot />
    </div>
  {/key}

  <Footer />
</main>

<style>
  .page-shell {
    will-change: transform, opacity;
  }
  @media (prefers-reduced-motion: reduce) {
    .page-shell {
      will-change: auto;
    }
  }
</style>
