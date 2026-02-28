<script>
  import { onMount, tick } from "svelte";

  let isDark = false;

  onMount(async () => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    isDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    await tick(); // Ensures reactivity kicks in after mount

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  });

  function toggleTheme() {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }
</script>

<button
  on:click={toggleTheme}
  class="flex items-center justify-center p-2 rounded-full transition"
>
  {#if isDark}
    <i class="hn hn-sun-solid w-5 h-5 text-xl text-primary"></i>
  {:else}
    <i class="hn hn-moon-solid w-5 h-5 text-xl text-primary"></i>
  {/if}
</button>
