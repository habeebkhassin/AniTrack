# API_SOURCES

## Primary Metadata

-   AniList GraphQL API Purpose:
-   Anime
-   Manga
-   Characters
-   Studios
-   Staff
-   Airing schedules

## TV Metadata

-   TMDB (future, optional) Purpose:
-   Trailers
-   Backdrops

## Ratings

-   AniList
-   MyAnimeList (where permitted)
-   Kitsu (optional)

## Manga

-   MangaDex API Purpose:
-   Chapters
-   Covers
-   Publication status

## Donghua

Use AniList entries where available. Extend with a curated local
database if needed.

## Quotes

Maintain a local JSON database. Fields: - quote - character - series -
image

## Images

Cache locally after first download.

## Principles

-   Offline-first
-   Cache aggressively
-   Graceful fallback
-   Never block UI waiting for network
