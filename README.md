# AniTrack
### *made with gratitude to TV Time, 2011–2026*

TV Time closes for good on July 15, 2026. tvtime.com goes offline, the
app comes down from the stores, and fifteen years of everyone's watch
history goes with it.

That's not nothing. For a lot of people, TV Time wasn't just a
checklist — it was a small, steady record of years of evenings spent
watching shows they loved, kept without being asked to make a big deal
of it. Losing that quietly is still losing something real, and it's
fair to feel that.

This app doesn't try to replace it. It can't — there's no community
here, no comments, none of the life TV Time had as a shared place for
people who loved TV. What it can do is hold onto the one part that's
yours alone: the watch history you built, rescued from your export, now
living on your own phone instead of someone else's server. A small,
respectful continuation of the habit, not a rebuild of the app.

Thank you, TV Time, for keeping count all those years.

---

## What's in this folder
- `index.html` — the whole app (UI + logic, one file, no build step)
- `manifest.json` — makes it installable as a real app on Android
- `sw.js` — service worker, caches the app shell so it opens offline
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — app icons

## Why it needs a URL, not just a file

Android's "install as app" (and offline service workers in general) only
work over `https://` or `http://localhost` — not a `file://` path opened
directly from your downloads folder. So these files need to live
somewhere with a real URL first.

