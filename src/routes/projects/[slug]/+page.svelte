<script lang="ts">
  import Stack from "../../../components/projects/Stack.svelte";
  import { marked } from "marked";
  export let data;
  console.log(data);
</script>

{#if data}
  <main class="max-w-4xl mx-auto p-6">
    <!-- Top bar -->
    <div
      class="page-enter-item flex justify-between items-end mb-4 gap-6"
      style="--enter-index: 0"
    >
      <h1 class="text-7xl leading-tight break-words min-w-0">
        {data.metadata.title}
      </h1>

      <div class="flex flex-col items-end shrink-0">
        {#if data.metadata.link}
          <a
            href={data.metadata.link}
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:text-secondary font-semibold"
          >
            <i class="hn hn-globe-solid text-xl"></i>
          </a>
        {/if}

        {#if data.metadata.github}
          <a
            href={data.metadata.github}
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:text-secondary font-semibold mt-2"
          >
            <i class="hn hn-github text-xl"></i>
          </a>
        {/if}
      </div>
    </div>

    <!-- Banner -->
    {#if data.metadata.banner}
      <img
        src={data.metadata.banner}
        alt="{data.metadata.title} banner"
        class="page-enter-item rounded-xl mb-6 w-full"
        style="--enter-index: 1"
      />
    {/if}

    {#if data.metadata.stack}
      <div class="page-enter-item" style="--enter-index: 2">
        <Stack stack={data.metadata.stack} />
      </div>
    {/if}

    <!-- Content -->
    <div
      class="page-enter-item prose dark:prose-invert max-w-none"
      style="--enter-index: 3"
    >
      {@html marked(data.content)}
    </div>
  </main>
{:else}
  <p class="page-enter-item" style="--enter-index: 0">Article not found.</p>
{/if}
