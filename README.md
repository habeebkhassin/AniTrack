# AniTrack

A personal, installable anime episode tracker. Runs entirely on your phone,
stores your list locally, and pulls live airing schedules from the free
[AniList](https://anilist.co) API when you're online.

## What's in this folder
- `index.html` — the whole app (UI + logic)
- `manifest.json` — makes it installable as an app on Android
- `sw.js` — service worker, caches the app shell so it opens offline
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — app icons

## Why it needs a URL, not just a file
Android's "install as app" (and offline service workers in general) only work
over `https://` or `http://localhost` — not a `file://` path opened directly.
So you need to put these files somewhere with a URL. The easiest free option:

### Option A — GitHub Pages (recommended, ~5 minutes)
1. Create a free GitHub account if you don't have one.
2. Create a new repository, e.g. `anitrack`.
3. Upload all 6 files in this folder to that repo (drag-and-drop works on
   github.com's web UI — no git knowledge needed).
4. Go to the repo's **Settings → Pages**, set source to the `main` branch,
   root folder, and save.
5. GitHub gives you a URL like `https://yourusername.github.io/anitrack/`.
6. Open that URL in Chrome on your Android phone.
7. Tap the **⋮** menu → **Add to Home screen** (Chrome may also prompt you
   automatically). This installs it as a real app icon.

### Option B — any other static host
Netlify, Vercel, Cloudflare Pages, or even a Raspberry Pi with a tiny web
server all work the same way — just serve these files over HTTPS (or
`localhost` for local testing) and install from there.

## How it works
- Two modes at the top: **Anime** and **Reading** (manga/manhwa/manhua/novels),
  each with their own status tabs and their own AniList search.
- Tap **+** to search and add a title. Tap **+1 EP**/**+1 CH** on a card for
  quick progress updates, or tap the card itself to open the full detail
  view: episode/chapter/volume steppers, status, a 10-point rating, a
  favorite toggle (shown as a ★ on the card), and a private notes field.
- Each anime shows a live "next episode" countdown pulled from AniList's
  real airing schedule, refreshed automatically every 15 minutes and
  whenever you come back online.
- Your list is saved in the phone's local storage — it's still there with
  no internet. The app only needs internet to search, refresh airing
  times, and during import.

## Importing your TV Time library
Tap **IMPORT** in the header, choose your TV Time export `.json` file, then
**Start matching**. For each show in the export the app:
1. Searches AniList for a matching anime by title (exact match first, then
   a fuzzy fallback).
2. If nothing matches — e.g. it's a live-action show, since TV Time exports
   include everything you tracked there, not just anime — it's skipped and
   listed at the end so you know it wasn't dropped silently.
3. If it matches, episodes marked watched (excluding specials) become your
   progress, and status is mapped: `up_to_date` → Watching or Completed
   (if the series has finished airing and you're caught up), `continuing`
   → Watching, `not_started_yet`/`watch_later` → Plan to Watch, `stopped`
   → Dropped. Favorites carry over too.
4. Watch dates from the export are kept per-episode in the background —
   useful later if you want streaks or a watch-history view.

Import is safe to re-run: matches are done by AniList ID, so a show you've
already imported gets merged (progress/favorites/history combined) instead
of duplicated.

This runs one search per show with a short delay between each to stay
under AniList's rate limit, so a library of a few hundred shows takes
several minutes — keep the app open while it runs, and you can stop early
with "Stop and keep progress" without losing what's already been matched.

**Resolving skipped titles:** once the automatic pass finishes, tap
**"Resolve skipped titles manually"** to step through each one that wasn't
matched — the search box is pre-filled with the original title, so you can
tweak it (try an alternate spelling, drop a subtitle, etc.) and pick the
right result yourself. "Not anime / skip" moves to the next one without
adding anything, and "Finish later" saves your place and closes — nothing
is lost either way. Every add here goes through the same duplicate check
as everywhere else in the app: matching is always by AniList ID, so a
title that's already in your list can never be added twice, whether it
comes from the automatic pass, the manual resolver, or the regular search.

## Stats, Discover, Lists, Upcoming, and Alerts

The header toolbar has four buttons plus an alerts toggle:

- **Stats** — episodes watched / chapters read, an hours-watched estimate
  (based on each anime's actual runtime from AniList, falling back to 24
  minutes if unknown), completed count, your current watch/read streak, a
  6-month bar chart, your top genres, and a badges grid (milestones like
  "Century Club" at 100 episodes or "Streak Keeper" at a 7-day streak).
  Streaks and the monthly chart come from a watch-history log recorded
  automatically every time you mark something watched — via the tick, the
  detail-view stepper, or an import.
- **Discover** — browse Trending, Popular, This Season, or by Genre,
  pulled live from AniList, with a one-tap **+** to add straight to your
  list (duplicate-safe, same as everywhere else in the app).
- **Lists** — create your own named collections (e.g. "Comfort Rewatches,"
  "Currently Airing Favorites") that can mix anime and manga. Add a title
  to one or more lists from its detail view ("Add to a custom list").
- **Upcoming** — a tab next to the status filters (Anime mode only)
  showing everything with a real next-airing date that hasn't aired yet,
  soonest first.
- **Alerts** — tap "Alerts: Off" to enable local notifications when an
  episode/chapter you're tracking becomes newly available. **Important
  limitation:** without a push server, this only fires while AniTrack is
  actually open and running its periodic refresh — it is not a true
  background/closed-app push notification. Treat it as a nice-to-have
  while the app's open, not a guarantee you'll be alerted the moment
  something airs.

Also new in the detail view:
- **Season number** (anime) — defaults to 1; edit it if you're tracking a
  later season and want the `S2 | E8` display to reflect that.
- **Custom poster** — paste an image URL to override a title's cover art,
  with a one-tap reset back to the AniList default.

### What's intentionally not here

TV Time's own feature set splits into things that fit a private,
single-user, local app (all of the above) and things that are inherently
social — episode comments, character voting, public profiles, friend
activity feeds, community-driven trending. Those need other people,
accounts, and a backend, which conflicts with the "single user, no
accounts, no social features" goal this app started from, so they're left
out on purpose rather than by oversight.

## Notes / limitations
- This is unauthenticated and single-user by design — there's no login,
  and your data lives only on this device (uninstalling the app or
  clearing site data wipes your list).
- AniList's database covers most anime and manga, but very obscure or
  extremely new titles occasionally have incomplete data.
- TV Time groups multi-season shows under one entry; AniList often splits
  seasons into separate entries. The importer matches to whichever AniList
  entry the title resolves to (usually season 1), so progress on
  long-running multi-season shows may need a manual nudge afterward —
  easy to fix in the detail view.
