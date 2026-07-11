# PROJECT_STATUS

Living status log for AniTrack development sessions. Newest session at
the top.

---

## Session: Whole-Codebase Quality Review

Full audit of `index.html` (4,170 lines) for duplicate code, dead code,
performance, spacing/naming, state management, accessibility, dark-mode
consistency, and responsive layout. Pure cleanup — no functional or
layout changes, verified live after every category via Playwright
against the real running app.

### Completed

**Duplicate code removed:**
- The `cap = item.type === "anime" ? item.totalEpisodes : item.totalChapters`
  ternary was copy-pasted identically in 7 places — extracted to `capFor(item)`.
- The filled-star SVG path (~500 chars) was inlined verbatim in 7 places —
  extracted to a `STAR_SVG` constant. Caught and fixed two real bugs this
  introduced along the way (see Technical Notes).
- `#3A4353`, the hover-state border color, was a literal repeated in 16
  separate CSS rules — extracted to `--border-hover`.

**Dead code removed:**
- `formatCountdown()` — leftover from the old airing-card widget, fully
  superseded by the Release Timeline's `daysHoursUntil()`.
- 5 orphaned CSS rules with zero matching elements anywhere: `.actionable`
  modifier, `.lbl.est`, `.meta-icons-row` (×3 rules) and `.show-info-line`
  (both leftover from the pre-redesign Show Detail page), `.watchnext`.
- `activeTab` — a state variable that was assigned on every tab switch but
  never once read anywhere.

**Real bug found and fixed:** `resolverSearch()` (TV Time import's title
resolver) was missing the "abort the previous request" step that the
identical pattern already has correctly in `doSearch`/`doDiscoverSearch`/
`runDiscover` — a slow, stale search response could have overwritten
newer results. Fixed to match the proven pattern.

**Accessibility:** 22 icon-only buttons had no accessible name at all
(close buttons, stepper +/-, episode tick buttons, the Discover add
button, the Show Detail "..." menu) — a screen reader would have
announced every one of them as just "button." All now have descriptive
`aria-label`s, several dynamic (e.g., the episode tick button correctly
announces "Mark this episode watched" vs. "...unwatched" depending on
state). Also found and fixed a genuine WCAG contrast failure: `--fg-faint`
only reached 3.3–3.9:1 against the app's card backgrounds at the small
sizes it's actually used at (hints, timestamps), below the 4.5:1 AA
minimum — lightened from `#6B7280` to `#8A91A0`, same hue family, now
5.0–6.0:1 everywhere it's used.

**Dark-mode/design-token consistency:** several places used a literal hex
value that exactly duplicated an existing CSS variable (`::selection`'s
text color, the Wisdom widget's avatar hash palette, its quote text
color) — all now reference the variable instead, so the palette has one
source of truth.

**Hover states:** several interactive elements had `cursor:pointer` but
no actual visual feedback — tabs, the Stats mode toggle, genre chips,
status pills, notification toggles, Calendar rows, Timeline rows, and the
Daily Wisdom widget's clickable area. Added consistent feedback matching
the app's existing hover convention; verified active/selected states
correctly survive being hovered (no specificity conflicts).

### Findings documented but *not* executed

**No `max-width` constraint anywhere in the shell.** On a wide desktop
browser window (a real scenario — the app's own Design Philosophy cites
GitHub Desktop/VS Code as references), the UI stretches edge-to-edge.
Investigated a fix (centering `body`/`header`/`main`/`.tabbar` at a
capped width) but the FAB and full-screen overlays use viewport-relative
`position:fixed` offsets that don't share a containing block with a
centered `body` — a naive fix would've centered the content while
leaving the FAB floating disconnected near the real viewport edge, a
more visible regression than the current behavior. Fixing this properly
means recalculating the FAB's and overlays' positioning together as one
coordinated change, which is real layout-restructuring risk to a
heavily-tested, critical navigation element — out of scope for a
"quality, not functionality" pass. Documented for a future session with
its own explicit go-ahead.

