# Spotify API Rate Limiting Research & Workarounds

## Overview

This document details the investigation into the "Failed to fetch the info from server" error affecting the Spicetify Stats app, as reported in [harbassan/spicetify-apps#236](https://github.com/harbassan/spicetify-apps/issues/236) and [#237](https://github.com/harbassan/spicetify-apps/issues/237).

**Date of Research:** January 2026  
**Branch:** `feature/oauth-bypass-ratelimits`

---

## The Problem

Users of the Stats spicetify app are experiencing immediate HTTP 429 (Too Many Requests) errors when the app attempts to fetch data from Spotify's `/me/*` API endpoints. The error occurs even on the very first request, suggesting an account-level rate limit rather than a per-session limit.

### Affected Endpoints

- `https://api.spotify.com/v1/me/top/artists`
- `https://api.spotify.com/v1/me/top/tracks`
- Other `/me/*` personalization endpoints

### Error Manifestation

```
GET https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=long_term 429 (Too Many Requests)
```

The app displays: **"Failed to fetch the info from server. Try again later."**

---

## Root Cause Analysis

### How Spicetify Makes API Calls

Spicetify uses `Spicetify.CosmosAsync` to make API requests. This utility:
- Uses the **user's own OAuth token** from the Spotify desktop client
- Routes requests through Spotify's internal APIs
- Is subject to the same rate limits as direct API calls

### The Rate Limiting Issue

According to [spicetify/cli#3670](https://github.com/spicetify/cli/issues/3670), Spotify has implemented aggressive rate limiting on certain API endpoints. Key findings:

1. **Rate limits are account-level**, not session-level
2. **Cooldown periods can be up to 24 hours**
3. **Even 5-10 requests can trigger rate limits**
4. **The limit applies regardless of the fetch method used** (CosmosAsync, direct fetch, etc.)

### Spicetify Maintainer's Position

From [rxri's comment on spicetify/cli#3670](https://github.com/spicetify/cli/issues/3670):

> "Not related to spicetify. This is spotify doing this and there's no workaround."

Key points from the maintainer:
- This is **Spotify's doing**, not a spicetify bug
- CosmosAsync uses the user's token, making it subject to rate limits
- The [CosmosAsync documentation](https://spicetify.app/docs/development/api-wrapper/methods/cosmos-async) already states it should only be used for **internal Spotify endpoints**
- Alternative `spclient` endpoints exist but are undocumented

---

## What We Tried

### 1. Exponential Backoff Retry Logic ❌

**Implementation:** Added retry mechanism with exponential backoff (5s base, 3 retries) to `apiFetch` function.

**Result:** Failed. The rate limit is not a temporary throttle but a persistent block. Retrying after delays still returned 429 errors.

**Code Location:** `projects/stats/src/api/spotify.ts`

### 2. Throttled Batch Processing ❌

**Implementation:** Created a `throttledMap` utility to process API calls with 1-second delays between batches.

**Result:** Failed. Even with delays, the underlying rate limit on the account persisted.

### 3. Direct Fetch Bypass ❌

**Implementation:** Used `Spicetify.Platform.AuthorizationAPI.getState().token.accessToken` to make direct `fetch()` calls to the Spotify API, bypassing CosmosAsync.

**Result:** Failed. The rate limit is applied at Spotify's server level based on the OAuth token, not the client making the request. Same 429 errors occurred.

**Code Location:** `projects/stats/src/api/spotify.ts` (behind "Use Direct Fetch" toggle)

### 4. OAuth PKCE Flow (Blocked) ⏸️

**Implementation:** Built a complete OAuth PKCE authentication flow that would allow users to register their own Spotify Developer App and authenticate separately.

**Result:** Cannot be tested. As of December 2025+, Spotify has **frozen new app registrations** on the Developer Dashboard:

> "Note: New integrations are currently on hold while we make updates to improve reliability and performance."

**Code Location:** `projects/stats/src/api/oauth.ts` (complete implementation ready for when registration reopens)

**Files Created:**
- `oauth.ts` - Full PKCE OAuth implementation with token refresh
- Updated `extension.tsx` with OAuth settings UI
- Updated `spotify.ts` with OAuth-aware fetch functions

### 5. LastFM Only Mode ✅

**Implementation:** Created a pure LastFM mode that:
- Fetches all data exclusively from the Last.fm API
- Completely bypasses Spotify API calls
- Uses LastFM images and links instead of Spotify's

**Result:** **SUCCESS!** This mode works without any 429 errors.

**Code Changes:**
- `projects/stats/src/types/stats_types.ts` - Added `"lastfm-only"` config option
- `projects/stats/src/utils/converter.ts` - Added `convertArtistLastFMOnly()`, `convertAlbumLastFMOnly()`, `convertTrackLastFMOnly()` functions
- `projects/stats/src/extensions/extension.tsx` - Added "LastFM Only (No Spotify API)" toggle
- `projects/stats/src/pages/top_artists.tsx`, `top_tracks.tsx`, `top_albums.tsx`, `charts.tsx` - Pass `lastfmOnly` flag

---

## Working Solution: LastFM Only Mode

### How to Enable

1. Open Stats app settings
2. Under "Last.fm Integration":
   - Enter your Last.fm API Key
   - Enter your Last.fm Username
3. Enable **"LastFM Only (No Spotify API)"**
4. Reload the app

### Trade-offs

| Feature | With Spotify API | LastFM Only Mode |
|---------|------------------|------------------|
| Artist/Track/Album data | ✅ Spotify metadata | ✅ LastFM metadata |
| Images | Spotify album art | LastFM images |
| Links | Open in Spotify | Open on LastFM website |
| Genres | Spotify genres | Not available |
| Popularity scores | Available | Not available |
| Library page | Works (uses Platform API) | Works (uses Platform API) |
| Genres page | Full functionality | Limited/may not work |
| Rate limiting | 429 errors | No issues |

### Performance

In testing, LastFM data fetches completed in under 1 second:
```
stats - lfmTopArtists fetch time: 885.6ms
```

---

## Other Fixes Made

### React Error #200 Fix

**Problem:** The Stats app was crashing with "Minified React error #200" related to `createPortal`.

**Cause:** The `NavigationBar` component was trying to create a React portal to a DOM element that didn't exist yet.

**Fix:** Added null check in `projects/shared/src/components/navigation/navigation_bar.tsx`:

```tsx
const target = document.querySelector(".Root__main-view .os-viewport-native-scrollbars-invisible");
if (!target) return null;
return ReactDOM.createPortal(/* ... */);
```

---

## External Resources

### Similar Projects

During research, we identified projects that use OAuth authentication:
- **[Your Spotify](https://github.com/Yooooomi/your_spotify)** - Self-hosted Spotify analytics
- **[Statify](https://github.com/alihan/statify)** - Spotify statistics web app
- **[statsforspotify.com](https://www.statsforspotify.com)** - Web-based stats (working, uses proper OAuth)

These projects work because they use proper OAuth app registration with their own client credentials, not the user's desktop token.

### Relevant Issues

- [harbassan/spicetify-apps#236](https://github.com/harbassan/spicetify-apps/issues/236) - Original issue report
- [harbassan/spicetify-apps#237](https://github.com/harbassan/spicetify-apps/issues/237) - Related report
- [spicetify/cli#3670](https://github.com/spicetify/cli/issues/3670) - Core spicetify issue acknowledging the problem

---

## Future Possibilities

### When Spotify Reopens App Registration

The OAuth PKCE implementation in this branch is ready to use once Spotify reopens developer app registration. Users would need to:

1. Create a Spotify Developer App at https://developer.spotify.com/dashboard
2. Add redirect URI: `http://127.0.0.1:5173/callback`
3. Enter Client ID in Stats app settings
4. Click "Authenticate with OAuth"

### Alternative Endpoints

The spicetify maintainer mentioned that alternative `spclient` endpoints exist but are undocumented. These internal endpoints may not be subject to the same rate limits but would require reverse engineering.

---

## Conclusion

The Spotify API 429 rate limiting issue is a **platform-level problem** that cannot be resolved by modifying the Stats app's request behavior. Spotify has implemented aggressive rate limiting on personalization endpoints (`/me/*`) that affects all applications using user OAuth tokens.

**The only working solution** at this time is to use alternative data sources like Last.fm, which this fork implements via the "LastFM Only" mode.

---

## File Changes Summary

| File | Change |
|------|--------|
| `projects/stats/src/api/oauth.ts` | New - OAuth PKCE implementation |
| `projects/stats/src/api/spotify.ts` | Added retry logic, direct fetch, OAuth support |
| `projects/stats/src/extensions/extension.tsx` | Added LastFM Only toggle, OAuth settings |
| `projects/stats/src/types/stats_types.ts` | Added `lastfm-only` config, updated types |
| `projects/stats/src/utils/converter.ts` | Added LastFM-only converter functions |
| `projects/stats/src/pages/top_artists.tsx` | Pass `lastfmOnly` flag |
| `projects/stats/src/pages/top_tracks.tsx` | Pass `lastfmOnly` flag |
| `projects/stats/src/pages/top_albums.tsx` | Pass `lastfmOnly` flag |
| `projects/stats/src/pages/charts.tsx` | Pass `lastfmOnly` flag |
| `projects/shared/src/components/navigation/navigation_bar.tsx` | Fixed React portal null check |

---

**User**

Okay, so it's not CosmosAsync specific. But this could still be handled better if spicetify routed all API requests, rather than allowing all extensions, custom apps, etc. to do whatever they want, right? It's not a spicetify bug, but they could make the experience better for users?

---

**Agent**

You're right - theoretically spicetify *could* implement a centralized request manager that:

1. **Queues all API requests** across extensions/apps  
2. **Rate limits globally** (e.g., max X requests per minute to `api.spotify.com`)  
3. **Prioritizes requests** (maybe core app over extensions)  
4. **Shares cooldown state** (if one extension triggers 429, others back off too)

**However, here's why they probably won't:**

1. **Philosophy** - Spicetify is a *mod framework*, not a managed platform. It injects into Spotify and exposes APIs. What developers do with those APIs is their responsibility.  
2. **Scope creep** - This would be a significant architectural addition requiring maintenance, testing, and ongoing support. The maintainer is clearly already overwhelmed with support requests.  
3. **It wouldn't solve the core problem** - Even with perfect rate limiting from spicetify, if Spotify has decided to rate-limit the `/me/*` endpoints to near-zero for desktop tokens, no amount of client-side throttling will help. You can't rate-limit your way out of a ban.  
4. **Blame shifting** - The maintainer's position is clear: *"Spotify did this, go complain to Spotify."* Building infrastructure to work around it implies accepting responsibility for it.  
5. **The "right" solution exists** - The docs already say "use internal endpoints only." Extensions that violate this are at fault, not spicetify.

**In practice:** A shared rate-limiter would help with *accidental* overload (many extensions making reasonable requests simultaneously), but wouldn't help with the current situation where Spotify is returning 429 on the *first* request. That's not a rate limit from overuse - it's a block.  