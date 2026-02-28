<script>
  export let name;
</script>

<main>
  <div class="my-20 mx-auto w-full max-w-7xl lg:px-8">
    <div class="relative px-4 sm:px-8 lg:px-12">
      <div class="mx-auto max-w-2xl lg:max-w-5xl">
        <div
          class="grid grid-cols-1 gap-y-10 lg:grid-cols-2 lg:grid-rows-[auto_1fr] sm:gap-y-12"
        >
          <div class="w-full lg:pl-20">
            <div class="max-w-xs px-2.5 lg:max-w-none mx-auto">
              <img
                src="https://avatars.githubusercontent.com/u/67503004?v=4"
                alt="Daniele Rolli"
                width="800"
                height="800"
                loading="lazy"
                decoding="async"
                class="aspect-square rotate-3 rounded-2xl bg-neutral-100 object-cover transition-transform duration-300 ease-in-out hover:rotate-6 dark:bg-neutral-800"
              />
            </div>
          </div>
          <ul
            role="list"
            class="flex sm:hidden w-full justify-evenly items-center"
          >
            <!--Bluesky-->
            <li class="flex">
              <a
                class="group flex text-sm font-medium text-neutral-600 transition hover:text-blue-500 dark:text-neutral-300 dark:hover:text-blue-500"
                href="https://bsky.app/profile/danielerolli.bsky.social"
                aria-label="follow on bluesky"
              >
                <i class="hn hn-bluesky text-xl group-hover:text-blue-500"></i>
              </a>
            </li>
            <!--Mastodon-->
            <li class="flex">
              <a
                class="group flex text-sm font-medium text-neutral-600 transition hover:text-[#6364FF] dark:text-neutral-300 dark:hover:text-[#6364FF]"
                href="https://mastodon.social/@danielerolli"
                aria-label="follow on mastodon"
              >
                <i class="hn hn-mastodon text-xl group-hover:text-[#6364FF]"
                ></i>
              </a>
            </li>
            <!--Github-->
            <li class="flex">
              <a
                class="group flex text-sm font-medium text-neutral-600 transition hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
                href="https://github.com/Daniele-rolli"
                aria-label="follow on github"
              >
                <i class="hn hn-github text-xl group-hover:text-neutral-900"
                ></i>
              </a>
            </li>
            <!--Email-->
            <li
              class="border-t border-neutral-100 dark:border-neutral-700/40 flex"
            >
              <a
                class="group flex text-sm font-medium text-neutral-800 transition hover:text-primary dark:text-neutral-200 dark:hover:text-primary"
                href="mailto:danielerolli@proton.me"
                aria-label="send an emailt to danielerolli@proton.me"
              >
                <i class="hn hn-envelope-solid text-xl group-hover:text-primary"
                ></i>
              </a>
            </li>
          </ul>
          <div class="lg:order-first lg:row-span-2">
            <h1
              class="text-4xl font-thin text-neutral-800 sm:text-5xl dark:text-neutral-100"
            >
              I’m Daniele Rolli. I make computers go beep boop.
            </h1>
            <div
              class="mt-6 space-y-7 text-base text-neutral-600 dark:text-neutral-200"
            >
              <article class="prose dark:prose-invert prose-zinc max-w-none">
                <p>
                  Ever since I was eight, sitting in front of my mom’s dusty HP
                  Pavilion with a taped-up power cord, computers felt less like
                  tools and more like puzzles worth solving. I spent my
                  childhood running Linux distros, writing terrible Visual Basic
                  code, and breaking things on purpose just to see what would
                  happen. In 8th grade, a friend and I turned a Tuesday
                  extracurricular into a full Linux distro
                  <a
                    href="https://web.archive.org/web/20220630143608/https://itd-os.github.io/Itd-Os/"
                    >ITD-OS</a
                  >, which somehow ended up featured in Linux Format.
                </p>
                <p>
                  At fifteen I built <a href="https://beavernotes.com"
                    >Beaver Notes</a
                  >, a note-taking app born out of frustration with every other
                  option out there. I taught myself Vue the slow way by reading
                  through by reading through
                  <a href="https://github.com/Kholid060/notething">Notething</a
                  >'s source code line by line until I understood what each
                  piece did, then using that as a foundation to build something
                  of my own. It's still how I learn best, sitting with something
                  until it clicks, then seeing how far I can take it.
                </p>
                <p>
                  Beaver Notes ended up meaning more than I expected. It
                  introduced me to people I wouldn’t have met otherwise and
                  pushed me into rooms I didn’t think I belonged in. This is
                  where I write about what I’m building and what I’m figuring
                  out as I go.
                </p>
              </article>
            </div>
          </div>
          <div class="lg:pl-20">
            <ul role="list" class="hidden sm:block">
              <!--Bluesky-->
              <li class="flex">
                <a
                  class="group flex text-sm font-medium text-neutral-600 transition hover:text-blue-500 dark:text-neutral-300 dark:hover:text-blue-500"
                  href="https://bsky.app/profile/danielerolli.bsky.social"
                >
                  <i class="hn hn-bluesky text-2xl group-hover:text-blue-500"
                  ></i>
                  <span class="ml-4">Follow on Bluesky</span></a
                >
              </li>
              <!--Mastodon-->
              <li class="mt-4 flex">
                <a
                  class="group flex text-sm font-medium text-neutral-600 transition hover:text-[#6364FF] dark:text-neutral-300 dark:hover:text-[#6364FF]"
                  href="https://mastodon.social/@danielerolli"
                >
                  <i class="hn hn-mastodon text-2xl group-hover:text-[#6364FF]"
                  ></i>
                  <span class="ml-4">Follow on Mastodon</span></a
                >
              </li>
              <!--Github-->
              <li class="mt-4 flex">
                <a
                  class="group flex text-sm font-medium text-neutral-600 transition hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-neutral-100"
                  href="https://github.com/Daniele-rolli"
                >
                  <i class="hn hn-github text-2xl group-hover:text-neutral-900"
                  ></i>
                  <span class="ml-4">Follow on GitHub</span></a
                >
              </li>
              <!--Email-->
              <li class="mt-4 flex">
                <a
                  class="group flex text-sm font-medium text-neutral-600 transition hover:text-secondary dark:text-neutral-300 dark:hover:text-primary"
                  href="mailto:danielerolli@proton.me"
                >
                  <i
                    class="hn hn-envelope-solid text-2xl group-hover:text-primary"
                  ></i>
                  <span class="ml-4">danielerolli@proton.me</span></a
                >
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>
