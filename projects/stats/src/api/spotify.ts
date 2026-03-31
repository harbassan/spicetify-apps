import type * as Spotify from "../types/spotify";
import { statsDebug, debugLog } from "../extensions/debug";
import { isOAuthEnabled, hasValidTokens, oauthFetch, getAccessToken } from "./oauth";
import { fetchWithRetry } from "../utils/fetch-with-retry";

const SPOTIFY_API_BASE_URL = "https://api.spotify.com/";

type SuppressedEndpoint = {
	status: number;
	reason: string;
	until: number;
};

type SessionSearchCacheEntry = {
	value: unknown;
	cachedAt: number;
	lastAccessedAt: number;
	hits: number;
	expiresAt: number;
};

const ENDPOINT_SUPPRESSION_STORAGE_KEY = "stats:spotify:endpoint-suppressions";
const SESSION_SEARCH_CACHE_STORAGE_KEY = "stats:spotify:search-session-cache";
const SESSION_SEARCH_CACHE_TTL_MS = 15 * 60_000;
const SESSION_SEARCH_CACHE_MAX_ENTRIES = 100;

/** Maximum time an endpoint can remain suppressed before automatic recovery */
const SUPPRESSION_TTL_MS = 5 * 60_000;
/** Minimum suppression time for 429 rate-limit responses */
const MIN_RATE_LIMIT_SUPPRESSION_MS = 15_000;
/** Default suppression time when no Retry-After header is provided for 429 */
const DEFAULT_RATE_LIMIT_SUPPRESSION_MS = 60_000;
/** Fallback suppression time for non-categorised errors */
const DEFAULT_SUPPRESSION_MS = 60_000;

const endpointSuppressions = new Map<string, SuppressedEndpoint>();
const sessionSearchCache = new Map<string, SessionSearchCacheEntry>();

// ── In-memory cache for external (non-Spotify) API responses (e.g. Last.fm) ──
const EXTERNAL_CACHE_TTL_MS = 30 * 60_000; // 30 min
const EXTERNAL_CACHE_MAX = 200;
const externalFetchCache = new Map<string, { data: unknown; ts: number }>();
const externalInflight = new Map<string, Promise<unknown>>();

function readExternalCache<T>(url: string): T | undefined {
	const entry = externalFetchCache.get(url);
	if (!entry) return undefined;
	if (Date.now() - entry.ts < EXTERNAL_CACHE_TTL_MS) return entry.data as T;
	externalFetchCache.delete(url);
	return undefined;
}

function writeExternalCache<T>(url: string, data: T): T {
	const now = Date.now();
	for (const [k, v] of externalFetchCache) {
		if (now - v.ts >= EXTERNAL_CACHE_TTL_MS) externalFetchCache.delete(k);
	}
	if (externalFetchCache.size >= EXTERNAL_CACHE_MAX) {
		let oldestKey: string | undefined;
		let oldestTs = Infinity;
		for (const [k, v] of externalFetchCache) {
			if (v.ts < oldestTs) {
				oldestTs = v.ts;
				oldestKey = k;
			}
		}
		if (oldestKey !== undefined) externalFetchCache.delete(oldestKey);
	}
	externalFetchCache.set(url, { data, ts: now });
	return data;
}

const setSuppressionActivity = (endpointKey: string, suppression: SuppressedEndpoint) => {
	statsDebug.setActivity({
		key: `suppression:${endpointKey}`,
		kind: "suppression",
		title: `Spotify ${endpointKey}`,
		detail: buildSuppressedMessage(endpointKey, suppression),
		until: suppression.until,
		createdAt: Date.now(),
	});
};

