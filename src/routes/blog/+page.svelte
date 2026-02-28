<script lang="ts">
  export let data;

  const readingTime = (content: string) => {
    const WPM = 200;
    const words = content.trim().split(/\s+/).length;
    return Math.ceil(words / WPM);
  };
</script>

<main>
  <div class="my-20 mx-auto w-full max-w-7xl lg:px-8">
    <div class="relative px-4 sm:px-8 lg:px-12">
      <div class="mx-auto max-w-2xl lg:max-w-5xl">
        <div class="mb-8 flex justify-end">
          <a
            href="/rss.xml"
            class="inline-flex items-center px-4 py-2 text-sm text-neutral-600 transition-colors hover:text-primary dark:border-neutral-700 dark:text-neutral-300"
          >
            <i class="hn hn-rss mr-2 text-2xl"></i>
          </a>
        </div>
        <div
          class="md:border-l md:border-neutral-100 md:pl-6 md:dark:border-neutral-700/40"
        >
          <div class="flex max-w-3xl flex-col space-y-16">
            {#each data.posts as post}
              <article class="md:grid md:grid-cols-4 md:items-baseline">
                <!-- Main content -->
                <div
                  class="md:col-span-3 group relative flex flex-col items-start"
                >
                  <h2
                    class="text-3xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-100"
                  >
                    <div
                      class="absolute -inset-x-4 -inset-y-6 z-0 scale-95 bg-neutral-50 opacity-0 transition group-hover:scale-100 group-hover:opacity-100 sm:-inset-x-6 sm:rounded-2xl dark:bg-neutral-800/50"
                    ></div>
                    <a href={`/blog/${post.slug}`}>
                      <span
                        class="absolute -inset-x-4 -inset-y-6 z-20 sm:-inset-x-6 sm:rounded-2xl"
                      ></span>
                      <span class="relative z-10">{post.title}</span>
                    </a>
                  </h2>

                  <!-- Mobile date -->
                  <div
                    class="md:hidden relative z-10 order-first mb-3 flex items-start pl-3.5"
                  >
                    <time
                      class="text-sm text-neutral-400 dark:text-neutral-500"
                      datetime={post.date}
                    >
                      <span
                        class="absolute inset-y-0 left-0 flex items-center"
                        aria-hidden="true"
                      >
                        <span
                          class="h-4 w-0.5 rounded-full bg-neutral-200 dark:bg-neutral-500"
                        ></span>
                      </span>
                      {new Date(post.date).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                    <p
                      class="ml-4 text-sm text-neutral-400 dark:text-neutral-500"
                    >
                      {readingTime(post.content)} min read
                    </p>
                  </div>

                  <!-- Excerpt -->
                  <p
                    class="relative z-10 mt-2 text-sm text-neutral-600 dark:text-neutral-400"
                  >
                    {post.excerpt}
                  </p>

                  <!-- Read article link -->
                  <div
                    aria-hidden="true"
                    class="relative z-10 mt-4 flex items-center text-center align-center gap-2 text-sm font-medium text-primary"
                  >
                    Read article
                    <i class="hn hn-arrow-right"></i>
                  </div>
                </div>

                <!-- Desktop date -->
                <div
                  class="mt-1 max-md:hidden relative z-10 order-first mb-3 flex flex-col items-start"
                >
                  <time
                    datetime={post.date}
                    class="text-sm text-neutral-400 dark:text-neutral-500"
                  >
                    {new Date(post.date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                  <p class="text-sm text-neutral-400 dark:text-neutral-500">
                    {readingTime(post.content)} min read
                  </p>
                </div>
              </article>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</main>
