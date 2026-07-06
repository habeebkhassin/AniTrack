// AniTrack service worker
// Caches the app shell so the installed app opens instantly offline.
// Live data (AniList API calls) always goes to the network from app.js
// and is persisted separately in localStorage — the SW does not touch it.

const CACHE_NAME = "anitrack-shell-v2";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never intercept calls to the AniList API — those must always
  // hit the network live (or fail visibly so the app can fall back
  // to its cached local data).
  if (url.hostname.includes("anilist.co")) {
    return;
  }

  // Page navigations (the app shell itself): network-first. This is the
  // fix for updates silently not showing up — always try to fetch the
  // latest index.html first, only falling back to the cached copy if
  // there's no connection. A cache-first strategy here is what caused an
  // installed user to get stuck on an old version indefinitely, even
  // after new files were deployed.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Static assets (icons, manifest): cache-first, since these change
  // rarely and speed/offline-availability matter more here.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match("./index.html"));
    })
  );
});