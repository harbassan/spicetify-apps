# Stats Recovery Notes

This document records the main decisions, constraints, and rejected approaches from the recent recovery work on the Stats custom app.

## Problem Summary

The app was failing in real use because several Spotify Web API endpoints were either heavily rate-limited or blocked outright in the desktop environment used by Spicetify users.

Observed failure modes included:

- `429 Too Many Requests` on `/v1/me/top/artists` and `/v1/me/top/tracks`
- `403 Forbidden` on enrichment endpoints such as `/v1/audio-features` and `/v1/artists`
- `400 Bad Request` on some search-based enrichment lookups
- repeated refetch behavior that amplified those failures and made the app hard to open at all

The practical consequence was that the app could fail before the user could reach settings, and several tabs either rendered incomplete data or spammed the console with requests known to fail.

## Goals

The work was scoped to make the existing Stats app usable again without redesigning it into a separate service.

Primary goals were:

- stop request storms against known-bad endpoints
- make the app load by default under rate-limited conditions
- preserve useful functionality through Last.fm fallback paths
- keep OAuth support available as an optional bypass path
- degrade honestly when data cannot be obtained instead of showing misleading zeros or blank UI

## Implemented Decisions

### 1. Safer default behavior

`LastFM Only (No Spotify API)` now defaults to enabled so the app does not immediately hit rate-limited Spotify endpoints on first launch.

Why:

- the previous default could prevent the settings UI from appearing at all
- a working default is more important than optimistic Spotify-first behavior in the current environment

### 2. OAuth via Authorization Code with PKCE

OAuth support was kept and fixed rather than removed.

Important details:

- redirect URI was corrected to `http://127.0.0.1:5173/callback`
- token refresh support was retained
- refresh-token presence is treated as sufficient to keep the OAuth path viable
- OAuth-related settings callbacks no longer auto-trigger during config bootstrap

Why:

- user-supplied OAuth can still help when the built-in path is degraded
- PKCE is the correct browser-safe flow for this app shape

### 3. Endpoint suppression instead of endless retrying

The Spotify fetch layer now suppresses repeated requests to endpoints that are currently returning `400`, `403`, or `429`.

Why:

- immediate retries were not helping
- once an endpoint is clearly unavailable, continuing to hammer it only worsens user experience
- suppression gives the app a chance to continue rendering partial results from other sources

### 4. Explicit fallback sources by page

The app now leans into the real distinction between data sources instead of pretending every page can be recovered from Spotify alone.

Current behavior:

- Top Artists / Top Tracks: Spotify or Last.fm depending on settings and availability
- Albums: effectively Last.fm-backed when Spotify enrichment is unavailable
- Charts: Last.fm-backed by design
- Genres: derived from top tracks plus top artists, using Spotify artist genres first, then Last.fm tags, then optional MusicBrainz tags
- Library: derived from local playlist/library content with enrichment when available and local/raw fallbacks when not

### 5. Honest degradation for missing metrics and images

When audio features are unavailable, stat cards show `Unavailable` instead of fake `0%` or broken values.

When images are unavailable:

- cards fall back to initials-based placeholders
- track rows fall back to initials-based tiles
- library artist cards now also try to borrow the most common associated album cover from playlist data before falling back to initials

Why:

- placeholder UI is acceptable
- fabricated metrics are not

## Why Audio Features Were Not Replaced

The app still cannot produce true Spotify-style audio feature data when `/v1/audio-features` is blocked.

This was investigated directly.

### Why MusicBrainz was not used for audio features

MusicBrainz is a music metadata source. It can help with:

- artist identifiers
- tags
- genres
- release relationships

It does not provide Spotify-style per-track acoustic metrics such as:

- danceability
- energy
- valence
- speechiness
- acousticness
- instrumentalness
- liveness
- tempo as returned by Spotify audio analysis/features

Because of that, MusicBrainz is useful for genre enrichment but not as a substitute for Spotify audio features.

### What would be required to replace audio features

A real replacement would need one of these:

- another API that exposes comparable acoustic-analysis features for the same catalog
- a local audio-analysis pipeline that has access to audio files and computes those metrics directly
- a separate backend with its own ingestion and analysis model

Those options are far outside the intended scope of this repo and would materially change the project.

## Why Album Images Are Easier Than Artist Images

Album artwork survives more often because album data usually already carries cover art in objects the app can access.

Sources that still work relatively well:

- raw album objects from playlist data
- internal GraphQL album metadata used by the Spotify desktop client

Artist images are different:

- raw playlist artist objects do not reliably include artist artwork
- artist artwork usually requires separate artist enrichment calls
- those artist enrichment calls are among the endpoints that are often blocked or rate-limited

That is why album image recovery is materially easier than artist image recovery in this environment.

## Similar Projects Considered

The research log in `RATE_LIMIT_RESEARCH.md` covered similar projects and alternative architectures.

### `your_spotify`

