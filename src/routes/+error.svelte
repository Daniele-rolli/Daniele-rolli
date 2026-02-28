<script lang="ts">
  import { onMount } from "svelte";

  let canvas: HTMLCanvasElement;
  let copy = "404";
  let ctx: CanvasRenderingContext2D;
  let particles: Particle[] = [];
  let amount = 0;
  let mouse = { x: 0, y: 0 };
  let radius = 1;

  const colors = [
    "#FF6B6B",
    "#FFE66D",
    "#4472CA",
    "#6BCB77",
    "#F0A6CA",
    "#FF9F1C",
    "#2EC4B6",
  ];

  let ww = 0;
  let wh = 0;

  class Particle {
    x: number;
    y: number;
    dest: { x: number; y: number };
    r: number;
    vx: number;
    vy: number;
    accX: number;
    accY: number;
    friction: number;
    color: string;

    constructor(x: number, y: number) {
      this.x = Math.random() * ww;
      this.y = Math.random() * wh;
      this.dest = { x, y };
      this.r = Math.random() * 5 + 2;
      this.vx = (Math.random() - 0.5) * 20;
      this.vy = (Math.random() - 0.5) * 20;
      this.accX = 0;
      this.accY = 0;
      this.friction = Math.random() * 0.05 + 0.94;
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    render() {
      this.accX = (this.dest.x - this.x) / 1000;
      this.accY = (this.dest.y - this.y) / 1000;
      this.vx += this.accX;
      this.vy += this.accY;
      this.vx *= this.friction;
      this.vy *= this.friction;

      this.x += this.vx;
      this.y += this.vy;

      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fill();

      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < radius * 70) {
        this.accX = dx / 100;
        this.accY = dy / 100;
        this.vx += this.accX;
        this.vy += this.accY;
      }
    }
  }

  function initScene() {
    ww = canvas.width = window.innerWidth;
    wh = canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, ww, wh);
    ctx.font = `bold ${ww / 5}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(copy, ww / 2, wh / 2);

    const data = ctx.getImageData(0, 0, ww, wh).data;
    ctx.clearRect(0, 0, ww, wh);
    ctx.globalCompositeOperation = "screen";

    particles = [];
    for (let i = 0; i < ww; i += Math.round(ww / 150)) {
      for (let j = 0; j < wh; j += Math.round(ww / 150)) {
        if (data[(i + j * ww) * 4 + 3] > 150) {
          particles.push(new Particle(i, j));
        }
      }
    }
    amount = particles.length;
  }

  function render() {
    requestAnimationFrame(render);
    ctx.clearRect(0, 0, ww, wh);
    particles.forEach((p) => p.render());
  }

  function onMouseMove(e: MouseEvent) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  }

  function onTouchMove(e: TouchEvent) {
    if (e.touches.length > 0) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }
  }

  function onTouchEnd() {
    mouse.x = -9999;
    mouse.y = -9999;
  }

  function onClick() {
    radius = (radius + 1) % 5;
  }

  onMount(() => {
    ctx = canvas.getContext("2d")!;
    initScene();
    render();

    window.addEventListener("resize", initScene);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("click", onClick);
    window.addEventListener("touchend", onTouchEnd);
  });
</script>

<canvas bind:this={canvas}></canvas>

<div
  class="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center space-y-4"
>
  <p class="mt-10 text-3xl font-bold">Wrong Turn?</p>
  <p>The page you are looking for does not exist.</p>
  <a
    href="/"
    class="mt-4 px-6 py-2 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
    >Home</a
  >
</div>

<style>
  canvas {
    position: fixed;
    top: 0;
    left: 0;
  }
</style>
