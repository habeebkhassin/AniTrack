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

## Design

AniTrack's visual system, if you're touching styles later:

- **Palette**: background `#0D1117`, cards `#161B22`, borders `#2A313C`,
  primary text `#F2F5F7`, secondary text `#98A2B3`, accent `#5FA8FF`.
  The five tracking statuses (Watching, Plan to Watch, Completed, On
  Hold, Dropped) each get their own muted hue so they stay scannable at
  a glance, defined in the `STATUS_COLOR` map in the script.
- **Type**: Space Grotesk for headings/numbers, Inter for body text —
  loaded from Google Fonts, with a system-font fallback chain if offline
  on first load.
- **Icons**: inline Lucide-style SVGs throughout (no external icon
  library dependency, so they still work offline once the page itself is
  cached).

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

- **Home feed** — see the dedicated section below; this replaced an
  earlier horizontal "Continue Watching" strip with a fuller TV
  Time-style scrolling layout.
- **Sequels** (header toolbar) — scans everything you've marked
  Completed and checks AniList's sequel data for a next season you
  haven't added yet, the same concept as the AniList Sequel Finder
  community tool. Anything missing shows up with a one-tap add.

## Home feed (the "Home" tab)

The default tab — labeled **Home** — mirrors TV Time's own vertical
scroll layout instead of a flat list:

- **Watch Next** — where the app always opens. Your actively-watching/
  reading shows, plus anything with a genuinely fresh episode/chapter
  (detected the moment a refresh notices one become available), highlighted
  with a subtle yellow outline.
- **Haven't Watched For A While** — the same active shows, but you
  haven't marked anything watched on them in 14+ days and nothing about
  them is fresh. Sorted by how far behind you are, most behind first.
- **Watched History** — sits scrolled just above Watch Next, dimmed, and
  only comes into view if you scroll up on purpose. Shows the last couple
  of things you actually marked watched, with a static green checkmark
  (a record, not an action) and how long ago.

The split is based on **recency of your last watched episode**, not how
many episodes have piled up — a show you're 30 episodes behind on but
watched yesterday stays in Watch Next; one you're only 4 behind on but
haven't opened in a month gets demoted.

**Honest limitation on "fresh":** detecting a newly-released episode
relies on AniList's polling happening while the app is open (same
limitation as Alerts). If you haven't opened AniTrack in a while, a show
with a new episode might not get the fresh highlight the first time you
check back — it'll still show up correctly in Watch Next or the stale
section based on recency, just without the yellow "just dropped"
highlight until the app catches the transition itself.

## Bottom tab bar

Navigation is a bottom tab bar, like TV Time and Logbook both use:

- **Anime** / **Reading** — the Home feed (Watch Next / Haven't Watched
  For A While / Watched History).
- **Discover** — Trending/Popular/This Season/By Genre, as a full page.
- **More** — everything else lives here: Stats (with a TV Time-style
  "time spent watching" hero card, a per-day bar chart, quick stat cards,
  a 6-month chart, top genres, and badges), your Custom Lists, Import
  from TV Time, Find Missing Sequels, and the Episode Alerts toggle.

The header itself is just the app name and a small dot for online/offline
status now — the page counter and clock were cut since they weren't
adding anything.

## Tapping a card: Episode Detail and Show Detail

Cards now split into three distinct tap targets, matching how the actual
TV Time app behaves:

- **Tapping the title pill** opens a full **Show Detail** page: banner
  image, an About tab (cast with voice actors, genres/format/status, the
  AniList community score, the synopsis, a "Watch trailer" link when
  AniList has one, and a few metadata icons), and an Episodes tab listing
  every episode/chapter individually — tap any row's checkmark to jump
  your progress straight to that point, or tap the row itself to open
  that specific episode's detail view. A **⋯** button in the top-right
  opens the original edit sheet (status, rating, notes, season number,
  custom poster, remove) — that sheet didn't go away, it just moved here.
- **Tapping anywhere else on the card** opens **Episode Detail** for the
  next unwatched episode/chapter (or the one you last watched, from the
  dimmed Watched History row): episode number and title, watched status
  (or the air date if it hasn't aired yet), a tick to mark it, streaming
  links where AniList has them, and the series synopsis.
- **Tapping the tick itself** still does the quick one-step mark, exactly
  as before.
- The **tick's look changed** to a softer muted gray-on-light-gray
  circle, closer to your reference screenshots, instead of the previous
  stark white-on-navy.

**Honest data-availability notes**, since AniList's public API doesn't
carry everything TV Time's own screens show:
- There's no per-episode synopsis or per-episode air date in AniList's
  schema for past episodes — Episode Detail shows the **series-level**
  synopsis and score, not an episode-specific one, and only shows an air
  date for the *next* episode (the one date AniList actually tracks).
  It's labeled honestly rather than faked.
- "Where to watch" links only appear when AniList has official streaming
  links on file for that title — many titles, especially older or niche
  ones, won't have any, and the section just won't show.
- Cast/trailer are fetched only when you open a Show Detail page for the
  first time (kept out of the main list-loading queries so those stay
  fast), and cached afterward.
- Since progress is tracked as a single running count rather than a list
  of individually-watched episodes, marking one episode watched from the
  Episodes tab marks everything up to it too, and unmarking one unmarks
  everything after it — there's no way to have, say, episode 5 watched
  while episode 3 isn't. This keeps the whole app's counting consistent,
  but it's a real simplification worth knowing about.


---

*With thanks to TV Time, 2011–2026.*
