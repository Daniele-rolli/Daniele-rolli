import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const res = await fetch("/api/apple-music");
    if (res.ok) {
      return { appleMusic: await res.json() };
    }
  } catch (e) {
    console.error(e);
  }
  return {
    appleMusic: {
      nowPlaying: null,
      lastTrack: null,
      isPlaying: false,
      lyrics: [],
    },
  };
};
