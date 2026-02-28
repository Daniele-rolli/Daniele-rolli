<script lang="ts">
  const pages = ["Home", "About", "Projects", "Blog"];
</script>

<footer
  class="mt-32 flex-none bg-white/80 dark:bg-neutral-900/80 border-neutral-300 dark:border-neutral-600 m-6 rounded-xl"
>
  <div class="sm:px-8">
    <div class="mx-auto w-full max-w-7xl lg:px-8">
      <div
        class="border-t border-neutral-100 pt-10 pb-10 dark:border-neutral-700/40"
      >
        <div class="relative px-4 sm:px-8 lg:px-12">
          <div class="mx-auto max-w-2xl lg:max-w-5xl">
            <div
              class="flex flex-col items-center justify-between gap-6 md:flex-row"
            >
              <div
                class="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm font-medium text-neutral-800 dark:text-neutral-200"
              >
                {#each pages as pageName}
                  <a
                    href={pageName === "Home" ? "/" : `/${pageName.toLowerCase()}`}
                    class="transition-colors hover:text-primary"
                  >
                    {pageName}
                  </a>
                {/each}
              </div>
              <p class="text-sm text-neutral-400 dark:text-neutral-500">
                © <!-- -->2026<!-- --> Daniele Rolli. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</footer>
