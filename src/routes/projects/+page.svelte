<script>
  import projects from "$lib/data/projects.json";
</script>

<main>
  <div class="sm:px-8 mt-16 sm:mt-32">
    <div class="mx-auto w-full max-w-7xl lg:px-8">
      <div class="relative px-4 sm:px-8 lg:px-12">
        <div class="mx-auto max-w-2xl lg:max-w-5xl">
          <header class="max-w-2xl">
            <h1
              class="text-4xl font-thin text-neutral-800 sm:text-5xl dark:text-neutral-100"
            >
              A collection of what I’ve been building, exploring, and messing
              with lately.
            </h1>
            <p class="mt-6 text-base text-neutral-600 dark:text-neutral-400">
              This is a collention of things I’ve built over time. Some of them
              are related to my work on Beaver Notes, others are side projects
              or experiments.
            </p>
          </header>

          <div
            class="mt-16 sm:mt-20 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {#each projects as project}
              <a
                href={`/projects/${project.name.toLowerCase().replace(/\s+/g, "-")}`}
                class="group flex items-center gap-4 p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm dark:shadow-none transition-all duration-200 hover:scale-[1.02] hover:border-neutral-300 dark:hover:border-neutral-700"
              >
                <div class="shrink-0">
                  <img
                    src={project.image}
                    alt={project.name}
                    class="h-[60px] w-[60px] bg-zinc-100 dark:bg-zinc-800 object-cover rounded-xl transition-transform duration-200 group-hover:scale-105"
                  />
                </div>

                <div class="flex flex-col min-w-0">
                  <h2
                    class="text-[15px] font-medium tracking-tight text-neutral-800 dark:text-neutral-100 leading-none mb-1 truncate"
                  >
                    {project.name}
                  </h2>
                  <p
                    class="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed"
                  >
                    {project.description}
                  </p>
                </div>
              </a>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
</main>
