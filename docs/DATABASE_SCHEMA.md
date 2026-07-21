# DATABASE_SCHEMA

## Tables

### media

-   id
-   title
-   original_title
-   media_type
-   language
-   status
-   synopsis
-   studio
-   mangaka_director
-   runtime
-   banner_url
-   poster_url

### seasons

-   id
-   media_id
-   season_number
-   title

### episodes

-   id
-   season_id
-   number
-   title
-   runtime
-   air_date
-   rating

### chapters

-   id
-   media_id
-   number
-   title
-   release_date
-   rating

### user_progress

-   media_id
-   current_episode
-   current_chapter
-   started_at
-   finished_at
-   state
-   rating

### journal

-   media_id
-   mood
-   notes
-   favorite_character
-   favorite_scene
-   why_dropped
-   would_recommend
-   rewatch_count
-   reread_count

### characters

Lives on the `media` row itself (`item.characters`), not a separate
table — enriched in place from AniList rather than duplicated into a
second store.

-   id (AniList character id)
-   media_id
-   name
-   native_name
-   aliases (list)
-   image
-   role (MAIN / SUPPORTING / BACKGROUND)
-   gender
-   age
-   birthday (month/day)
-   blood_type
-   favourites
-   description
-   voice_actors (list --- id, name, image, language)

Fields AniList's Character API doesn't structurally provide (species,
height, occupation, affiliation, and a separate popularity metric
distinct from favourites) are intentionally absent here rather than
faked --- the display layer always renders the field with an "unknown"
placeholder instead of hiding it. See PROJECT_STATUS.md's Character
Archive session for the full reasoning.

### character_journey

Private per-character notes, keyed by character id --- not tied to a
specific media row, since the same character id is the same person
across every series they appear in.

-   character_id
-   first_seen (derived, not stored separately --- see unlock notes below)
-   last_seen (derived from the parent show's own watch history)
-   favorite_moment
-   favorite_quote
-   notes
-   rating
-   last_viewed_at

### archive_settings

-   spoiler_protection_enabled (bool, default true)

Character unlock state itself is **not** persisted anywhere --- it's a
pure function of a character's `role` and its parent media's `status`
(plus the spoiler-protection toggle), recomputed on every render rather
than cached, so it can never drift out of sync with the rest of the
data. Unlock *notifications* reuse the existing `timeline` table's own
id-based dedup (`char-unlock-<character_id>`) rather than a separate
"already notified" flag.

### releases

-   media_id
-   next_release
-   release_day
-   release_time

### wisdom

-   id
-   quote
-   character
-   series
-   image

### settings

-   theme
-   accent
-   hidden_widgets
-   backup_path

### timeline

Combined notification log + journal history — system events (new
episode, airing reminders, milestones) and the user's own journal
milestones (started/finished dates, anniversaries) live in one
chronological table, not two separate concepts.

-   id (stable, deterministic per real-world event --- e.g.
    `ep-<media_id>-<episode>`, `annv-started-<media_id>-<years_ago>` ---
    this is what prevents the same event ever being logged or notified
    twice, not a separate dedupe table)
-   type (episode_released, chapter_released, airing_today, airing_soon,
    premiere, finale, wisdom, journal_started, journal_finished,
    anniversary_started, anniversary_finished, milestone,
    continue_reminder, watch_later, character_unlocked)
-   category (anime, reading, wisdom, journal, milestone, continue,
    watchlater, character --- maps to one notification_settings toggle)
-   setting_key (which notification_settings field gates this entry)
-   title
-   description
-   timestamp
-   media_id
-   media_type
-   poster
-   read (bool)
-   silent (bool, not persisted --- write-time only: true means logged to
    the timeline without popping a live notification, used for backfilled
    journal history and first-run milestone baselining)

### notification_settings

One row, single user. Every category independently optional, plus a
master switch gating whether any of them may fire a real notification.

-   master_enabled
-   new_episode
-   new_chapter
-   airing_reminders
-   release_countdown
-   continue_watching
-   continue_reading
-   watch_later_reminders
-   journal_anniversaries
-   statistics_milestones
-   character_unlocks
-   continue_frequency_days
-   watch_later_frequency_days