const loadSessionSearchCache = () => {
	if (sessionSearchCache.size > 0) return;

	try {
		const raw = sessionStorage.getItem(SESSION_SEARCH_CACHE_STORAGE_KEY);
		if (!raw) return;

		const parsed = JSON.parse(raw) as Record<string, SessionSearchCacheEntry>;
		const now = Date.now();
		let changed = false;

		for (const [key, value] of Object.entries(parsed)) {
			if (value.expiresAt <= now) {
				changed = true;
				continue;
			}
			sessionSearchCache.set(key, value);
		}

		if (changed) persistSessionSearchCache();
	} catch {
		sessionStorage.removeItem(SESSION_SEARCH_CACHE_STORAGE_KEY);
	}
};

const persistSessionSearchCache = () => {
	const now = Date.now();
	const activeEntries = [...sessionSearchCache.entries()]
		.filter(([, value]) => value.expiresAt > now)
		.sort((left, right) => right[1].lastAccessedAt - left[1].lastAccessedAt)
		.slice(0, SESSION_SEARCH_CACHE_MAX_ENTRIES);

	sessionSearchCache.clear();
	activeEntries.forEach(([key, value]) => sessionSearchCache.set(key, value));

	if (activeEntries.length === 0) {
		sessionStorage.removeItem(SESSION_SEARCH_CACHE_STORAGE_KEY);
		return;
	}

	sessionStorage.setItem(SESSION_SEARCH_CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(activeEntries)));
};

const getSessionSearchCacheKey = (kind: string, parts: string[]) => {
	return `${kind}:${parts.map((part) => part.trim().toLocaleLowerCase()).join("::")}`;
};

const readSessionSearchCache = <T>(key: string) => {
	loadSessionSearchCache();
	const entry = sessionSearchCache.get(key);
	if (!entry) return undefined;
	if (entry.expiresAt <= Date.now()) {
		sessionSearchCache.delete(key);
		persistSessionSearchCache();
		return undefined;
	}

	entry.hits += 1;
	entry.lastAccessedAt = Date.now();
	statsDebug.info("Session search cache hit", { key, hits: entry.hits });
	return entry.value as T;
};

const evictOldestSearchCacheEntries = () => {
	if (sessionSearchCache.size < SESSION_SEARCH_CACHE_MAX_ENTRIES) return;

	const now = Date.now();
	const entries = [...sessionSearchCache.entries()]
		.filter(([, entry]) => entry.expiresAt > now)
		.sort((left, right) => left[1].lastAccessedAt - right[1].lastAccessedAt);

	const excess = entries.length - SESSION_SEARCH_CACHE_MAX_ENTRIES + 1; // +1 for the incoming entry
	if (excess > 0) {
		const toEvict = entries.slice(0, excess);
		for (const [evictKey] of toEvict) {
			sessionSearchCache.delete(evictKey);
		}
		statsDebug.info("Session search cache evicted oldest entries", { evicted: toEvict.length, remaining: sessionSearchCache.size });
	}
};

const writeSessionSearchCache = <T>(key: string, value: T) => {
	const now = Date.now();
	evictOldestSearchCacheEntries();
	sessionSearchCache.set(key, {
		value,
		cachedAt: now,
		lastAccessedAt: now,
		hits: 0,
		expiresAt: now + SESSION_SEARCH_CACHE_TTL_MS,
	});
	statsDebug.info("Session search cache populated", { key });
	persistSessionSearchCache();
	return value;
};

const withSessionSearchCache = async <T>(key: string, fetcher: () => Promise<T>) => {
	const cached = readSessionSearchCache<T>(key);
	if (cached !== undefined) return cached;

	statsDebug.info("Session search cache miss", { key });
	const value = await fetcher();
	return writeSessionSearchCache(key, value);
};

