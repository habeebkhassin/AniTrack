# FEATURE_ROADMAP

## Phase 1 --- Core Tracking

-   Continue Watching widget at top
-   Continue Reading widget
-   Progress bars + numeric progress
-   Merge seasons under one title
-   Anime, Manga, Manhwa, Manhua, Donghua support
-   Watch Later / Read Later
-   Swipe gestures for progress

## Phase 2 --- Detail Pages

-   Banner + poster
-   Metadata (studio, status, language, runtime)
-   Genres, synopsis
-   Trailer
-   Cast & crew
-   Recommendations
-   Release schedule

## Phase 3 --- Anime Journal (Signature)

-   Started / Finished dates
-   Mood
-   Notes
-   Favorite character
-   Favorite scene
-   Why dropped
-   Personal rating
-   Rewatch / reread count

## Phase 4 --- Dashboard

-   Continue Watching
-   Continue Reading
-   Recent Activity
-   Calendar
-   Upcoming Releases
-   Daily Anime Wisdom
-   Quick Stats

## Phase 5 --- Statistics

-   Watching metrics
-   Reading metrics
-   Journal metrics
-   Personal insights
-   Yearly Wrapped

## Phase 6 --- Polish

-   Loading states
-   Empty states
-   Animations
-   Accessibility
-   Backup & Restore
-   Import / Export

## Phase 7 --- Future

-   [x] Anniversary reminders --- Journal Anniversaries notification category
-   [x] Timeline --- combined system-event + journal-history log, replacing
    the earlier plain "Alerts" toggle; see PROJECT_STATUS.md
-   [x] Character Archive --- collector-card character system (per-show tab +
    cross-series catalogue in a new Archive hub), spoiler-aware unlocking,
    theming, My Journey, and unlock notifications/milestones; see
    PROJECT_STATUS.md. First of a planned family of Archive categories
    (Quotes, Scenes, Locations, Items, Journal Entries, Collections all
    still pending, architecture ready for them)
-   Collections
-   Printable journal

### Character Archive (this phase)

-   [x] Per-show Character Archive tab (About | Episodes | Character
    Archive | Journal) --- collector-card grid, progress readout, search + role filter
-   [x] Cross-series Character Catalogue --- new Archive hub (header icon
    beside notifications), search/sort/filter across every tracked series
-   [x] Series/franchise/genre themed decks with monochrome crests
-   [x] Spoiler protection --- role-gated silhouette/reveal + a uniform
    completion gate for deeper spoiler content, user-toggleable
-   [x] Character detail page --- metadata grid, Voice Actors (JP/EN),
    Biography, Gallery, Relationships (empty state), personal Timeline,
    My Journey, Quotes
-   [x] Character unlock notifications + Archive milestones (10/50/100/500),
    integrated into the existing Notification System

### Notification System (this phase, done alongside Timeline)

-   [x] New episode / new chapter detection (reuses refreshAiring's existing
    metadata refresh --- chapter detection is new, episode detection already
    existed)
-   [x] Airing reminders --- airing today, premiere, finale (reuses Calendar's
    weekly-cadence projection)
-   [x] Release countdown --- airing within the hour
-   [x] Continue Watching / Continue Reading reminders (reuses Home feed's
    existing "stale" definition)
-   [x] Watch Later reminders
-   [x] Daily Anime Wisdom --- minimal quote set + overlay, just enough to
    give the notification a real target (the full dashboard widget from
    Phase 4 is still not built)
-   [x] Statistics Milestones --- completed count, episodes/chapters,
    hours watched, journal entries, with first-run baselining so an
    existing library doesn't fire a burst of retroactive achievements
-   [x] Per-category Notification Settings page + dashboard widget
