# PROJECT_STATUS

Living status log for AniTrack development sessions. Newest session at
the top.

---

## Session: Discover/Search Season Dedup + Archive Responsiveness

### Completed

**Discover tab and search results no longer show one card per season.**
AniList lists every season of a show as a fully separate entry with no
"this show has N seasons" concept of its own — Discover's browse grid,
the fabAdd search overlay, and the Discover tab's own inline search
could all show the same show 2-3 times in a row ("Grand Blue Dreaming
Season 2" and "... Season 3" as separate cards). Fixed at the source
across all three: cards now display the base title only ("Grand Blue
Dreaming"), and duplicate seasons of the same base title are collapsed
to a single card — keeping whichever occurrence AniList's own result
ordering already listed first, not a guessed "best" season.

**Archive page width fixed.** The Archive overlay (hub, Character
Catalogue, deck grid, flat character grid) was capped at 1120px — wide
enough for the catalogue's 3-column grid, but the Archive home's plain
list of category rows, and the catalogue's progress bar/search box/
filter row (none of which are a grid), stretched to that same width on
a real desktop window and read as sparse and oversized rather than
responsive. Narrowed the whole overlay to 780px — still comfortable for
3 solid card columns, but every non-grid part of the page now reads as
an intentionally-sized page rather than an empty stretched one.

### Files Modified

`index.html` only.

### Technical Notes

**Season dedup reuses the season-grouping feature's own regex, not a
new one.** `stripSeasonSuffix()` and `dedupeBySeasonBase()` both call the
already-existing `seasonGroupBaseName()`/`SEASON_SUFFIX_RE` (built for
grouping a user's own tracked seasons under one Episodes-tab view) —
same "same base name after stripping a trailing Season N / Nth Season
suffix" definition, now applied one layer earlier, before anything is
even added to the list.

**One width variable, not per-view overrides.** Considered giving the
Archive home view its own narrower inner max-width while leaving the
catalogue's grid-bearing views at the original 1120px, but that would
have made the page visibly change width as you navigate between its own
sub-views (jarring, not "responsive" in the sense that matters) —
simpler and more coherent to size the whole overlay for its most
space-hungry content (the 3-column grid) at a number that doesn't leave
everything else looking sparse, one `--archive-max-width` value.

**Testing.** Verified live with Playwright: Discover's trending grid,
the fabAdd search overlay, and the Discover tab's inline search all
strip season suffixes and drop duplicate-season cards from mocked
AniList responses matching the exact titles reported ("Mushoku Tensei:
Jobless Reincarnation Season 3" → "Mushoku Tensei: Jobless
Reincarnation", "Grand Blue Dreaming Season 2"/"Season 3" → one "Grand
Blue Dreaming" card). Archive re-screenshotted at 390/700/1024/1440/
1920px — no horizontal overflow at any width, home/catalogue/deck/flat
views all confirmed visibly proportional rather than sparse at desktop
widths, 3-column grid still holds at the narrower cap. Full existing
regression suite (Character Archive + broader app, 20+ scripts)
re-run to confirm zero regressions.

### Known Issues

- None identified for this session's scope.

### Future Improvements

- None identified — both fixes were narrowly scoped to the reported
  issues.

---

## Session: Character Catalogue Deck Grouping

### Completed

The global Character Catalogue (Archive hub → Characters) now opens
grouped into one "deck" per series by default, instead of a flat mixed
grid — closer to a collector's binder than a database table, matching
the Character Archive's original "premium collector's encyclopedia"
brief. Each deck is a themed, stacked-card tile (two rotated layers
behind the face, reusing the same series/franchise/genre theming and
crest every individual card already uses) showing the series title and
an "X / Y Unlocked" count. Clicking a deck ungroups it — drills into
just that show's character grid, with a "Regroup" button to return to
the deck view. A persistent "Show All Characters" / "Group by Series"
toggle lets you leave grouping off entirely and browse the full flat,
filterable grid as before (all 8 sort modes and 5 filters untouched).
Typing a search query automatically bypasses grouping regardless of the
toggle state — searching for a character by name against a stack of
unopened decks doesn't make sense — and restores deck view again once
the query is cleared.

### Files Modified

`index.html` only.

### Technical Notes

**Deck state is separate from, not layered onto, the existing filter
system.** The catalogue already had a "Series" filter dropdown that
narrowed the flat grid to one show; decks don't replace or fight with
it — `catalogueExpandedDeck` filters entries the same way a manually-
picked series filter would, so drilling into a deck and manually setting
the Series filter both funnel through the same entries logic, just via
different state.

**One extra sort pass, no extra data or network calls.** Decks are built
by grouping the exact same `allArchiveEntries()` array the flat grid
already computes (`catalogueDecksFrom`), sorted by unlock percentage
(most-complete decks first) — no new fetch, no new cache.

**Testing.** Verified live with Playwright: default view shows decks not
individual cards with sort/filter controls hidden; clicking a deck shows
only that show's characters (including correctly keeping a locked
`SUPPORTING` character as a "???" card — deck drilling doesn't bypass
the existing spoiler-protection gate); Regroup returns to deck view;
the explicit ungroup/regroup toggle works both directions; typing a
search query bypasses grouping and hides the toggle bar, clearing it
restores deck view. Updated one pre-existing test
(`test-char-catalogue.js`) to explicitly ungroup first, since its
scenario (search/sort/theme/responsive-columns on the flat grid) now
sits one click behind the new default — not a regression, the direct
consequence of intentionally changing the default view. Full existing
regression suite re-run to confirm zero impact elsewhere.

### Known Issues

- None — the per-show Character Archive tab (inside Show Detail) is
  intentionally untouched; it's already scoped to one show, so deck
  grouping doesn't apply there.

### Future Improvements

- Deck sort order (currently unlock-percentage-first) could become
  user-choosable (alphabetical, recently unlocked, etc.) if that turns
  out to matter once libraries grow large.

---

## Session: Show/Manga Details Page UI/UX Fixes

Three scoped fixes to the Details page, per direct brief. No other pages
touched.

### Completed

**Task 1 — Episode cards.** Removed `.card .status-dot`, the small
colored dot at the top-left of every library card's poster. (Confirmed
with the user first: the element as literally described — "blue,
top-left, on episode cards" — didn't exist anywhere on the Details page
itself; the only real match anywhere in the codebase was this status dot
on the general tracked-item card used on Home/status tabs, which the
user confirmed was the intended target.) Purely `position:absolute` and
non-color-coded elsewhere, so removing it didn't disturb any layout —
verified no gap was left behind.

**Task 2 — Expandable synopsis.** The About tab's synopsis now clamps to
~4 lines with a soft fade on the last visible line and a "Read More"
toggle beneath it; expanding/collapsing animates smoothly via a measured
`max-height` transition (not `-webkit-line-clamp`, which can't animate).
Skips the toggle entirely when the text already fits within the clamp.
No modal, no navigation — fully inline.

**Task 3 — Discover More.** Full rebuild. No more `<a href="anilist.co">`
— every recommendation now silently adds the title to your list (if not
already tracked, same precedent as the Discover tab's own browse grid)
and opens its Show Detail page inside AniTrack. Cards were redesigned
landscape/compact (poster left, info right) showing title, original
title when it differs, rating, year, episode/chapter count, status +
format + genre badges, and a small progress bar if you've already
started that title. New subsections: Similar Anime, Similar Manga, Same
Studio, Same Author/Mangaka — each pulling real AniList data (studio and
staff "other credited works" connections, fetched in the same request as
everything else, not a second round trip). Similar Genres kept as-is
functionally (already opened Discover pre-filtered correctly) with a
missing hover state added. Empty state now reads "No recommendations
available yet." instead of rendering nothing.

### Files Modified

`index.html` only.

### Technical Notes

**A render-ordering bug the synopsis toggle had to work around, not
fix.** `openShowDetail()` calls `renderShowDetailAbout()` *before* adding
the overlay's `.open` class, so content paints the instant the overlay
becomes visible rather than after. That means any layout measurement
taken synchronously inside the render function runs against a
`display:none` subtree — `scrollHeight` and computed `line-height` are
meaningless there. Caught live via Playwright (the clamp silently never
engaged, measuring ~331px "collapsed" height on genuinely long text) —
fixed by deferring the measurement one `requestAnimationFrame`, by which
point the overlay's `open` class has already landed. Left the existing
render-before-open ordering itself alone; it's intentional and
unrelated to this task.

**Recommendation data reuses `MEDIA_DETAIL_FIELDS` and the exact field
shape `SEARCH_QUERY`/`DISCOVER_QUERY`/`REFRESH_QUERY` already use**
(`REC_MEDIA_FIELDS`), rather than a new bespoke shape — this is also
deliberately the *same* shape `addToList()` already expects, so a
recommendation card can be added to the list through the same function
Discover/search results already use, no translation layer.

**Same Studio / Same Author fetched as nested connections in the
existing `SHOW_EXTRA_QUERY`**, not a second request:
`studios(isMain:true){ nodes{ id name media(...) } }` and
`staff(...){ edges{ node{ id name staffMedia(...) } } }` pull each
studio's/staff member's other credited titles as a sub-selection of data
already being fetched, keeping this at one network request total per
show — consistent with "avoid unnecessary API calls."

**`pickCreator()` was deliberately left untouched, not restructured.**
The straightforward change would have been making it return `{name, id}`
so the new "Same Author" section could use the id — but `pickCreator()`'s
plain-string return is also relied on by `buildDetailMetaGrid` (the
existing Director/Mangaka row) and, more importantly, by
`computeFavoriteMangaka()` on the Stats page, which tallies it as a bare
string. Changing the contract would have silently broken an unrelated,
already-shipped feature. Instead, factored the shared "find the matching
staff edge" logic into `findCreatorEdge()` and added a second, separate
reader (`pickCreatorMedia()`) — `pickCreator()`'s behavior and return
shape are byte-for-byte identical to before.

**Migration guards for both `item.characters` and `item.extra`.**
Existing users already have `item.extra` cached from before this session
with the old, thin recommendation shape (id/type/title/coverImage only —
no format/status/episodes/genres, which the new cards need). Added the
same kind of staleness check already used for `item.characters`: if a
cached recommendation is missing `format`, treat the whole `item.extra`
as stale and refetch once, rather than serving incomplete cards forever.

**Testing.** Verified live with Playwright: status-dot fully gone from
Home cards with no layout gap; long-vs-short synopsis (clamp engages
only when needed, expand/collapse both animate and measure correctly);
Discover More subsections all render from mocked studio/staff/
recommendation data, zero `anilist.co` links or `target="_blank"`
anywhere in the section, clicking an untracked recommendation adds it
and navigates internally (no new tab/window), clicking an already-
tracked recommendation navigates without creating a duplicate and shows
its real progress bar; empty state renders the exact specified copy.
Full pre-existing regression suite (25+ scripts spanning episode
tracking, season/arc grouping, the episode modal, lazy loading,
timeline/notifications, the responsive shell, and the entire Character
Archive — which shares `ensureShowExtra`/`SHOW_EXTRA_QUERY` with this
session's changes) re-run to confirm zero regressions.

### Known Issues

- **"Users Also Added" not implemented.** Explicitly marked
  "(Optional architecture for future)" in the brief, and there's no
  honest way to source it anyway — AniTrack is a single-user, client-only
  app with no backend or analytics, so "what other users added" is data
  that could never exist here without a server. Left as a documented gap
  rather than fabricated.
- **Studio/staff nested-query shape not verified against the live
  AniList API.** This sandbox can't reach the real network — every test
  above mocks the GraphQL response. The nested `studios.media` /
  `staff.staffMedia` connections are standard, well-established AniList
  API v2 fields used exactly this way by other AniList clients, but a
  live smoke-test against the real endpoint is worth doing in a
  follow-up session before fully trusting the Same Studio/Same Author
  sections in production.
- **Recommendation subsections cap at 5 cards each** — a scope/length
  judgment call to keep the collapsed-by-default "Discover More" section
  digestible, not a spec requirement either way.

### Future Improvements

- Live-verify the studio/staff query shape against real AniList once
  network access allows it (see Known Issues).
- "Users Also Added" becomes buildable if AniTrack ever grows a backend.
- Recommendation score/sort could incorporate weighted signals across
  sources (shared genres + rating + recency) rather than each
  subsection's own AniList-provided order, if that turns out to matter
  in practice.

---

## Session: Character Archive System

### Completed

AniTrack's full Character Archive — the app's collector-card character
system, replacing the old 6-character horizontal scroll strip in Show
Detail's About tab.

- **Section rename**: "Characters" → "Character Archive," promoted from a
  sub-section of About to its own 4th Show Detail tab (About | Episodes |
  Character Archive | Journal).
- **Collector card grid**, responsive 3/2/1 columns (desktop/tablet/
  mobile), in two places: the per-show tab (that title's deck only) and a
  new cross-series **Character Catalogue** inside a new **Archive** hub,
  opened via a new header icon beside the notification bell.
- **Archive hub**: a data-driven category list (`ARCHIVE_CATEGORIES`) —
  only Characters is implemented; Quotes/Scenes/Locations/Items/Journal
  Entries/Collections render as dim "Coming soon" rows, so adding a real
  future category is a one-line addition, not a redesign.
- **Theme system**: series → franchise → genre → default priority, each
  with a hand-authored monochrome inline-SVG crest. Series themes cover
  the 5 shows named in the brief (Attack on Titan/Survey Corps, One
  Piece/Straw Hat, Naruto/Leaf Village, Bleach/Soul Society, Frieren/
  Magic Crest, Death Note/Notebook); franchise theming reuses the
  existing season-grouping feature's `seasonGroupBaseName` rather than a
  second detection system, so e.g. all tracked Frieren seasons share one
  deck; genre theming covers all 14 genres named in the brief.
- **Spoiler protection**: role-only gating (see Technical Notes for why
  this diverges from the original brief) — `MAIN` characters always
  visible, `SUPPORTING`/`BACKGROUND` silhouetted with "???" until the
  series is completed. A separate, uniform "deep content" gate (full
  spoiler-tagged biography, My Journey, Quotes, Relationships) requires
  series completion regardless of role. A Spoiler Protection toggle in
  the Archive hub disables every gate at once.
- **Character detail page**: large art, universal metadata grid (every
  field always rendered, "—" for anything AniList doesn't have — see
  Known Limitations), Voice Actors (Japanese + English, avatar/name/
  language), and collapsible widgets: Biography (spoiler-tag aware),
  Gallery, Relationships (honest empty state), Timeline (repurposed as
  the user's own personal encounter history), My Journey (private form:
  favorite moment/quote/notes/10-star rating), Quotes (the user's own
  Favorite Quote plus any matching entries from the existing
  `WISDOM_QUOTES` set).
- **Unlock progress**: "N% · X / Y Characters Unlocked" readout, both
  per-show and global, computed live (not stored) from role + completion
  state across every cached character.
- **Notifications**: new `characterUnlocks` category in the existing
  Notification Settings page (purely additive to the existing
  data-driven `NOTIF_CATEGORY_DEFS` list — no new UI template). A
  character unlocking logs a Timeline entry and, for a single unlock,
  fires the normal live notification; multiple simultaneous unlocks in
  one show log individually but alert via one combined toast instead of
  a notification burst. Archive milestones (10/50/100/500 characters)
  reuse the exact `record()`/first-run-silent-baseline pattern
  Statistics Milestones already established.
- **Performance**: characters are cached directly on `item.characters`
  (already-existing, already-persisted field — just enriched, not
  duplicated into a second store); the global catalogue lazily
  batch-warms only uncached tracked items on first visit, chunked 50 ids
  per request via a new `CHAR_BATCH_QUERY` mirroring `REFRESH_QUERY`'s
  existing pattern; grids render with skeleton placeholders, never
  spinners.

### Architecture

- `item.characters`: enriched in place (id, name, nativeName, aliases,
  image, role, gender, age, birthday, bloodType, favourites, description,
  voiceActors[]) via `mapCharacterEdges()`, shared by the single-show
  fetch (`ensureShowExtra`, extending the existing `SHOW_EXTRA_QUERY`)
  and the new batched cross-library fetch (`warmCharacterCache`,
  `CHAR_BATCH_QUERY`). Old thinner cached shapes (from before this
  feature existed) are detected and transparently refetched once.
- Two new small localStorage stores: `anitrack_char_journey_v1` (private
  per-character notes, keyed by AniList character id) and
  `anitrack_spoiler_protection_v1` (boolean). Deliberately **no** stored
  "unlocked" or "already notified" flag — `isCharacterUnlocked(character,
  item)` is a pure function of role + status, and unlock notifications
  reuse `addTimelineEntry`'s existing id-based dedup
  (`char-unlock-<characterId>`) as the single source of truth, the same
  pattern every other notification category already uses.
- `resolveCharacterTheme(item)`, `buildCharacterCardHtml()`,
  `wireCharacterGridClicks()` are the shared building blocks behind both
  the per-show tab and the global catalogue — one card component, one
  theme resolver, not two parallel implementations.
- `scanCharacterUnlocks()` slots into the existing `scanForTimelineEvents`
  single choke point (periodic 5-minute cycle + boot), alongside
  `scanStatisticsMilestones` and the other established scan functions —
  no new interval, no new trigger architecture.

### Files Modified

`index.html` only — no new files, no build step, consistent with the
rest of the app. New CSS is scoped under a single "Character Archive"
comment block near the end of the stylesheet; new JS is grouped under a
single "Character Archive" section rather than scattered.

### Technical Notes

**Why spoiler unlocking is role + completion only, not per-episode.**
The original brief asked for "Watch Episode X to unlock" messaging.
AniList's Character API has no per-episode "first appears in episode X"
data — nothing free does. Confirmed directly with the user before
building: rather than fabricate an estimated reveal episode, unlock
gating is simply `MAIN` role → always visible (never a real spoiler,
already in every show's own promotional art), `SUPPORTING`/`BACKGROUND`
→ locked until the series is completed. No episode number is ever shown
or implied.

**Why Relationships is empty and Timeline is personal, not in-fiction.**
Same reasoning — AniList has no character-relationship graph and no
in-fiction timeline data at all. Relationships renders an honest "not
available yet" state rather than fabricated data. Timeline was
repurposed as the user's own encounter history (first seen / last seen,
derived from real data: `item.startedDate`/`updatedAt` for when a MAIN
character became visible, `item.finishedDate` for when a
SUPPORTING/BACKGROUND character did), which is both honest and
genuinely useful, consistent with AniTrack's journal-first identity.

**Star-rating widget rebuild bug caught during testing.** The first
implementation of My Journey's rating stars called a full
`renderCharacterDetail()` on every click — since the rating widget lives
inside a collapsible `<details>` that isn't open by default, this
silently collapsed the very section the user was rating on every star
click. Fixed by updating star visuals in place instead of a full
re-render; caught live via Playwright, not by inspection.

**A `pointer-events` bug on the detail hero's gradient overlay** briefly
made the close button unclickable — the `::after` gradient pseudo-element
painted on top of the button (same stacking context, no z-index) and
intercepted the click. Fixed with `pointer-events:none` on the overlay,
since it's purely decorative.

**Reused rather than duplicated:** `seasonGroupBaseName` (season-grouping
feature) for franchise theme matching; `lastWatchedAt` for the personal
Timeline's "last seen"; `cleanDescription` for bio text cleanup;
`escapeHtml`/`loadingHtml`/`STAR_SVG`/the `.detail-meta-grid` and
`.sheet-row`/`.notes`/`.stars` CSS patterns from the existing per-show
Journal tab; `WISDOM_QUOTES` for the Quotes widget's known-quote lookup;
`GENRE_LIST` for catalogue genre filtering; the existing
`NOTIF_CATEGORY_DEFS`/`addTimelineEntry`/`TL_ICONS` notification
architecture end to end.

**Testing.** Verified live with Playwright against the real running app
across four scripts: core unlock/spoiler-gating flows (role gating,
completion transition, spoiler-protection toggle, My Journey persistence),
the global catalogue (cross-series aggregation, search, sort, theme
resolution including the series/genre/default fallback chain, responsive
grid columns at desktop/tablet/mobile widths), notification integration
(unlock entry created once, no duplicate on re-scan, visible in the
Timeline UI), and the full pre-existing regression suite (16 scripts
covering episode tracking, season/arc grouping, the episode modal,
lazy loading, timeline/notifications, and the responsive app shell) to
confirm zero regressions outside the character surface.

### Known Limitations

- **No per-episode unlock data.** See Technical Notes — unlock is role +
  completion only, not truly progressive mid-watch.
- **Relationships has no real data source** — empty-state widget only,
  architecturally ready for when/if that data exists.
- **Gallery is typically single-image** — AniList's Character type only
  exposes one portrait (`image.large`), not a gallery.
- **Species, Height, Occupation, Affiliation, and Popularity always
  render "—".** AniList's Character type has no structured fields for
  any of these (sometimes prose buried in `description`, never reliably
  parseable); Popularity specifically has no separate metric from
  Favorites at the character level, so showing the same number under two
  labels would be dishonest rather than "unknown." Species/Occupation
  are therefore also not offered as catalogue filters — filtering on a
  field that's always "Unknown" wouldn't do anything useful.
- **"Historical" and "Military" genre themes are defined but unreachable
  today** — AniList classifies both as tags, not genres, and this
  session doesn't fetch tags. Ready for tag-based matching later.
- **Global catalogue/progress only reflects series whose characters have
  been fetched at least once** (lazy per-show caching, plus a one-time
  batch warm-up on first Archive visit) — not a background fetch of the
  entire library on every boot, per the "avoid unnecessary API calls"
  performance principle. A show you've never opened either tab for won't
  contribute to the global count until you do.
- **Per-show tab's sort/filter is intentionally lighter than the global
  catalogue's** (search + role filter only, vs. the catalogue's full
  8-option sort + 5-filter toolkit) — a single show's cast doesn't need
  the same power-user controls a library-wide catalogue does; this was a
  scope judgment call, not a spec requirement either way.

### Future Improvements

- Wire the other Archive categories (Quotes, Scenes, Locations, Items,
  Journal Entries, Collections) — the hub's data-driven
  `ARCHIVE_CATEGORIES` list and the overlay's view-swap structure were
  built to support this without redesign.
- Tag-based genre theme matching (AniList `tags`) to actually reach the
  Historical/Military themes.
- If AniList ever exposes richer character data (multiple art pieces,
  structured species/occupation, a relationship graph), the metadata
  grid and Gallery/Relationships widgets are structured to absorb it
  without a redesign — they're built around "always render the field,
  '—' if empty," not "hide the row if data is missing."

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