### Option A — GitHub Pages (recommended, ~5 minutes, free)
1. Create a free GitHub account if you don't have one.
2. Create a new repository, e.g. `anitrack`.
3. Upload all 6 files in this folder (drag-and-drop works right in
   github.com's web UI — no git knowledge required).
4. Go to the repo's **Settings → Pages**, set source to the `main`
   branch, root folder, and save.
5. GitHub gives you a URL like `https://yourusername.github.io/anitrack/`.
6. Open that URL in Chrome on your Android phone.
7. Tap the **⋮** menu → **Add to Home screen** (Chrome may also prompt
   you automatically). This installs it as a real app icon.

### Option B — any other static host
Netlify, Vercel, Cloudflare Pages, or a home server all work the same
way — just serve these files over HTTPS (or `localhost` for testing) and
install from there.

## How it works

- Two modes at the top: **Anime** and **Reading** (manga/manhwa/manhua/
  novels), each with their own status tabs and their own AniList search.
- Tap **+** to search and add a title. Tap the **tick** on a card to mark
  the next episode/chapter watched, or tap the card itself for the full
  detail view: episode/chapter/volume steppers, status, a 10-point
  rating, a favorite toggle, and a private notes field.
- Each anime shows a live "next episode" countdown pulled from AniList's
  real airing schedule, refreshed automatically every 15 minutes and
  whenever you come back online.
- Your list lives in the phone's local storage — still there with no
  internet. The app only needs internet to search, refresh airing times,
  and import.

## Bringing your TV Time history over

Tap **Import** in the header, choose your TV Time export `.json` file,
then **Start matching**. For each show in the export:

1. AniList gets searched for a matching anime (exact match first, then a
   fuzzy fallback).
2. No match — usually because it's live-action, since TV Time tracked
   everything, not just anime — and it's skipped, listed at the end so
   nothing goes missing quietly.
3. A match, and episodes marked watched (excluding specials) become your
   progress: `up_to_date` → Watching or Completed, `continuing` →
   Watching, `not_started_yet`/`watch_later` → Plan to Watch, `stopped`
   → Dropped. Favorites carry over too.
4. Watch dates come along in the background, powering the streaks and
   monthly chart in Stats — so that history still counts for something
   here.

Import is safe to re-run: matching is by AniList ID, so re-importing
merges instead of duplicating.

Runs one search per show with a short delay to respect AniList's rate
limit, so a few hundred shows takes several minutes — keep the app open,
and "Stop and keep progress" lets you pause without losing anything.

**Resolving skipped titles:** tap **"Resolve skipped titles manually"**
afterward to step through anything unmatched — the search box is
pre-filled with the original title, so tweak it and pick the right
result yourself. "Not anime / skip" moves on, "Finish later" saves your
place. Duplicate-safe throughout, same as everywhere else.

## Stats, Discover, Lists, Upcoming, and Alerts

The header toolbar:

- **Stats** — episodes watched / chapters read, an hours-watched
  estimate (real per-anime runtime from AniList, 24 min fallback),
  completed count, your current streak, a 6-month bar chart, top
  genres, and badges (Century Club at 100 episodes, Streak Keeper at a
  7-day streak). All computed from a watch-history log recorded
  automatically every time you mark something watched.
- **Discover** — Trending, Popular, This Season, or by Genre, live from
  AniList, with a one-tap add.
- **Lists** — your own named collections, mixing anime and manga however
  you like. Add a title from its detail view.
- **Upcoming** — everything with a real next-airing date that hasn't
  happened yet, soonest first.
- **Alerts** — "Alerts: Off" toggles local notifications for newly
  available episodes/chapters. Honest limitation: there's no push
  server behind this, so it only fires while AniTrack is actually open —
  a nice-to-have, not a guarantee.

Also in the detail view: an editable **season number**, and a **custom
poster** override if you'd rather see a different cover than AniList's
default.

### What's intentionally not here

TV Time's feature set was really two things at once: a private tracker,
and a social network built on top of it. Comments, character voting,
public profiles, friend activity — all of that needs other people,
accounts, and a server. This app only keeps the first part, on purpose,
because that's the part that was always really yours.

## Notes / limitations
- Single-user by design — no login, no account, and your data lives only
  on this device. Uninstalling or clearing site data wipes your list, so
  it's worth keeping your exported JSON somewhere safe as a backup.
- AniList's database covers most anime and manga, but very obscure or
  brand-new titles occasionally have incomplete data.
- TV Time grouped multi-season shows under one entry; AniList usually
  splits seasons into separate ones. The importer matches to whichever
  AniList entry the title resolves to (usually season 1), so long-running
  multi-season shows might need a quick manual nudge in the detail view.

## Two real bugs fixed, and what changed

After looking closely at how a real TV Time export actually behaves, two
concrete problems turned up:

**1. Episodes weren't landing in the right season.** TV Time groups a
whole franchise's seasons under one show; AniList tracks each season as
its own separate entry. The import used to add up every season's watched
episodes into a single number and hand it to whichever AniList entry it
matched (usually season 1) — which could make a show look "complete" for
the wrong reason, or hide progress that actually belonged to a later
season. The importer now computes progress **per season**, matches
season 1 as before, then follows AniList's own sequel chain (the same
relation data behind the community "Sequel Finder" tool AniList users
built for a related problem) to find season 2, 3, and so on — importing
each season's watched count against its own correct entry, as its own
tracked item. If a sequel can't be found automatically, it's listed at
the end as "needs manual review" rather than silently merged into the
wrong place.

**2. TV Time's own status label was sometimes stale.** Some shows had
real watched episodes but a status of "watch_later," presumably left
over from before the episodes were marked — the importer used to trust
that label outright and file the show under Plan to Watch regardless.
It now trusts your actual episode data over that label (an explicit
"stopped" still means Dropped, since that's a deliberate action, not a
stale field).

## Continue Watching, and finding missing sequels

Two additions modeled directly on how AniList's own dashboard works,
and on the sequel-tracking problem above:

- **Continue Watching** — a row at the top of the home screen (above the
  status tabs) showing everything you're currently Watching/Reading,
  soonest-relevant first, with an "N behind" badge when there are
  already-aired episodes you haven't caught up on yet. Tap the tick to
  mark the next one off right from here, or tap the poster for full
  details.
- **Sequels** (header toolbar) — scans everything you've marked
  Completed and checks AniList's sequel data for a next season you
  haven't added yet, the same concept as the AniList Sequel Finder
  community tool. Anything missing shows up with a one-tap add.


---

*With thanks to TV Time, 2011–2026.*