### Files Modified

`index.html` only. No files added or removed.

### Technical Notes

**The STAR_SVG extraction caught two real bugs during its own
verification** — a good example of why every mechanical-looking
refactor still needs a live check. `replace_all` on the SVG markup also
matched the constant's own definition (turning it into
`const STAR_SVG = '${STAR_SVG}'`, i.e. self-referential and broken), and
two usage sites had the interpolation nested inside single-quoted strings
(where `${...}` is just literal text, not interpolated) rather than
backtick template literals. Both caught immediately via a live DOM check
across every star-rendering location (cards, Show Detail score, edit
sheet, Journal, earned badges) before moving on — not by inspection alone.

**Why `resolverSearchToken` looked "unused" but wasn't a dead-code
case.** The low-usage-count scan that found `activeTab` also flagged
this one, but reading its context showed it was a genuine bug (a bare
token pattern missing its abort step), not orphaned state. Worth noting
for future audits: a "referenced only twice" signal means "look closer,"
not "delete."

### Next Recommended Task

The responsive/max-width fix documented above, if wide-window/desktop
usage turns out to matter in practice — needs its own session since it
touches the FAB and overlay positioning as a coordinated unit.

---

## Session: Daily Anime Wisdom Dashboard Widget

### Completed

Built the actual Home-dashboard widget for Today's Anime Wisdom —
closing out the "Next Recommended Task" flagged at the end of the
previous session. Reuses `WISDOM_QUOTES`, `getTodaysWisdom()`, and the
`#wisdomOverlay` detail modal built then; this session added the
dashboard-facing widget itself.

- Retro "desktop gadget" card per the supplied reference design: chrome
  header (label + Japanese subtitle + Refresh/Hide icon buttons),
  atmospheric dark scene with date, character avatar, decorative left
  dots, centered quote, vertical character/series text on the right
  edge, and a bottom row (quote id, series name, pixel-dot accent).
- **Refresh** — swaps to a random other quote, ephemeral (not persisted;
  a reload returns to today's deterministic quote).
- **Hide** — persists (`localStorage`), replaced by a one-line "Daily
  Wisdom widget hidden — Show" reactivation row in its place, so it's
  never lost, just quiet.
- Clicking the scene (not the two icon buttons) opens the existing
  `#wisdomOverlay`, updated to accept the *currently displayed* quote
  rather than always re-deriving today's, so opening it after a Refresh
  shows what's actually on screen.
- Positioned on the Home feed right after the Calendar/Notification
  widgets, before "Haven't Watched For A While" — matches Dashboard
  Philosophy's ordering and doesn't sit above Continue Watching.

### Trade-offs

- **No real character art or background photos.** A static, single-file
  app with no asset pipeline has no legitimate local source for either;
  the widget instead generates a colored monogram avatar (hashed from
  the character's name, so it's stable per character) and picks from 5
  built-in dark atmospheric gradients (deterministic per quote id, so
  the same quote always reads the same "scene"). The data shape
  (`character_avatar_url` / a future `background_url`) still has room to
  swap in real assets later without any structural change.
- **Retro monospace typography is scoped to this one widget on
  purpose** — added `--font-mono` (JetBrains Mono) alongside the
  existing Space Grotesk/Inter system rather than replacing it anywhere
  else. This is a deliberate, contained exception matching the supplied
  reference design, not a drift in the app's type system.
- **Vertical side text is truncated** (character and series both capped
  around 15 characters with an ellipsis) — a name like "Fullmetal
  Alchemist: Brotherhood" would otherwise overflow the widget's fixed
  height in the narrow mobile layout. The full, untruncated series name
  is always still shown on the horizontal "— series —" line at the
  bottom, so nothing is actually hidden, just not repeated twice in full.

### Next Recommended Task

Nothing blocking. If revisited: expand `WISDOM_QUOTES` past 16 entries
(currently repeats on a ~16-day cycle), or wire real per-character
artwork if/when the project adopts an asset pipeline.

### Files Modified

- `index.html` only — CSS (`.wisdom-widget` and children, `--font-mono`),
  `WISDOM_QUOTES` gained `id` fields, new `buildWisdomWidgetBlock()` /
  `gradientFor()` / `avatarColorFor()` / `avatarInitial()` /
  `truncateMid()`, `openWisdomOverlay()` now accepts an optional quote
  override, wired into `renderHomeFeed()`.

---

## Session: Notification System + Timeline

### Completed

**Timeline** (renamed from "Notification Center" per direct feedback —
see Technical Notes) — a combined, permanent log of system notifications
*and* the user's own journal history, grouped by relative time (Today,
Yesterday, Earlier This Week, Last Week, N Weeks Ago, N Months Ago, N
Years Ago). Opened from the dashboard widget's "View All" or **More →
Timeline**. Tapping an entry navigates to the related title's Show
Detail, the Daily Wisdom overlay, or the Statistics page, depending on
type.

