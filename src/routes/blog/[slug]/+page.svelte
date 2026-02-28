<script>
  import { page } from "$app/stores";
  import { marked } from "marked";
  import { onMount } from "svelte";
  export let data;

  const SITE_URL = "https://daniele-rolli.com";
  const BLOG_IMAGE_FALLBACK = "/images/banner.png";
  const BLOG_DESCRIPTION_FALLBACK = "Thoughts on software, design, and open source.";

  let currentUrl = "";

  onMount(() => {
    currentUrl = window.location.href;
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentUrl);
  };

  const toAbsoluteUrl = (value = "") => {
    if (!value) return SITE_URL;
    if (value.startsWith("http://") || value.startsWith("https://")) return value;
    return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
  };

  const getPostDescription = () => {
    if (data?.metadata?.description) return data.metadata.description;
    if (!data?.content) return BLOG_DESCRIPTION_FALLBACK;

    const plainText = String(data.content)
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[[^\]]+\]\([^)]*\)/g, "$1")
      .replace(/[>#*_~-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!plainText) return BLOG_DESCRIPTION_FALLBACK;

    return plainText.length > 160 ? `${plainText.slice(0, 160).trim()}...` : plainText;
  };

  let postTitle = "Daniele Rolli Blog";
  let postDescription = BLOG_DESCRIPTION_FALLBACK;
  let shareImage = toAbsoluteUrl(BLOG_IMAGE_FALLBACK);
  let canonicalUrl = SITE_URL;

  $: postTitle = data?.metadata?.title
    ? `${data.metadata.title} | Daniele Rolli Blog`
    : "Daniele Rolli Blog";
  $: postDescription = getPostDescription();
  $: shareImage = toAbsoluteUrl(data?.metadata?.banner || BLOG_IMAGE_FALLBACK);
  $: canonicalUrl = toAbsoluteUrl($page.url.pathname);
</script>

<svelte:head>
  <title>{postTitle}</title>
  <meta name="description" content={postDescription} />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Daniele Rolli" />
  <meta property="og:title" content={postTitle} />
  <meta property="og:description" content={postDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={shareImage} />
  <meta property="og:image:alt" content={data?.metadata?.title || "Daniele Rolli blog post"} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={postTitle} />
  <meta name="twitter:description" content={postDescription} />
  <meta name="twitter:image" content={shareImage} />
</svelte:head>

<div class="my-20 mx-auto w-full max-w-5xl lg:px-8">
  <div class="relative px-4 sm:px-8 lg:px-12">
    <div class="mx-auto max-w-2xl lg:max-w-5xl">
      <h1 class="text-7xl font-medium">{data.metadata.title}</h1>

      <img
        src={data.metadata.banner || BLOG_IMAGE_FALLBACK}
        alt={data.metadata.title}
        class="mt-8 rounded-lg object-cover"
      />

      <div class="mt-8 flex items-center gap-4 p-2 dark:border-zinc-700/40">
        <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200"
          >Share this article:</span
        >

        <a
          href="https://twitter.com/intent/tweet?text={encodeURIComponent(
            data.metadata.title,
          )}&url={encodeURIComponent(currentUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="group p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          aria-label="Share on Twitter"
        >
          <i class="hn hn-twitter text-xl group-hover:text-blue-500"></i>
        </a>

        <a
          href="https://www.linkedin.com/sharing/share-offsite/?url={encodeURIComponent(
            currentUrl,
          )}"
          target="_blank"
          rel="noopener noreferrer"
          class="group p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          aria-label="Share on LinkedIn"
        >
          <i class="hn hn-linkedin text-xl group-hover:text-blue-700"></i>
        </a>

        <a
          href="https://bsky.app/intent/compose?text={encodeURIComponent(
            `${data.metadata.title} - ${currentUrl}`,
          )}"
          target="_blank"
          rel="noopener noreferrer"
          class="group p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          aria-label="Share on Bluesky"
        >
          <i class="hn hn-bluesky text-xl group-hover:text-sky-500"></i>
        </a>

        <a
          href="https://tootpick.org/#text={encodeURIComponent(
            `${data.metadata.title} - ${currentUrl}`,
          )}"
          target="_blank"
          rel="noopener noreferrer"
          class="group p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          aria-label="Share on Mastodon"
        >
          <i class="hn hn-mastodon text-xl group-hover:text-indigo-500"></i>
        </a>

        <button
          on:click={copyToClipboard}
          class="group p-2 transition hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"
          aria-label="Copy link"
        >
          <i class="hn hn-link text-xl group-hover:text-green-500"></i>
        </button>
      </div>

      <article class="mt-8 prose max-w-none dark:prose-invert">
        {@html marked(data.content)}
      </article>
    </div>
  </div>
</div>