This was the most meaningful architectural comparison.

What a `your_spotify`-style solution would require:

- a persistent backend service
- database storage for listening history and snapshots
- scheduled or continuous ingestion of user playback/history data
- a hosted deployment or a local always-on service
- authentication, token storage, refresh handling, and server maintenance
- a different product model focused on accumulated history, not just the current in-client app state

What it would solve better:

- arbitrary time windows
- custom aggregates over long periods
- reduced dependence on Spotify's current personalization endpoints at render time
- historical analysis that the current app cannot compute on demand

Why it was not implemented here:

- it is a fundamentally different architecture, not a patch to the existing custom app
- it introduces operational requirements that many users of a desktop custom app do not want
- it would require backend hosting, local hosting, or both
- it would expand the scope from client recovery to building and operating a companion service

In short: it is a valid product direction, but not a reasonable in-repo fix for the current Stats app.

### Other projects using the same Spotify data

Projects that are still frontends over Spotify's existing top-data APIs do not actually solve the root problem here. They may present the data differently, but they still depend on the same family of endpoints and therefore inherit similar limitations.

## Limitations That Still Remain

The app is substantially more resilient now, but some limitations are intrinsic to the available data sources.

Still unresolved at the architectural level:

- true audio-feature metrics remain unavailable when Spotify blocks `/v1/audio-features`
- artist images remain best-effort outside contexts where associated album art can be borrowed
- Charts remain Last.fm-driven and do not provide richer timeframe controls without switching the product model or data source
- the app cannot support arbitrary historical windows without a separate history store
- unrelated extensions can still generate their own rate-limit noise in the same Spotify client session

## Why This Scope Was Chosen

The chosen implementation keeps the project within the boundaries of an in-client Spicetify app:

- no companion backend
- no persistent server requirement
- no new operational burden on users
- no fake analytics when the underlying source is missing

That makes the result less ambitious than a full analytics platform, but much more realistic to maintain inside this repository.

## Practical Outcome

The current state is intentionally pragmatic:

- the app loads under conditions that previously broke it
- it avoids repeatedly calling endpoints that are already known to fail
- it uses Last.fm and optional MusicBrainz augmentation where those sources genuinely help
- it clearly signals unavailable data rather than inventing it

If the project later wants true arbitrary-range analytics or durable listening-history features, that should be pursued as a separate backend-backed architecture rather than another round of client-side patching.

## Follow-up Updates

The branch picked up a second round of resilience work after the initial recovery pass.

### Debugging and diagnostics

Stats now includes an in-app debug console that surfaces:

- recent request and fallback logs
- active endpoint suppressions
- cache and invalidation activity

This was added because console-only debugging was too slow when the app was failing before the user could easily inspect what happened. The debug console makes it much easier to see whether the current failure is caused by OAuth state, direct fetch fallback, endpoint suppression, or missing enrichment data.

### Charts artwork fallback was extended

The original recovery work preserved Last.fm as the main data source for Charts, but artwork could still disappear when Spotify enrichment was unavailable.

That path is now more robust:

- album chart items preserve Last.fm artwork when Spotify enrichment fails or returns no image
- artist chart items can fall back to `artist.getTopAlbums` on Last.fm to obtain a representative image
- track chart items can fall back to `track.getInfo` on Last.fm to obtain album art
- known Last.fm placeholder images are filtered out so fake artwork is not treated as success

This keeps the Charts page useful even when Spotify search endpoints are degraded.

### Session-scoped Spotify search-result cache

One of the most expensive remaining failure modes was repeated Spotify search enrichment across reloads. Even if the current session had already resolved an artist, album, or track once, the app would have to search again after reload and risk another suppression event.

To reduce that pressure, search enrichment results are now cached for the current app session rather than being written as long-lived localStorage data.

Current behavior:

- cached search results survive reloads within the current session
- entries expire after a short bounded TTL
- the cache size is capped so it does not grow without limit
- cache hits update access metadata for eviction ordering
- stale persisted `400` suppressions for `search-*` endpoints are discarded on load

The goal is not durable catalog storage. The goal is to avoid immediately redoing the same Spotify search work for the same chart items while the current session is still active.

### Config-aware cache keys for chart data

Chart queries now include a configuration-derived cache key rather than relying only on the tab identifier.

Why this matters:

- switching between Spotify-backed and Last.fm-backed modes should not reuse the wrong cached result
- changing Last.fm identity-sensitive settings should invalidate the relevant query results cleanly

This is a small change, but it removes a class of confusing stale-data behavior when testing fallback modes.

## Current Practical Outcome

With the follow-up changes in place, the Stats app is now better at three things than it was after the first recovery pass:

- explaining why a request path is failing
- keeping chart artwork present without depending on fresh Spotify enrichment
- avoiding repeated Spotify search traffic across reloads

The app is still constrained by the underlying platform, but it now degrades with much less churn and much better visibility.