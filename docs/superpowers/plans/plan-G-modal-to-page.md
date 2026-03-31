# Plan G: Convert Artist Stats Modal to Page

## Status: Not Started

## Problem

The Artist Stats feature currently uses `Spicetify.PopupModal.display()` to show artist data. The PopupModal renders content outside the main React provider tree, which causes:

1. **Context menus crash** — `Menu`/`MenuItem` require `StableUseNavigateProvider` and `PlatformProvider`, which are absent in the modal
2. **No native track context menu** — Even if `TrackMenu` existed at runtime, it would crash in the modal for the same provider reasons
3. **No router context** — Components can't use routing hooks
4. **Limited space** — Modal has constrained viewport; a page would have full width/height
5. **No navigation history** — Modal doesn't integrate with browser back/forward buttons

See `docs/SPICETIFY_LIMITATIONS.md` for full details on these constraints.

## Proposed Solution

Convert the Artist Stats modal into a page route within the Stats custom app.

### Architecture

1. **Route registration**: Add `/artist/:id` route to the Stats app router (alongside existing `/tracks`, `/artists`, etc.)
2. **Navigation**: The extension button on artist pages calls `Spicetify.Platform.History.push('/stats/artist/${id}')` instead of `PopupModal.display()`
3. **Component reuse**: Move `ArtistPage` from the extension bundle into the main app bundle
4. **Full provider access**: As a page within the Stats app, it has full access to all Spotify providers, router context, and platform APIs

### Implementation Steps

1. **Add route to Stats app router**
   - In `projects/stats/src/app.tsx`, add a route for `/artist/:id`
   - Import the `ArtistPage` component

2. **Move ArtistPage to main app**
   - Move `projects/stats/src/pages/artist.tsx` rendering to be consumed by the main app router
   - The extension only needs to trigger navigation, not render the component

3. **Update extension button**
   - Change `openArtistStats()` from `PopupModal.display()` to `Spicetify.Platform.History.push()`
   - Keep the button injection logic (action bar + topbar fallback)

4. **Add navigation tab** (optional)
   - Consider adding an "Artist" tab to the Stats navigation bar that's context-aware
   - Or keep it accessible only via the artist page button

5. **Enable context menus**
   - `ArtistTrackRow` can now use `RightClickMenu` + `Menu`/`MenuItem` since providers are available
   - For the custom menu (since `TrackMenu` is broken), add the same menu items as `track_row.tsx`

6. **Remove modal-specific code**
   - Remove Escape key handler (browser navigation handles this)
   - Remove `isMountedRef` guards specific to modal lifecycle
   - Remove `PopupModal.hide()` calls before navigation

7. **Page layout**
   - Use full page width instead of modal constraints
   - Add breadcrumb or back navigation
   - Consider reusing Stats app layout components (header, navigation)

### Migration Concerns

- **Backward compatibility**: The extension button needs to detect whether the Stats app is installed and navigate accordingly. If Stats isn't installed, could fall back to modal or show a message.
- **Deep linking**: `/stats/artist/:id` URLs can be shared or bookmarked.
- **Module boundary**: Currently `artist.tsx` is in the extension bundle. Moving it to the main app changes the build target.
- **Cache sharing**: Module-level caches (`_mainCache`, `_playlistCache`, etc.) stay in the main app bundle.

### Benefits

- Full context menu support (right-click + three-dot button)
- Full provider access (routing, platform, navigation)
- More space for content
- Back/forward browser navigation
- Deep linking support
- Consistent with the rest of the Stats app UX
