<script>
  import AppleMusic from "../components/home/AppleMusic.svelte";
  import Bento from "../components/home/Bento.svelte";
</script>

<main>
  <div class="my-20 mx-auto w-full max-w-6xl lg:px-8">
    <div class="relative px-4 sm:px-8 lg:px-12">
      <div class="max-w-2xl hero">
        <div class="hero-item relative z-30" style="--hero-index: 0">
          <AppleMusic />
        </div>
        <h1 class="text-7xl hero-item relative z-0" style="--hero-index: 1">
          Software developer & OSS Maintainer
        </h1>
        <p class="text-lg mt-6 before:animate-typewriter hero-item" style="--hero-index: 2">
          Hi there 👋, welcome to my corner of the internet. I'm Daniele Rolli,
          an hobby software developer passionate about open source software and
          how people can collaborate to build apps and tools for the community.
          You might know me as the developer behind Beaver Notes and Beaver
          Pocket.
        </p>
      </div>
    </div>
    <div class="hero-item" style="--hero-index: 3">
      <Bento />
    </div>
  </div>
</main>

<style>
  .hero-item {
    animation: hero-rise 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(var(--hero-index, 0) * 90ms + 90ms);
  }

  @keyframes hero-rise {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .hero-item {
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
</style>
