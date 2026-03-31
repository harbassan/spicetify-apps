# Library Recovery Notes

This document records the main implementation decisions behind the Library app recovery work on the `feature/oauth-bypass-ratelimits` branch.

## Problem Summary

The Library app was failing against current Spotify desktop client builds in ways that were consistent with broken compatibility between some Spicetify React wrappers and the objects the app was rendering.

The most important user-visible symptoms were:

- Minified React error `#31`
- blank or broken views after interacting with cards and controls
- add controls that did not open reliably
- unstable rendering around cards, menus, and list controls

The branch also picked up targeted fixes for Library-specific runtime issues such as the Shows page and navigation into album, artist, and playlist routes.

## Root Cause Direction

The recovery work treated the issue as a compatibility problem with fragile Spicetify UI primitives rather than as a pure data problem.

In practice, the riskiest pieces were the higher-level React wrappers used for:

- card rendering
- menu rendering
- some icon-only control patterns
- text primitives that were no longer safe in the affected render paths

The branch therefore moved away from the most failure-prone abstractions and toward plain HTML and simpler render logic.

## Recovery Strategy

The implementation followed four consistent rules.

### 1. Prefer plain HTML where wrappers are unstable

Wherever the app was relying on complex Spicetify components for cards, menus, or form controls, the safer replacement was a native element with app-owned styling and event handling.

This was the central React `#31` mitigation pattern.

### 2. Route directly instead of depending on wrapper behavior

Spotify URIs such as `spotify:album:{id}` are now converted into explicit client routes like `/album/{id}` before navigation. This avoids relying on wrapper components to infer the correct router behavior.

### 3. Keep state transitions simple and observable

A debug console was added to the Library app so request and rendering issues can be inspected in-app rather than only through the browser console.

### 4. Degrade with a working fallback instead of a broken control

If a safe HTML implementation could replace a failing control, the branch chose the simpler version rather than preserving a richer but unstable wrapper.

## Implemented Changes

### Native sort dropdown

The shared sort dropdown was rewritten to use a native `select` plus an explicit direction toggle instead of the older context-menu-based pattern.

Why:

- the previous menu path was part of the unstable control surface
- native form controls are substantially more reliable in the current client environment

### Plain HTML cards for Library navigation

Library card rendering was rewritten away from `FeatureCard` and related card abstractions.

Current behavior:

- cards render as app-owned markup
- image failure falls back to initials or a folder/collection glyph
- click handling performs explicit route navigation

This change removed one of the major React `#31` suspects.

### Load More card no longer depends on broken text primitives

The Load More card was simplified to plain HTML so it no longer depends on `TextComponent` in a sensitive render path.

### Card click routing now uses explicit path conversion

Shared Spotify cards and Library custom cards convert Spotify URIs into router paths before calling `Spicetify.Platform.History.push`.

That fixed the branch of failures where clicking a card produced a blank page or navigated incorrectly.

### Library app bootstrapping now uses `window.SpicetifyLibrary`

The app root was updated to wait for `window.SpicetifyLibrary` and then read config from that object directly.

Why:

- it aligns the runtime reference with the actual extension bootstrap object used by the branch
- it avoids broken assumptions about where Library config is exposed

### Library debug console

The branch ports the Stats-style debug console pattern into Library.

It provides:

- a toggleable in-app debug panel
- recent log history
- structured metadata for Library requests and diagnostics

This is meant as an operational aid for future Spotify client regressions, not just a one-off debugging convenience.

### Add button no longer depends on the older failing menu pattern

The Add button flow now uses a Library-owned dropdown and explicit button handlers instead of relying on the previous brittle menu primitive chain.

This was necessary because the Add control was one of the last clearly broken user interactions after the initial card fixes.

### Shows page hardening

The Shows page was updated to support a safer fetch path and fallback behavior.

Current logic:

- try the saved-shows Spotify Web API path with the current access token
- if Spotify returns `429`, fall back to `LibraryAPI.getContents({ filters: ["3"] })`
- if that still fails, try a cached successful page response from localStorage

The page also logs richer status details, including response codes and `Retry-After` metadata.

Note that this page is dealing with saved podcast shows, not live concerts or local events.

## Why This Approach Was Chosen

The branch deliberately did not try to solve Library instability by adding more abstraction.

That would have moved in the wrong direction. The failures were happening at the boundary between the app and unstable wrapper components, so the practical fix was to own more of the rendering directly.

This makes the UI code a little more manual, but it is easier to reason about and much more resilient to client-side incompatibilities.

## Tradeoffs

The recovered Library app is intentionally simpler in a few places than the original implementation.

Accepted tradeoffs include:

- native controls instead of richer menu primitives
- app-owned card markup instead of higher-level card wrappers
- more explicit route handling in click handlers
- debug tooling kept in the app so regressions are diagnosable later

These are acceptable tradeoffs because the primary goal was reliability on current clients, not preserving every previous abstraction.

## Practical Outcome

The branch improves Library in three important ways:

- it removes the most likely React `#31` trigger paths from cards and controls
- it makes navigation and add flows explicit and predictable
- it gives the app an in-client debugging surface for future regressions

If a future Spotify client update breaks more Spicetify wrappers, the intended response should be the same: prefer the simplest reliable render path over a more abstract but fragile one.