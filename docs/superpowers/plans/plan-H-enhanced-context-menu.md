# Plan H: Enhanced Custom Context Menu

## Status: Not Started

## Problem

Since `Spicetify.ReactComponent.TrackMenu` is undefined at runtime (see `docs/SPICETIFY_LIMITATIONS.md`), we use a custom `Menu` + `MenuItem` context menu. The current custom menu is basic compared to Spotify's native menu:

**Current items:** Play, Add to queue, Go to song, Go to artist, Go to album, Copy song link

**Missing from native:** Add to playlist (submenu), Save to/Remove from Liked Songs, Exclude from taste profile, Start a Jam, Sleep timer, Go to song radio, View credits, Share (submenu)

Extension-injected items (e.g., "View Song Stats", "Reset Skips", "Play Next") are also missing since they register via `Spicetify.ContextMenu.Item` / `Spicetify.ContextMenuV2`, which only inject into the native menu system.

## Proposed Enhancements

### Feasible additions (using Spicetify Platform APIs)

1. **Play Next** — `Spicetify.Platform.PlayerAPI.addToQueue()` with `next` flag or equivalent
2. **Save to / Remove from Liked Songs** — `Spicetify.Platform.LibraryAPI.add/remove`; toggle based on current like state (already have `LikedIcon` component)
3. **Add to queue** — Already implemented
4. **Go to song radio** — Navigate to `spotify:radio:track:${id}` or use Platform API
5. **Share → Copy Song Link** — Already implemented
6. **Share → Copy Spotify URI** — `Spicetify.Platform.ClipboardAPI.copy(uri)`

### Not feasible without deep Spotify integration

- **Add to playlist** submenu — Would need to enumerate user playlists and call playlist add API; complex UI
- **Start a Jam** — Internal Spotify feature, no public API
- **Sleep timer** — Internal player feature
- **View credits** — Internal Spotify data
- **Exclude from taste profile** — Internal recommendation API
- **Extension-injected items** — These register into Spotify's native context menu system, not our custom menu

### Priority

Low — this is a nice-to-have polish item. The modal-to-page conversion (Plan G) should come first, as it unblocks context menus in the Artist Stats view entirely.