**Notification categories implemented** (all independently toggleable
in **More → Notifications**):

| Category | Detection source | Notes |
|---|---|---|
| New Episode | `refreshAiring`'s existing `availableCount` before/after diff | Already existed as "Alerts"; now routed through Timeline |
| New Chapter | **New**: `totalChapters` before/after diff for RELEASING reading items, added to `refreshAiring` | AniList has no per-chapter release-date field; a chapter-count increase is the closest real signal |
| Airing Reminders | Calendar's existing weekly-cadence episode projection | Covers airing-today, season premiere (ep 1), season finale (ep === totalEpisodes) — mutually exclusive per episode |
| Release Countdown | Same projection, `airingAt - now <= 1h` | |
| Continue Watching / Continue Reading | Home feed's existing "stale" idle-time definition, hoisted into shared `lastWatchedAt`/`daysSince` helpers | Configurable frequency (default 10 days) |
| Watch Later Reminders | `status === "planned"` + `updatedAt` age | Configurable frequency (default 30 days); see Technical Notes on the `updatedAt` approximation |
| Daily Anime Wisdom | New minimal local quote set (16 quotes), deterministic by day-of-year | Notification opens a new lightweight Wisdom overlay |
| Anime Journal Anniversaries | `item.startedDate`/`finishedDate` (Journal tab fields) matched against today's month+day | Also backfills a *silent* historical entry dated to the actual started/finished date, independent of the anniversary re-celebration |
| Statistics Milestones | Completed count, episodes/chapters watched, hours watched, journal entry count vs. fixed thresholds | First-ever scan silently baselines already-crossed thresholds so an existing library doesn't fire a burst of retroactive achievements |

**Dashboard widget**: small `🔔 Notifications (N)` card on the Home
feed (both Anime and Reading tabs), showing the 3 most recent entries
and a "View All" button. Positioned after the Calendar widgets, before
"Haven't Watched For A While" — does not sit above Watch Next.

**Persistent storage**: `anitrack_timeline_v1` (capped at 500 entries,
deduplicated by a stable per-event id) and `anitrack_notif_settings_v1`
in localStorage. The old `anitrack_alerts` flag is read once as the
master switch's initial value on first load, then superseded.

### In Progress

Nothing left mid-implementation — this session's scope is fully built,
tested, and documented.

### Next Recommended Task

The **Daily Anime Wisdom dashboard widget** itself (FEATURE_ROADMAP
Phase 4) is still not built. This session only added the minimum needed
for the *notification* to have somewhere real to open (a 16-quote local
set + a lightweight overlay) — deliberately did not build the recurring
Home-feed widget CLAUDE.md's Dashboard Philosophy describes, since that
is a separate, not-yet-started roadmap item and this session's brief was
notifications specifically ("do not begin unrelated features"). Building
the actual widget would mostly be UI work reusing `getTodaysWisdom()`
and `openWisdomOverlay()`, which already exist.

