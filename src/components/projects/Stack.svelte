<script lang="ts">
  export let stack: string | string[];

  $: tools = Array.isArray(stack)
    ? stack.map((item) => item.trim()).filter(Boolean)
    : stack
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  $: iconQuery = tools.join(",");
</script>

<section
  class="relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-5 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-900/60 my-8"
>
  <div class="relative flex flex-col items-start gap-4">
    <div
      class="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2"
    >
      <p
        class="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500 dark:text-neutral-400"
      >
        Build Recipe
      </p>
      <p class="text-sm text-neutral-700 dark:text-neutral-300">
        Hand-picked tools, stitched together.
      </p>
    </div>

    <img
      src={`https://skillicons.dev/icons?i=${iconQuery}`}
      alt="Tech stack icons"
      class="block max-w-full opacity-95 dark:opacity-80 transition-opacity"
      loading="lazy"
    />
  </div>
</section>
