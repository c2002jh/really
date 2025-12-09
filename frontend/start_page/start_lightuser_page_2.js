// start_lightuser_page_2.js — Final (C-POP alias & pool improved)
// - Fix: "C-POP" treated explicitly as China pop (aliases include "china pop", "mandopop", "cantopop").
// - If you don't like the sample tracks for c-pop, replace the videoId entries in YT_VIDEO_POOL["c-pop"] with preferred China-pop video IDs.
// - oEmbed still used to fetch authoritative title/artist so displayed metadata matches the actual YouTube video.
// - Rest of the flow unchanged: plays muted autoplay, user can click play to unmute, stores selections with genre_display + genre_key + track meta.

console.log("start_lightuser_page_2.js: loaded (final, C-POP mapping updated)");

/* -------------------------
   Config / Pools
   ------------------------- */
const GENRE_MAP = {
  1: ["hip-hop", "rock"],
  2: ["indie", "ballad"],
  3: ["k-pop", "j-pop", "c-pop"],
  4: ["classical", "jazz"],
  5: ["edm", "house"],
};

const MAX_SLOTS = 5;
let currentSlot = 1;
let userSelections = [];
let currentTrack = null; // { title, artist, videoId, cover, genre_display, genre_key }

let ytPlayer = null;
let ytPlayerReady = false;
let isPlaying = false;
let userInteracted = false;

/* YouTube video pools per canonical keys.
   Replace videoId entries with your preferred clips. The example c-pop pool includes placeholders/examples
   intended to represent China/Chinese-pop (Mandopop/Cantopop) content — please swap for real IDs you want. */
const YT_VIDEO_POOL = {
  "hip-hop": [
    {
      videoId: "kXYiU_JCYtU",
      title: "Numb (pool)",
      artist: "Linkin Park (pool)",
    },
  ],
  indie: [
    {
      videoId: "3tmd-ClpJxA",
      title: "Ho Hey (pool)",
      artist: "The Lumineers (pool)",
    },
  ],
  ballad: [
    {
      videoId: "hLQl3WQQoQ0",
      title: "Someone Like You (pool)",
      artist: "Adele (pool)",
    },
  ],
  "k-pop": [
    {
      videoId: "9bZkp7q19f0",
      title: "Gangnam Style (pool)",
      artist: "PSY (pool)",
    },
  ],
  "j-pop": [
    {
      videoId: "sNPnbI1arSE",
      title: "PPAP (pool)",
      artist: "Pico Taro (pool)",
    },
  ],
  // C-POP (China pop) — curated sample list (replace with actual China-pop / Mandopop / Cantopop YouTube IDs)
  "c-pop": [
    // Example placeholders — replace with canonical China-pop video IDs you want:
    {
      videoId: "CPOP_VIDEO_ID_1",
      title: "C-Pop Sample 1 (pool)",
      artist: "C Artist 1 (pool)",
    },
    {
      videoId: "CPOP_VIDEO_ID_2",
      title: "C-Pop Sample 2 (pool)",
      artist: "C Artist 2 (pool)",
    },
    {
      videoId: "CPOP_VIDEO_ID_3",
      title: "C-Pop Sample 3 (pool)",
      artist: "C Artist 3 (pool)",
    },
  ],
  classical: [
    {
      videoId: "GRxofEmo3HA",
      title: "Moonlight Sonata (pool)",
      artist: "Beethoven (pool)",
    },
  ],
  jazz: [
    {
      videoId: "HMnrl0tmd3k",
      title: "Take Five (pool)",
      artist: "Dave Brubeck (pool)",
    },
  ],
  edm: [
    {
      videoId: "IcrbM1l_BoI",
      title: "Wake Me Up (pool)",
      artist: "Avicii (pool)",
    },
  ],
  house: [
    {
      videoId: "2vjPBrBU-TM",
      title: "Chill House (pool)",
      artist: "DJ (pool)",
    },
  ],
};

/* Aliases: map various input/display strings to canonical pool keys.
   C-POP is explicitly mapped to 'c-pop' and common synonyms added. */