Other reasonable follow-ups, roughly in priority order:
1. Daily Wisdom dashboard widget (see above).
2. Expand the wisdom quote set past 16 (currently repeats every ~16 days).
3. A per-title "mute notifications for this title" override, if usage
   reveals the global category toggles are too coarse.

### Files Modified

- `index.html` — all of this session's work; see Technical Notes for the
  shape of the additions. No new files, no build step — everything stays
  in the single-file architecture the rest of the app already uses.
- `README.md` — the old "Alerts" bullet (described UI that no longer
  exists) replaced with a short description of the new Notifications
  entry point, pointing here for the full picture.
- `docs/FEATURE_ROADMAP.md` — checked off Anniversary Reminders and
  Timeline in Phase 7; added a Notification System sub-list.
- `docs/DATABASE_SCHEMA.md` — added `timeline` and `notification_settings`
  table descriptions, matching the doc's existing (aspirational, not
  literally SQL) schema style.
- `PROJECT_STATUS.md` — this file, new.

### Technical Notes

**Why "Timeline" and not "Notification Center."** Direct user feedback
mid-session: a notification inbox is a generic pattern; AniTrack's
identity is the Journal. The fix wasn't cosmetic renaming — it's that
Timeline entries include the user's own journal history (started/
finished dates, backfilled with their *actual* date as the timestamp, not
"when you entered the data") sitting in the same list as system events,
bucketed by genuine relative time ("2 Years Ago") rather than collapsing
into a flat "Older." That's what makes it read as journal, not inbox.

**No push notifications while closed — by necessity, not choice.**
AniTrack is a static, single-file, client-only PWA with no backend
server (confirmed via `sw.js`: shell-caching only, no `push` event
listener, no VAPID keys). True background push requires a server to hold
subscriptions and send payloads, which doesn't exist here and wasn't
asked for. Every category in this system can only actually fire while
the app is open and its periodic scan runs (every 5 minutes for local
detectors, piggybacking on the existing 15-minute `refreshAiring`
network cycle for episode/chapter detection). This is the same honest
limitation the pre-existing "Alerts" feature already documented in its
own comments — this session extends that constraint consistently rather
than overclaiming a capability the architecture can't deliver. It's
called out in the Notification Settings page copy itself, not just in
code comments.

**Single choke point for dedup.** `addTimelineEntry(entry)` is the only
place that writes to the timeline array, and it no-ops if `entry.id`
already exists. Every detector computes a *stable, deterministic* id
from the real-world event it represents (e.g. `ep-<mediaId>-<episode>`,
`annv-started-<mediaId>-<yearsAgo>`, `milestone-completed-anime-<n>`) —
never a random or timestamp-based id — so re-running a scan (which
happens constantly: every 5 minutes, every reload, after every
`refreshAiring` cycle) can never produce a duplicate, and a dismissed
system notification still has its record intact in Timeline, per the
original brief. Verified live with Playwright: seeded data, ran multiple
scan/reload cycles, confirmed zero duplicate ids and zero double-fires
of the same real event.

**`silent` entries.** Not every Timeline entry should interrupt with a
live popup. `addTimelineEntry` accepts `entry.silent: true`, used for
two cases: (1) backfilled journal history (setting a `startedDate` for a
show you started two years ago shouldn't pop a notification *right now*
for something that already happened), and (2) the first-ever milestone
scan's baseline (a returning user who already has 300 completed titles
shouldn't get slammed with 10/25/50/100/250 all firing at once the
moment this feature ships). Silent entries are marked `read: true` on
creation and still fully visible in Timeline — they're just quiet.

