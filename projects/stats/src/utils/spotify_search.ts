import { searchForTrack, searchForArtist, isSuppressedSpotifyError } from "../api/spotify";

const COSMOS_CACHE_TTL_MS = 30 * 60 * 1000;
const COSMOS_CACHE_MAX_SIZE = 200;
const cosmosCache = new Map<string, { uri: string; ts: number }>();

/** Evict expired entries and enforce max size when inserting. */
function cosmosCacheSet(key: string, value: { uri: string; ts: number }): void {
	// Evict expired entries first
	const now = Date.now();
	for (const [k, v] of cosmosCache) {
		if (now - v.ts >= COSMOS_CACHE_TTL_MS) cosmosCache.delete(k);
	}
	// If still at capacity, remove the oldest entry by timestamp
	if (cosmosCache.size >= COSMOS_CACHE_MAX_SIZE) {
		let oldestKey: string | undefined;
		let oldestTs = Infinity;
		for (const [k, v] of cosmosCache) {
			if (v.ts < oldestTs) {
				oldestTs = v.ts;
				oldestKey = k;
			}
		}
		if (oldestKey !== undefined) cosmosCache.delete(oldestKey);
	}
	cosmosCache.set(key, value);
}

function getCosmosCached(key: string): string | undefined {
	const entry = cosmosCache.get(key);
	if (!entry) return undefined;
	if (Date.now() - entry.ts < COSMOS_CACHE_TTL_MS) return entry.uri;
	cosmosCache.delete(key);
	return undefined;
}

async function cosmosFallbackSearch(
	type: "artist" | "track",
	name: string,
	artistName?: string,
): Promise<string | undefined> {
	const cacheKey = `${type}:${name}:${artistName ?? ""}`;
	const cached = getCosmosCached(cacheKey);
	if (cached) return cached;

	const q =
		type === "track"
			? `track:${name.replace(/'/g, "")} artist:${(artistName ?? "").replace(/'/g, "")}`
			: `artist:${name.replace(/'/g, "")}`;
	const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type}&limit=1&market=from_token`;

	const res = await Spicetify.CosmosAsync.get(url);

	// CosmosAsync may return rate limit responses as data rather than throwing
	if (res?.code === 429 || res?.status === 429) {
		const err = new Error("Rate limited") as Error & { status?: number; suppressed?: boolean };
		err.status = 429;
		err.suppressed = true;
		throw err;
	}

	const items = type === "track" ? res?.tracks?.items : res?.artists?.items;
	const uri: string | undefined = items?.[0]?.uri;

	if (uri) {
		cosmosCacheSet(cacheKey, { uri, ts: Date.now() });
	}
	return uri;
}

function navigateToUri(type: "artist" | "track", uri: string): void {
	const id = uri.split(":")[2];
	Spicetify.Platform.History.push(`/${type}/${id}`);
}

export async function searchAndNavigate(
	type: "artist" | "track",
	name: string,
	fallbackUrl: string,
	artistName?: string,
): Promise<void> {
	// Try the normal apiFetch-based search first
	try {
		let uri: string | undefined;
		if (type === "track") {
			const items = await searchForTrack(name, artistName ?? "");
			uri = items?.[0]?.uri;
		} else {
			const items = await searchForArtist(name);
			uri = items?.[0]?.uri;
		}
		if (uri) {
			navigateToUri(type, uri);
			return;
		}
	} catch (error: unknown) {
		// If the endpoint is suppressed (e.g. from prior 429s), fall back to CosmosAsync
		if (isSuppressedSpotifyError(error)) {
			try {
				const uri = await cosmosFallbackSearch(type, name, artistName);
				if (uri) {
					navigateToUri(type, uri);
					return;
				}
			} catch {
				// CosmosAsync also failed — fall through to external URL
			}
		}
	}
	// window.open is called after async operations. In standard web browsers this risks
	// losing user-gesture context (popup blockers). This function runs exclusively in
	// Spotify's Electron shell, where gesture-based popup blocking is not enforced, so
	// the behaviour is safe. If this code is ever adapted for a web context, switch to
	// opening a blank window synchronously before the first await and setting its
	// location here, or return the fallbackUrl to the caller to open synchronously.
	window.open(fallbackUrl, "_blank", "noopener,noreferrer");
}

/**
 * Resolve a Spotify track URI for a track name + artist.
 * Returns the URI string or undefined if not found.
 * Uses in-memory cache to avoid redundant API calls.
 *
 * Throws on rate limit / suppression errors so callers can stop retrying.
 */
export async function resolveTrackUri(
	trackName: string,
	artistName: string,
): Promise<string | undefined> {
	// Check cache first
	const cacheKey = `track:${trackName}:${artistName}`;
	const cached = getCosmosCached(cacheKey);
	if (cached) return cached;

	// Try apiFetch-based search
	try {
		const items = await searchForTrack(trackName, artistName);
		const uri = items?.[0]?.uri;
		if (uri) {
			cosmosCacheSet(cacheKey, { uri, ts: Date.now() });
			return uri;
		}
	} catch (error: unknown) {
		if (isSuppressedSpotifyError(error)) {
			// Propagate suppression to caller so it can stop the loop
			throw error;
		}
		// Other errors: just return undefined
	}
	return undefined;
}
