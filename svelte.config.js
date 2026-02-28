import adapter from "@sveltejs/adapter-static"; // Changed this
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { mdsvex } from "mdsvex";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: "404.html",
      precompress: false,
      strict: true,
    }),
    // If your repo is at username.github.io/repo-name,
    // you MUST add the paths object below:
    // paths: {
    //   base: process.env.NODE_ENV === 'production' ? '/your-repo-name' : '',
    // }
  },
  extensions: [".svelte", ".md"],
  preprocess: [
    vitePreprocess(),
    mdsvex({
      extensions: [".md"],
    }),
  ],
};

export default config;