const GENRE_ALIASES = {
  rock: "hip-hop",
  "hip hop": "hip-hop",
  hiphop: "hip-hop",
  kpop: "k-pop",
  jpop: "j-pop",
  cpop: "c-pop",
  "c-pop": "c-pop",
  "china pop": "c-pop",
  "china-pop": "c-pop",
  "china pop": "c-pop",
  mandopop: "c-pop",
  cantopop: "c-pop",
  "mandarin pop": "c-pop",
  "chinese pop": "c-pop",
};

/* -------------------------
   Helpers
   ------------------------- */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function resolvePoolKey(genre) {
  if (!genre) return null;
  const key = genre.toLowerCase();
  if (YT_VIDEO_POOL[key]) return key;
  if (GENRE_ALIASES[key] && YT_VIDEO_POOL[GENRE_ALIASES[key]])
    return GENRE_ALIASES[key];
  const normalized = key.replace(/[^a-z0-9\-]/g, "");
  if (YT_VIDEO_POOL[normalized]) return normalized;
  return null;
}

/* -------------------------
   YouTube IFrame API loader
   ------------------------- */
function loadYouTubeAPI() {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      ytPlayerReady = true;
      resolve();
      return;
    }
    window.onYouTubeIframeAPIReady = () => {
      ytPlayerReady = true;
      resolve();
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.body.appendChild(s);
  });
}

/* -------------------------
   Fetch canonical metadata via YouTube oEmbed
   ------------------------- */
async function fetchYouTubeOEmbed(videoId) {
  if (!videoId) return null;
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    "https://www.youtube.com/watch?v=" + videoId
  )}&format=json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("oEmbed request failed", res.status, res.statusText);
      return null;
    }
    const data = await res.json();
    return { title: data.title || "", author_name: data.author_name || "" };
  } catch (err) {
    console.warn("oEmbed fetch error", err);
    return null;
  }
}

/* -------------------------
   Create / manage YT Player
   ------------------------- */
function createYTPlayer(containerEl, videoId, autoplay = true) {
  if (!window.YT || !window.YT.Player) {
    console.warn("YouTube API not ready");
    return null;
  }

  let playerDiv = containerEl.querySelector(".yt-player-root");
  if (!playerDiv) {
    playerDiv = document.createElement("div");
    playerDiv.className = "yt-player-root";
    playerDiv.style.width = "100%";
    playerDiv.style.height = "100%";
    containerEl.appendChild(playerDiv);
  } else {
    playerDiv.innerHTML = "";
  }

  if (ytPlayer && typeof ytPlayer.destroy === "function") {
    try {
      ytPlayer.destroy();
    } catch (e) {}
    ytPlayer = null;
  }

  const startMuted = !userInteracted;

  ytPlayer = new YT.Player(playerDiv, {
    width: "100%",
    height: "100%",
    videoId,
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 1,
      rel: 0,
      modestbranding: 1,
      mute: startMuted ? 1 : 0,
    },
    events: {
      onReady: (e) => {
        try {
          if (autoplay) e.target.playVideo();
        } catch (err) {
          console.warn("YT play error onReady:", err);
        }
      },
      onStateChange: (ev) => {
        if (ev.data === YT.PlayerState.PLAYING) {
          isPlaying = true;
          updatePlayIcon();
        } else if (
          ev.data === YT.PlayerState.PAUSED ||
          ev.data === YT.PlayerState.ENDED
        ) {
          isPlaying = false;
          updatePlayIcon();
        }
      },
      onError: (err) => {
        console.error("YT player error:", err);
      },
    },
  });

  return ytPlayer;
}

/* -------------------------
   UI helpers
   ------------------------- */
function updatePlayIcon() {
  const playIconEl = document.querySelector(".music-play-icon");
  if (!playIconEl) return;
  // reversed icons per earlier request
  if (isPlaying) {
    playIconEl.src = "icon/music_play_icon.png";
    playIconEl.classList.add("pause-icon");
  } else {
    playIconEl.src = "icon/pause_icon.png";
    playIconEl.classList.remove("pause-icon");
  }
}