const loadSuppressions = () => {
	if (endpointSuppressions.size > 0) return;

	try {
		const raw = localStorage.getItem(ENDPOINT_SUPPRESSION_STORAGE_KEY);
		if (!raw) return;

		const parsed = JSON.parse(raw) as Record<string, SuppressedEndpoint>;
		const now = Date.now();
		let changed = false;
		for (const [key, value] of Object.entries(parsed)) {
			if (key.startsWith("search-") && value.status === 400) {
				changed = true;
				continue;
			}
			if (value.until > now) {
				endpointSuppressions.set(key, value);
				setSuppressionActivity(key, value);
			}
		}
		if (changed) persistSuppressions();
	} catch {
		localStorage.removeItem(ENDPOINT_SUPPRESSION_STORAGE_KEY);
	}
};

const persistSuppressions = () => {
	const now = Date.now();
	const entries = [...endpointSuppressions.entries()].filter(([, value]) => value.until > now);
	if (entries.length === 0) {
		localStorage.removeItem(ENDPOINT_SUPPRESSION_STORAGE_KEY);
		return;
	}

	localStorage.setItem(ENDPOINT_SUPPRESSION_STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
};

const getEndpointKey = (url: string) => {
	if (url.includes("/v1/me/top/artists")) return "me-top-artists";
	if (url.includes("/v1/me/top/tracks")) return "me-top-tracks";
	if (url.includes("/v1/audio-features")) return "audio-features";
	if (url.includes("/v1/artists?ids=")) return "artist-metas";
	if (url.includes("/v1/albums?ids=")) return "album-metas";
	if (url.includes("/v1/tracks?ids=")) return "track-metas";
	if (url.includes("/v1/search?") && url.includes("type=artist")) return "search-artist";
	if (url.includes("/v1/search?") && url.includes("type=album")) return "search-album";
	if (url.includes("/v1/search?") && url.includes("type=track")) return "search-track";
	if (url.includes("/v1/me/tracks/contains")) return "query-liked";
	if (url.includes("/v1/me/playlists")) return "user-playlists";
	if (url.includes("/v1/playlists/")) return "playlist-meta";
	return url.replace(/^https?:\/\/api\.spotify\.com\/v1\//, "").split("?")[0];
};

const getSuppressionDurationMs = (_endpointKey: string, status: number, retryAfterSeconds?: number) => {
	if (status === 429) {
		const retryAfterMs = retryAfterSeconds ? retryAfterSeconds * 1000 : DEFAULT_RATE_LIMIT_SUPPRESSION_MS;
		return Math.min(Math.max(retryAfterMs, MIN_RATE_LIMIT_SUPPRESSION_MS), SUPPRESSION_TTL_MS);
	}

	if (status === 403 || status === 400) {
		return SUPPRESSION_TTL_MS;
	}

	return Math.min(DEFAULT_SUPPRESSION_MS, SUPPRESSION_TTL_MS);
};

const buildSuppressedMessage = (endpointKey: string, suppression: SuppressedEndpoint) => {
	const secondsRemaining = Math.max(1, Math.ceil((suppression.until - Date.now()) / 1000));
	if (suppression.status === 429) {
		return `Spotify rate-limited ${endpointKey}. Skipping retries for ${secondsRemaining}s.`;
	}

	return `Spotify ${endpointKey} requests are temporarily disabled after repeated ${suppression.status} responses.`;
};

const createSuppressedError = (endpointKey: string, suppression: SuppressedEndpoint) => {
	const error = new Error(buildSuppressedMessage(endpointKey, suppression)) as Error & {
		status?: number;
		endpointKey?: string;
		suppressed?: boolean;
	};
	error.status = suppression.status;
	error.endpointKey = endpointKey;
	error.suppressed = true;
	return error;
};

const getActiveSuppression = (endpointKey: string) => {
	loadSuppressions();
	const suppression = endpointSuppressions.get(endpointKey);
	if (!suppression) return null;
	if (suppression.until <= Date.now()) {
		endpointSuppressions.delete(endpointKey);
		statsDebug.clearActivity(`suppression:${endpointKey}`);
		persistSuppressions();
		return null;
	}
	setSuppressionActivity(endpointKey, suppression);
	return suppression;
};

const suppressEndpoint = (endpointKey: string, status: number, reason: string, retryAfterSeconds?: number) => {
	const suppression = {
		status,
		reason,
		until: Date.now() + getSuppressionDurationMs(endpointKey, status, retryAfterSeconds),
	};
	endpointSuppressions.set(endpointKey, suppression);
	setSuppressionActivity(endpointKey, suppression);
	statsDebug.warn("Spotify endpoint suppressed", {
		endpointKey,
		status,
		reason,
		retryAfterSeconds,
		suppressedUntil: new Date(suppression.until).toISOString(),
	});
	persistSuppressions();
	return createSuppressedError(endpointKey, suppression);
};

const extractStatus = (error: unknown) => {
	if (!error || typeof error !== "object") {
		if (typeof error === "string") {
			const match = error.match(/\b(400|401|403|404|429)\b/);
			return match ? Number(match[1]) : undefined;
		}
		return undefined;
	}

	const e = error as Record<string, unknown>;
	if (typeof e.code === "number") return e.code;
	if (typeof e.status === "number") return e.status;
	if (typeof e.message === "string") {
		const match = e.message.match(/\b(400|401|403|404|429)\b/);
		return match ? Number(match[1]) : undefined;
	}
	return undefined;
};

const extractRetryAfterSeconds = (error: unknown) => {
	if (!error || typeof error !== "object") return undefined;
	const e = error as Record<string, unknown>;
	if (typeof e.retryAfter === "number") return e.retryAfter;
	if (typeof e.message === "string") {
		const match = e.message.match(/Retry after (\d+)/i);
		return match ? Number(match[1]) : undefined;
	}
	return undefined;
};

/** Extract a human-readable message from Error instances or structured {message} objects */
const extractErrorMessage = (error: unknown): string => {
	if (error instanceof Error) return error.message;
	if (error && typeof error === "object" && "message" in error) {
		return String((error as { message: unknown }).message);
	}
	return String(error);
};

export const clearSpotifyRequestSuppressions = () => {
	for (const endpointKey of endpointSuppressions.keys()) {
		statsDebug.clearActivity(`suppression:${endpointKey}`);
	}
	endpointSuppressions.clear();
	localStorage.removeItem(ENDPOINT_SUPPRESSION_STORAGE_KEY);
	statsDebug.info("Cleared Spotify request suppressions");
};

export const isSuppressedSpotifyError = (error: unknown): boolean => {
	if (!error || typeof error !== "object") return false;
	return Boolean((error as { suppressed?: boolean }).suppressed);
};

// Helper to detect rate limit errors from CosmosAsync exceptions
const isRateLimitError = (error: unknown): boolean => {
	if (!error || typeof error !== "object") return false;
	const e = error as Record<string, unknown>;
	return (
		e.code === 429 ||
		e.status === 429 ||
		(typeof e.message === "string" && e.message.includes("429"))
	);
};

const isSpotifyApiUrl = (url: string) => url.startsWith(SPOTIFY_API_BASE_URL);

const externalFetch = async <T>(url: string): Promise<T> => {
	const response = await fetchWithRetry(url, {
		headers: {
			Accept: "application/json",
		},
	}, { logger: statsDebug });

	if (!response.ok) {
		const retryAfter = response.headers.get("Retry-After");
		statsDebug.warn("External request failed", {
			url,
			status: response.status,
			retryAfter,
		});
		const trimmed = retryAfter?.trim();
		const retryAfterSeconds = trimmed ? Number(trimmed) : NaN;
		throw {
			code: response.status,
			retryAfter: Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0 ? retryAfterSeconds : undefined,
			message: response.statusText,
		};
	}

	return response.json();
};

/**
 * Try using the internal Spotify client token with direct fetch.
 * This may bypass CosmosAsync middleware rate limiting.
 */
const directFetch = async <T>(url: string): Promise<T> => {
	const token = Spicetify.Platform?.AuthorizationAPI?.getState?.()?.token?.accessToken;
	if (!token) {
		statsDebug.warn("Direct fetch unavailable because no internal token was found");
		throw new Error("No internal token available");
	}

	const response = await fetchWithRetry(url, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	}, { logger: statsDebug });

	if (response.status === 429) {
		const retryAfter = response.headers.get("Retry-After");
		statsDebug.warn("Direct Spotify fetch rate-limited", {
			url,
			retryAfter,
		});
		const trimmed = retryAfter?.trim();
		const retryAfterSeconds = trimmed ? Number(trimmed) : NaN;
		const isValidRetryAfter = Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0;
		throw {
			code: 429,
			retryAfter: isValidRetryAfter ? retryAfterSeconds : undefined,
			message: isValidRetryAfter
				? `Rate limited. Retry after ${retryAfterSeconds} seconds`
				: "Rate limited. Retry after unknown delay",
		};
	}

	if (!response.ok) {
		statsDebug.warn("Direct Spotify fetch failed", {
			url,
			status: response.status,
			message: response.statusText,
		});
		throw { code: response.status, message: response.statusText };
	}

	return response.json();
};

/**
 * Attempt an OAuth token refresh and retry the request once.
 * Returns the response data on success, or null if refresh/retry is
 * not possible or fails.
 */
const attemptOAuthRefreshAndRetry = async <T>(name: string, url: string): Promise<T | null> => {
	if (!isOAuthEnabled()) return null;
	try {
		statsDebug.info("Attempting OAuth token refresh and retry after 401", { name, url });
		const freshToken = await getAccessToken();
		if (!freshToken) return null;

		// Use fetchWithRetry directly instead of oauthFetch to avoid redundant
		// refresh cascading — oauthFetch has its own internal 401 handler that
		// would trigger additional token refreshes and retries.
		const response = await fetchWithRetry(url, {
			headers: {
				Authorization: `Bearer ${freshToken}`,
			},
		});

		if (!response.ok) {
			statsDebug.warn("OAuth refresh-and-retry request failed", {
				name,
				url,
				status: response.status,
			});
			return null;
		}

		return await response.json() as T;
	} catch (retryError) {
		const errorMessage = extractErrorMessage(retryError);
		statsDebug.warn("OAuth token refresh and retry failed", {
			name,
			url,
			error: errorMessage,
		});
		return null;
	}
};

/**
 * Core API fetch function.
 * Priority: OAuth > Direct Fetch > CosmosAsync
 *
 * On 401 Unauthorized from any path, the function attempts an OAuth
 * token refresh and retries the request once before giving up.
 */
export const apiFetch = async <T>(name: string, url: string, log = true): Promise<T> => {
	if (!isSpotifyApiUrl(url)) {
		const cached = readExternalCache<T>(url);
		if (cached !== undefined) {
			if (log) debugLog("stats -", name, "served from external fetch cache");
			return cached;
		}
		// Deduplicate concurrent in-flight requests for the same URL
		const pending = externalInflight.get(url);
		if (pending) return pending as Promise<T>;

		const timeStart = window.performance.now();
		const promise = externalFetch<T>(url).then(
			(data) => { externalInflight.delete(url); if (log) debugLog("stats -", name, "fetch time:", window.performance.now() - timeStart); return writeExternalCache(url, data); },
			(err) => { externalInflight.delete(url); throw err; },
		);
		externalInflight.set(url, promise);
		return promise;
	}

	const endpointKey = getEndpointKey(url);
	const activeSuppression = getActiveSuppression(endpointKey);
	if (activeSuppression) {
		statsDebug.info("Skipping suppressed Spotify endpoint", {
			endpointKey,
			url,
			suppressedUntil: new Date(activeSuppression.until).toISOString(),
		});
		throw createSuppressedError(endpointKey, activeSuppression);
	}

	// Use OAuth if enabled and connected
	if (isOAuthEnabled() && hasValidTokens()) {
		try {
			const timeStart = window.performance.now();
			const response = await oauthFetch<T>(url);
			if (log) debugLog("stats -", name, "fetch time (OAuth):", window.performance.now() - timeStart);
			return response;
		} catch (error) {
			const status = extractStatus(error);
			if (status === 400 || status === 403 || status === 429) {
				throw suppressEndpoint(endpointKey, status, name, extractRetryAfterSeconds(error));
			}
			// H-4: On 401 (or token-expired errors that oauthFetch could not
			// recover from internally), attempt one more refresh + retry before
			// falling through to the direct-fetch / CosmosAsync paths.
			if (status === 401) {
				const retryResult = await attemptOAuthRefreshAndRetry<T>(name, url);
				if (retryResult !== null) return retryResult;
				statsDebug.warn("OAuth 401 unrecoverable, falling through to alternative fetch paths", { name, url });
				// Fall through to direct fetch / CosmosAsync
			} else {
				statsDebug.warn("OAuth fetch failed", {
					name,
					url,
					status,
					error: extractErrorMessage(error),
				});
				throw error;
			}
		}
	}

	// Try direct fetch with internal token first (may bypass CosmosAsync rate limits)
	const useDirectFetch = globalThis.SpicetifyStats?.ConfigWrapper?.Config?.["use-direct-fetch"] ?? false;
	if (useDirectFetch && Spicetify.Platform?.AuthorizationAPI) {
		try {
			const timeStart = window.performance.now();
			const response = await directFetch<T>(url);
			if (log) debugLog("stats -", name, "fetch time (direct):", window.performance.now() - timeStart);
			return response;
		} catch (error) {
			const status = extractStatus(error);
			if (status === 400 || status === 403 || status === 429) {
				throw suppressEndpoint(endpointKey, status, name, extractRetryAfterSeconds(error));
			}
			// H-4: On 401 from direct fetch, attempt OAuth token refresh and retry
			if (status === 401) {
				const retryResult = await attemptOAuthRefreshAndRetry<T>(name, url);
				if (retryResult !== null) return retryResult;
				statsDebug.warn("Direct fetch 401 unrecoverable via OAuth, falling through to CosmosAsync", { name, url });
			}
			statsDebug.warn("Direct fetch failed; falling back to CosmosAsync", {
				name,
				url,
				status,
				error: extractErrorMessage(error),
			});
			debugLog("stats -", name, "direct fetch failed, falling back to CosmosAsync:", error);
			// Fall through to CosmosAsync
		}
	}

	// Fall back to CosmosAsync
	try {
		const timeStart = window.performance.now();
		const response = await Spicetify.CosmosAsync.get(url);

		if (response.code === 429) {
			throw suppressEndpoint(endpointKey, 429, name);
		}

		if (response.code === 400 || response.code === 403) {
			throw suppressEndpoint(endpointKey, response.code, name);
		}

		if (response.code || response.error)
			throw new Error(
				`Failed to fetch the info from server. Try again later. ${name.includes("lfm") ? "Check your LFM API key and username." : ""}`,
			);
		if (log) debugLog("stats -", name, "fetch time:", window.performance.now() - timeStart);
		return response;
	} catch (error) {
		const status = extractStatus(error);
		if (status === 400 || status === 403 || status === 429 || isRateLimitError(error)) {
			throw suppressEndpoint(endpointKey, status ?? 429, name, extractRetryAfterSeconds(error));
		}
		// H-4: On 401 from CosmosAsync, attempt OAuth token refresh and retry
		if (status === 401) {
			const retryResult = await attemptOAuthRefreshAndRetry<T>(name, url);
			if (retryResult !== null) return retryResult;
		}
		statsDebug.error("Spotify request failed", {
			name,
			url,
			status,
			error: extractErrorMessage(error),
		});
		debugLog("stats -", name, "request failed:", error);
		throw error as Error;
	}
};

const val = <T>(res: T | undefined) => {
	if (!res || (Array.isArray(res) && !res.length))
		throw new Error("Spotify returned an empty result. Try again later.");
	return res;
};

export const getTopTracks = async (range: Spotify.SpotifyRange) => {
	const res = await apiFetch<Spotify.TopTracksResponse>(
		"topTracks",
		`https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0&time_range=${range}`,
	);
	return val(res.items);
};

export const getTopArtists = async (range: Spotify.SpotifyRange) => {
	const res = await apiFetch<Spotify.TopArtistsResponse>(
		"topArtists",
		`https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=${range}`,
	);
	return val(res.items);
};

/**
 * @param ids - max: 50
 */
export const getArtistMetas = async (ids: string[]) => {
	const res = await apiFetch<Spotify.SeveralArtistsResponse>("artistMetas", `https://api.spotify.com/v1/artists?ids=${ids}`);
	return res.artists;
};

export const getAlbumMetas = async (ids: string[]) => {
	const res = await apiFetch<Spotify.SeveralAlbumsResponse>("albumMetas", `https://api.spotify.com/v1/albums?ids=${ids}`);
	return res.albums;
};

export const getTrackMetas = async (ids: string[]) => {
	const res = await apiFetch<Spotify.SeveralTracksResponse>("trackMetas", `https://api.spotify.com/v1/tracks?ids=${ids}`);
	return res.tracks;
};

export const getAudioFeatures = async (ids: string[]) => {
	const res = await apiFetch<Spotify.SeveralAudioFeaturesResponse>(
		"audioFeatures",
		`https://api.spotify.com/v1/audio-features?ids=${ids}`,
	);
	return res.audio_features;
};

export const searchForTrack = async (track: string, artist: string) => {
	const q = encodeURIComponent(`track:${track.replace(/'/g, "")} artist:${artist.replace(/'/g, "")}`);
	const cacheKey = getSessionSearchCacheKey("search-track", [track, artist]);
	return withSessionSearchCache(cacheKey, async () => {
		const res = await apiFetch<Spotify.SearchResponse>(
			"searchForTrack",
			`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1&market=from_token`,
		);
		return res.tracks.items;
	});
};

export const searchForArtist = async (artist: string) => {
	const q = encodeURIComponent(`artist:${artist.replace(/'/g, "")}`);
	const cacheKey = getSessionSearchCacheKey("search-artist", [artist]);
	return withSessionSearchCache(cacheKey, async () => {
		const res = await apiFetch<Spotify.SearchResponse>(
			"searchForArtist",
			`https://api.spotify.com/v1/search?q=${q}&type=artist&limit=1&market=from_token`,
		);
		return res.artists.items;
	});
};

export const searchForAlbum = async (album: string, artist: string) => {
	const q = encodeURIComponent(`album:${album.replace(/'/g, "")} artist:${artist.replace(/'/g, "")}`);
	const cacheKey = getSessionSearchCacheKey("search-album", [album, artist]);
	return withSessionSearchCache(cacheKey, async () => {
		const res = await apiFetch<Spotify.SearchResponse>(
			"searchForAlbum",
			`https://api.spotify.com/v1/search?q=${q}&type=album&limit=1&market=from_token`,
		);
		return res.albums.items;
	});
};

export const queryLiked = async (ids: string[]) => {
	return apiFetch<boolean[]>("queryLiked", `https://api.spotify.com/v1/me/tracks/contains?ids=${ids}`);
};

export const getPlaylistMeta = async (id: string) => {
	return apiFetch<Spotify.PlaylistResponse>("playlistMeta", `https://api.spotify.com/v1/playlists/${id}`);
};

export const getUserPlaylists = async () => {
	const res = await apiFetch<Spotify.UserPlaylistsResponse>("userPlaylists", "https://api.spotify.com/v1/me/playlists");
	return res.items;
};
