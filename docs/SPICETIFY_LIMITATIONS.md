# Spicetify Platform Limitations

Known constraints of the Spicetify platform that affect this project. Documented so future contributors don't waste time rediscovering these.

## TrackMenu is unavailable at runtime

`Spicetify.ReactComponent.TrackMenu` is declared in the type definitions (`const TrackMenu: any`) but is `undefined` at runtime.

**Root cause:** The Spicetify CLI extracts entity menu components from Spotify's webpack modules by scanning for components whose `.type` function matches `value:"<entity>"`. This extraction succeeds for `AlbumMenu`, `ArtistMenu`, `PlaylistMenu`, and `PodcastShowMenu`, but fails for `TrackMenu` because Spotify's track context menu component doesn't match the regex pattern. There is no fallback extraction for `TrackMenu` (unlike `PlaylistMenu`, which has a secondary chunk-based search).

**Impact:** Custom components cannot show Spotify's native track context menu. The full native menu (with "Add to playlist", "Go to song radio", "Share", "View credits", "Start a Jam", plus extension-injected items) is only available on Spotify's own built-in track list components.

**Workaround:** Build a custom menu using `Spicetify.ReactComponent.Menu` + `Spicetify.ReactComponent.MenuItem`. This works but is limited to the actions we explicitly implement (Play, Add to queue, Go to song/artist/album, Copy link). It cannot include extension-injected items or Spotify-internal features like "Add to playlist" submenus.

**Status:** This is a Spicetify CLI bug/limitation. If it's fixed upstream, replacing our custom menus with `TrackMenu` would be straightforward.

## PopupModal renders outside the React provider tree

`Spicetify.PopupModal.display()` renders content in a React subtree that is detached from the main application's provider tree.

**Missing providers:**
- `StableUseNavigateProvider` — required by navigation-dependent components
- `PlatformProvider` / `PlatformContext` — required by platform API hooks
- Router context — required by route-aware components

**Impact:** Any Spicetify React component that internally uses navigation, platform APIs, or routing will crash when rendered inside a PopupModal. This includes:
- `Spicetify.ReactComponent.Menu` + `MenuItem` — crash with "useNavigateStable must be used within a StableUseNavigateProvider"
- `Spicetify.ReactComponent.ContextMenu` / `RightClickMenu` wrapping Menu/MenuItem
- Any component using `Spicetify.Platform.*` hooks internally

**Workaround:** For the Artist Stats popup, we avoid using Spicetify menu components. The planned long-term fix is to convert the modal into a full page within the Stats custom app (see `docs/superpowers/plans/plan-G-modal-to-page.md`).

## ContextMenu/RightClickMenu menu prop

The `menu` prop on `Spicetify.ReactComponent.ContextMenu` and `RightClickMenu` expects a **React element** (JSX), not a function component reference.

```tsx
// CORRECT — pass JSX element
<RightClickMenu menu={<MyMenu uri={uri} />}>

// WRONG — passes function reference, menu renders nothing
<RightClickMenu menu={MyMenuComponent}>
```

Internally, these components use `React.cloneElement` to inject `onClose` and other props. `cloneElement` only works on React elements, not component constructors.

## Native Spotify context menu

There is no programmatic API to trigger Spotify's native context menu for a given URI (no `Spicetify.Platform.ContextMenuAPI.show(uri)` or equivalent). The native context menu is tightly coupled to Spotify's own React component tree and internal event handling. Custom components cannot trigger it.

`Spicetify.ContextMenu.Item` and `Spicetify.ContextMenuV2.registerItem()` allow _adding items to_ the native menu but do not help _trigger_ it from custom components.

## Topbar.Button visibility

`classList.add("hidden")` / `classList.toggle("hidden")` does not work on `Spicetify.Topbar.Button` elements. There is no `.hidden` CSS rule in Spotify's stylesheet for these elements.

**Workaround:** Use `element.style.display = "none"` to hide and `element.style.display = ""` to show.