**Chapter-released detection is new derived data, not a new API call.**
AniList has no equivalent of `nextAiringEpisode` for manga — there is no
published chapter release schedule. `refreshAiring` already re-fetches
`totalChapters` for every tracked, non-dropped item every 15 minutes (to
keep progress caps accurate); this session added a before/after diff on
that same already-fetched field for RELEASING reading items. A chapter
count going up is a reliable, honest proxy for "a new chapter now
exists" — reusing data already being pulled, not an additional request,
consistent with the Performance principle (avoid unnecessary API calls).

**Calendar's "Manga chapters releasing today" honesty gap carries over.**
The same constraint means "today" specifically can't be determined for
manga the way it can for anime (AniList simply doesn't publish a date).
The Today's Calendar widget already handled this earlier in the project
by showing ongoing titles instead of fabricating a release day; this
session's chapter-released notification instead fires whenever a chapter
increase is *detected* (i.e., dated to whenever the periodic refresh
happens to notice it), which is real information, just not perfectly
timed to the actual publish moment.

**Watch Later's `updatedAt` approximation.** No field tracks "when did
this item enter Plan to Watch/Read" specifically — `updatedAt` (bumped
on *any* edit) is the closest available signal without adding a new
field for a single reminder type. Noted as an explicit trade-off in
code; worth a dedicated `plannedAt` field if this reminder type turns
out to matter a lot in practice.

**Reused rather than duplicated:**
- `getUpcomingEpisodesInRange` / `projectEpisodesInRange` (Calendar) for
  every airing-related detector.
- `computeTotalHours`, `hasJournalEntry` (Statistics) for milestone
  thresholds.
- `.result`-adjacent list-row visual language for Timeline rows (new
  `.tl-row`, matching the same image+title+meta shape already
  established for search results and Calendar rows).
- `lastWatchedAt`/`daysSince` were previously private to
  `renderHomeFeed`; hoisted to shared module-level functions since both
  the Home feed's "Haven't Watched For A While" section and the new
  Continue Watching/Reading detector need the exact same definition of
  "idle" — one judgment, not two.

**Testing.** Verified live end-to-end with Playwright against the real
running app (not just code review): all nine detector categories,
dedup across repeated scans and reloads, live `Notification` firing
gated correctly by the master switch (confirmed silent while off, fires
once turned on with a genuinely new event), Timeline's relative-time
bucketing, tap-to-navigate into Show Detail, the dashboard widget, and
the Settings page's 11 toggles (master + 10 categories) persisting
correctly. One real test-script bug caught and fixed along the way
(UTC-vs-local date mismatch in a seed helper, made the anniversary
detector look broken when it wasn't) — documented in case it comes up
again in future test-writing.

### Future Claude Notes

- The whole app is one `index.html` file, deliberately — no build step,
  no bundler, no framework. Match that; don't introduce a multi-file
  split or a build pipeline unless explicitly asked.
- `list` (the tracked items array) and every function defined inside the
  page's top-level `(() => { ... })()` IIFE are **not reachable from
  Playwright's `page.evaluate`** — they're closure-scoped, not on
  `window`. When testing, either read/write `localStorage` directly, or
  use `page.addInitScript` to patch a global (like `window.Notification`)
  *before* the page's own script runs. Don't waste time trying to call
  in-page functions directly from a test script; it will fail with
  "X is not a function" and it's not a bug.
- `refreshAiring()` refreshes metadata for every tracked item with a
  small AniList id — if you seed test data with small sequential
  fake ids (1, 2, 3...), they will very likely collide with **real**
  AniList media and get silently overwritten by the background refresh
  mid-test. Either block `**/graphql.anilist.co/**` entirely, or mock
  `REFRESH_QUERY` responses (its query text uniquely contains
  `$ids: [Int]`) if you need the real refresh path exercised.
- The Notification Settings page's category toggles are disabled (not
  hidden) while the master switch is off, so re-enabling the master
  switch restores whatever granular choices were already made — don't
  "fix" this by hiding them, it's intentional.