/* -------------------------
   Core flow
   ------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  const main = document.querySelector(".start-light-page-2");
  const leftIcon = document.querySelector(".side-icon-left");
  const rightIcon = document.querySelector(".side-icon-right");
  const mysteryCard = document.querySelector(".mystery-card");
  const mysteryMark = document.querySelector(".mystery-mark");
  const titleEl = document.querySelector(".track-title");
  const artistEl = document.querySelector(".track-artist");
  const genreBg = document.querySelector(".genre-bg-text");
  const selectionIcon = document.querySelector(".selection-icon");
  const playIcon = document.querySelector(".music-play-icon");

  if (!mysteryCard) {
    console.error("mystery-card element not found - abort");
    return;
  }

  // load YT API early
  loadYouTubeAPI().then(() => console.log("YouTube API ready"));

  // play/pause click handler
  if (playIcon) {
    playIcon.addEventListener("click", () => {
      userInteracted = true;
      if (!currentTrack) {
        console.warn("No currentTrack to control");
        return;
      }
      if (ytPlayer && ytPlayerReady) {
        try {
          if (typeof ytPlayer.isMuted === "function" && ytPlayer.isMuted()) {
            if (typeof ytPlayer.unMute === "function") ytPlayer.unMute();
          }
          if (!isPlaying) ytPlayer.playVideo();
          else ytPlayer.pauseVideo();
        } catch (e) {
          console.warn("YT play/pause error:", e);
          window.open(
            `https://www.youtube.com/watch?v=${currentTrack.videoId}`,
            "_blank"
          );
        }
      } else {
        window.open(
          `https://www.youtube.com/watch?v=${currentTrack.videoId}`,
          "_blank"
        );
      }
    });
  } else {
    console.warn("play icon element not found");
  }

  if (leftIcon) leftIcon.addEventListener("click", () => showResult("good"));
  if (rightIcon) rightIcon.addEventListener("click", () => showResult("bad"));

  /* loadSlot: picks genre_display, resolves poolKey, picks video, fetches oEmbed meta, creates player */
  async function loadSlot(slot) {
    console.log("loadSlot", slot);
    if (main) main.classList.remove("result-mode");
    if (mysteryMark) mysteryMark.style.display = "";
    if (mysteryCard) mysteryCard.style.backgroundImage = "";

    const choices = GENRE_MAP[slot] || [];
    if (!choices.length) {
      console.warn("No genre choices for slot", slot);
      proceedToNextSlot();
      return;
    }

    const genre_display = pickRandom(choices);
    if (genreBg) genreBg.textContent = genre_display.toUpperCase();

    const poolKey = resolvePoolKey(genre_display);
    if (!poolKey) {
      console.warn("No pool found for genre_display:", genre_display);
      window.open(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(
          genre_display + " music"
        )}`,
        "_blank"
      );
      proceedToNextSlot();
      return;
    }

    const pool = YT_VIDEO_POOL[poolKey];
    if (!pool || pool.length === 0) {
      console.warn("Empty pool for key:", poolKey);
      // As fallback for c-pop specifically, open a China-pop search to let user pick
      if (poolKey === "c-pop") {
        window.open(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(
            "Chinese pop"
          )}`,
          "_blank"
        );
      }
      proceedToNextSlot();
      return;
    }

    const chosen = pickRandom(pool);
    const videoId = chosen.videoId;

    // Prepare currentTrack with pool fallback metadata first
    currentTrack = {
      title: chosen.title || "",
      artist: chosen.artist || "",
      videoId: videoId,
      cover: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      genre_display: genre_display,
      genre_key: poolKey,
    };

    // For better accuracy, fetch canonical metadata via oEmbed; override title/artist if available
    try {
      const o = await fetchYouTubeOEmbed(videoId);
      if (o) {
        currentTrack.title = o.title || currentTrack.title;
        currentTrack.artist = o.author_name || currentTrack.artist;
        console.log(
          "oEmbed metadata applied:",
          currentTrack.title,
          currentTrack.artist
        );
      } else {
        console.info("oEmbed returned no data; using pool metadata");
      }
    } catch (e) {
      console.warn("oEmbed fetch error/fallback:", e);
    }

    // Update UI
    if (mysteryMark) mysteryMark.style.display = "none";
    if (mysteryCard)
      mysteryCard.style.backgroundImage = `url("${currentTrack.cover}")`;
    if (titleEl) titleEl.textContent = "";
    if (artistEl) artistEl.textContent = "";

    if (!ytPlayerReady) {
      try {
        await loadYouTubeAPI();
      } catch (e) {
        console.warn("YT API load failed:", e);
      }
    }

    // create player in mysteryCard; start muted if user hasn't interacted
    createYTPlayer(mysteryCard, currentTrack.videoId, true);

    // update state
    isPlaying = true;
    updatePlayIcon();
  }

  /* showResult: save selection object (explicit fields) */
  function showResult(type) {
    console.log("showResult", type);

    if (currentTrack) {
      userSelections.push({
        slot: currentSlot,
        selection: type,
        genre_display: currentTrack.genre_display || "",
        genre_key: currentTrack.genre_key || "",
        title: currentTrack.title || "",
        artist: currentTrack.artist || "",
        cover: currentTrack.cover || "",
        videoId: currentTrack.videoId || "",
      });
    } else {
      userSelections.push({
        slot: currentSlot,
        selection: type,
        genre_display: "",
        genre_key: "",
        title: null,
        artist: null,
        cover: null,
        videoId: null,
      });
    }

    // UI: show result info
    if (main) main.classList.add("result-mode");
    if (mysteryCard && currentTrack && currentTrack.cover)
      mysteryCard.style.backgroundImage = `url("${currentTrack.cover}")`;
    if (mysteryMark) mysteryMark.style.display = "none";
    if (titleEl)
      titleEl.textContent = (currentTrack && currentTrack.title) || "Unknown";
    if (artistEl)
      artistEl.textContent = (currentTrack && currentTrack.artist) || "";
    if (selectionIcon)
      selectionIcon.src =
        type === "good" ? "icon/check2_icon.png" : "icon/x_icon.png";

    // stop playback
    try {
      if (
        ytPlayer &&
        ytPlayerReady &&
        typeof ytPlayer.pauseVideo === "function"
      ) {
        ytPlayer.pauseVideo();
      }
    } catch (e) {
      console.warn("pause error:", e);
    }
    isPlaying = false;
    updatePlayIcon();

    setTimeout(() => proceedToNextSlot(), 1200);
  }

  /* proceedToNextSlot: increment slot or finish */
  function proceedToNextSlot() {
    currentSlot++;
    currentTrack = null;

    if (main) main.classList.remove("result-mode");
    if (mysteryMark) mysteryMark.style.display = "";
    if (mysteryCard) mysteryCard.style.backgroundImage = "";
    const titleElLocal = document.querySelector(".track-title");
    const artistElLocal = document.querySelector(".track-artist");
    if (titleElLocal) titleElLocal.textContent = "";
    if (artistElLocal) artistElLocal.textContent = "";
    const selectionIconLocal = document.querySelector(".selection-icon");
    if (selectionIconLocal) selectionIconLocal.src = "";

    if (ytPlayer && typeof ytPlayer.destroy === "function") {
      try {
        ytPlayer.destroy();
      } catch (e) {}
      ytPlayer = null;
      ytPlayerReady = false;
    }

    if (currentSlot > MAX_SLOTS) {
      try {
        localStorage.setItem(
          "neurotune_selections",
          JSON.stringify(userSelections)
        );
        console.log("Saved selections -> localStorage:", userSelections);
      } catch (e) {
        console.warn("Failed to save selections to localStorage:", e);
      }
      window.location.href = "start_lightuser_page_3.html";
      return;
    }

    loadSlot(currentSlot);
  }

  // Start
  loadSlot(currentSlot);

  // expose for debugging
  window.__NEUROTUNE_USER_SELECTIONS = userSelections;
});
