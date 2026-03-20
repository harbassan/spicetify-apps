import type * as Spotify from "../types/spotify";
import { statsDebug } from "../extensions/debug";

const MAX_RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BASE_DELAY_MS = 1000;
const RATE_LIMIT_MAX_DELAY_MS = 15000;

export const BYPASS_CLIENT_ID = "edd26169edf844db89a92b56cbb54b85";
export const BYPASS_REDIRECT_URI = "https://huangdarren1106.github.io/callback";
export const BYPASS_AUTH_URL = `https://auth.musicpiechart.com/auth/login?redirect_to=${BYPASS_REDIRECT_URI}`;

const OAUTH_BUNDLE_KEY = "stats:oauth:bundle";
const OAUTH_PKCE_KEY = "stats:oauth:pkce";
const OAUTH_SCOPE = [
	"user-top-read",
	"user-library-read",
	"playlist-read-private",
	"playlist-read-collaborative",
].join(" ");

type OAuthBundle = {
	accessToken: string;
	refreshToken: string | null;
	expiresAt: number;
	scope?: string;
	tokenType?: string;
};

type PkcePayload = {
	state: string;
	codeVerifier: string;
	createdAt: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const base64UrlEncode = (input: Uint8Array): string => {
	let str = "";
	for (const byte of input) str += String.fromCharCode(byte);
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const randomString = (bytes = 32): string => {
	const arr = new Uint8Array(bytes);
	crypto.getRandomValues(arr);
	return base64UrlEncode(arr);
};

const sha256 = async (value: string): Promise<Uint8Array> => {
	const data = new TextEncoder().encode(value);
	const digest = await crypto.subtle.digest("SHA-256", data);
	return new Uint8Array(digest);
};

const parseOAuthParams = (input: string): URLSearchParams => {
	const trimmed = input.trim();
	const hashPart = trimmed.split("#")[1] ?? "";
	const queryPart = hashPart || trimmed.split("?")[1] || "";
	return new URLSearchParams(queryPart);
};

const toExpiresAt = (expiresInSec?: number): number => {
	const sec = typeof expiresInSec === "number" && Number.isFinite(expiresInSec) ? expiresInSec : 3600;
	const skew = 60;
	return Date.now() + Math.max(sec - skew, 60) * 1000;
};

const saveAccessTokenCompat = (token: string): void => {
	localStorage.setItem("stats:config:oauth-token", JSON.stringify(token));
};

const readOAuthBundle = (): OAuthBundle | null => {
	try {
		const raw = localStorage.getItem(OAUTH_BUNDLE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<OAuthBundle>;
		if (!parsed || typeof parsed.accessToken !== "string" || typeof parsed.expiresAt !== "number") return null;
		return {
			accessToken: parsed.accessToken,
			refreshToken: typeof parsed.refreshToken === "string" ? parsed.refreshToken : null,
			expiresAt: parsed.expiresAt,
			scope: parsed.scope,
			tokenType: parsed.tokenType,
		};
	} catch {
		return null;
	}
};

const writeOAuthBundle = (bundle: OAuthBundle): void => {
	localStorage.setItem(OAUTH_BUNDLE_KEY, JSON.stringify(bundle));
};

const readPkcePayload = (): PkcePayload | null => {
	try {
		const raw = localStorage.getItem(OAUTH_PKCE_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<PkcePayload>;
		if (!parsed || typeof parsed.codeVerifier !== "string" || typeof parsed.state !== "string") return null;
		return {
			state: parsed.state,
			codeVerifier: parsed.codeVerifier,
			createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
		};
	} catch {
		return null;
	}
};

const writePkcePayload = (payload: PkcePayload): void => {
	localStorage.setItem(OAUTH_PKCE_KEY, JSON.stringify(payload));
};

const clearPkcePayload = (): void => {
	localStorage.removeItem(OAUTH_PKCE_KEY);
};

const exchangeCodeForTokens = async (code: string, state?: string): Promise<OAuthBundle | null> => {
	const pkce = readPkcePayload();
	if (!pkce) return null;
	if (state && state !== pkce.state) return null;

	const body = new URLSearchParams({
		client_id: BYPASS_CLIENT_ID,
		grant_type: "authorization_code",
		code,
		redirect_uri: BYPASS_REDIRECT_URI,
		code_verifier: pkce.codeVerifier,
	});

	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body,
	});

	if (!response.ok) return null;

	const payload = (await response.json()) as {
		access_token?: string;
		refresh_token?: string;
		expires_in?: number;
		scope?: string;
		token_type?: string;
	};

	if (!payload.access_token) return null;

	const bundle: OAuthBundle = {
		accessToken: payload.access_token,
		refreshToken: payload.refresh_token ?? null,
		expiresAt: toExpiresAt(payload.expires_in),
		scope: payload.scope,
		tokenType: payload.token_type,
	};

	writeOAuthBundle(bundle);
	saveAccessTokenCompat(bundle.accessToken);
	clearPkcePayload();
	return bundle;
};

const ensureExternalAccessToken = (): string | null => {
	const bundle = readOAuthBundle();
	if (!bundle) return null;

	if (bundle.expiresAt > Date.now()) return bundle.accessToken;
	clearExternalToken();
	return null;
};

const hasExternalAuth = (): boolean => Boolean(readOAuthBundle());

export const beginExternalOAuth = (): void => {
	window.open(BYPASS_AUTH_URL, "spotify-auth", "width=800,height=600");
};

export const extractAccessToken = (input: string): string | null => {
	const trimmed = input.trim();
	if (trimmed.length <= 20) return null;
	if (!trimmed.includes("access_token=")) return trimmed;

	try {
		const hashPart = trimmed.split("#")[1] ?? "";
		const queryPart = hashPart || trimmed.split("?")[1] || "";
		const params = new URLSearchParams(queryPart);
		const token = params.get("access_token");
		return token && token.length > 20 ? token : null;
	} catch {
		return null;
	}
};

export const setExternalToken = async (input: string): Promise<boolean> => {
	const params = parseOAuthParams(input);
	const code = params.get("code");
	const state = params.get("state") ?? undefined;

	if (code) {
		const exchanged = await exchangeCodeForTokens(code, state);
		return Boolean(exchanged);
	}

	if (params.get("error")) return false;

	const token = extractAccessToken(input);
	if (!token) return false;

	const expiresIn = params.get("expires_in");
	const refreshToken = params.get("refresh_token");
	try {
		writeOAuthBundle({
			accessToken: token,
			refreshToken: refreshToken || null,
			expiresAt: toExpiresAt(expiresIn ? Number(expiresIn) : undefined),
		});
		saveAccessTokenCompat(token);
		return true;
	} catch {
		return false;
	}
};

// Get the current user's access token.
// Prefers an external OAuth token (stored in settings) which uses a separate
// Spotify app client_id -> separate rate limit bucket from CosmosAsync.
const getExternalToken = (): string | null => {
	const bundle = readOAuthBundle();
	if (bundle?.accessToken) return bundle.accessToken;

	try {
		const raw = localStorage.getItem("stats:config:oauth-token");
		if (!raw) return null;
		const value = JSON.parse(raw) as unknown;
		if (typeof value !== "string") return null;
		const token = extractAccessToken(value);
		if (!token) return null;
		writeOAuthBundle({ accessToken: token, refreshToken: null, expiresAt: toExpiresAt(3600) });
		saveAccessTokenCompat(token);
		return token;
	} catch {
		return null;
	}
};

const clearExternalToken = (): void => {
	try {
		localStorage.removeItem(OAUTH_BUNDLE_KEY);
		localStorage.removeItem(OAUTH_PKCE_KEY);
		localStorage.removeItem("stats:config:oauth-token");
		statsDebug.warn("External OAuth token expired and cleared. Get a new one from Settings > Rate Limit Bypass.", {});
		console.warn("[stats] External OAuth token was invalid/expired and has been cleared.");
	} catch { /* ignore */ }
};

type CosmosErrorLike = { code?: number; status?: number; message?: string; error?: { status?: number; message?: string } | string };

const getCosmosStatus = (error: unknown): number => {
	const e = error as CosmosErrorLike;
	const direct = Number(e?.status ?? e?.code ?? 0);
	if (direct > 0) return direct;
	const nested = typeof e?.error === "object" && e.error ? Number(e.error.status ?? 0) : 0;
	if (nested > 0) return nested;
	const msg = (e?.message ?? "").toLowerCase();
	if (msg.includes("429")) return 429;
	if (msg.includes("401")) return 401;
	return 0;
};

const tryCosmosSpotifyGet = async <T>(url: string): Promise<{ ok: true; data: T } | { ok: false; status: number }> => {
	try {
		const response = await Spicetify.CosmosAsync.get(url) as T & CosmosErrorLike;
		if (response && (response.code || response.error)) {
			return { ok: false, status: getCosmosStatus(response) };
		}
		return { ok: true, data: response as T };
	} catch (error) {
		return { ok: false, status: getCosmosStatus(error) };
	}
};

export const apiFetch = async <T>(name: string, url: string, log = true): Promise<T> => {
	const requestKey = `${name}:${url}`;
	statsDebug.info(`Request started: ${name}`, { url });

	for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
		try {
			const timeStart = window.performance.now();
			const isSpotifyApi = url.includes("api.spotify.com");

			if (isSpotifyApi) {
				const cosmos = await tryCosmosSpotifyGet<T>(url);
				if (cosmos.ok) {
					statsDebug.clearRetry(requestKey);
					statsDebug.info(`Request succeeded via Cosmos: ${name}`, {
						url,
						durationMs: Math.round(window.performance.now() - timeStart),
					});
					if (log) console.log("stats -", name, "fetch time:", window.performance.now() - timeStart);
					return cosmos.data;
				}

				if (cosmos.status !== 429 && cosmos.status !== 401) {
					statsDebug.clearRetry(requestKey);
					throw new Error(
						`Failed to fetch the info from server (status ${cosmos.status || "unknown"}). Try again later. ${name.includes("lfm") ? "Check your LFM API key and username." : ""}`.trim(),
					);
				}
			}

			const headers: Record<string, string> = { "Content-Type": "application/json" };
			if (isSpotifyApi) {
				const bypass = ensureExternalAccessToken();
				if (!bypass) {
					statsDebug.clearRetry(requestKey);
					throw new Error("Failed to fetch the info from server (status 401). Please login with Spotify again.");
				}
				headers["Authorization"] = `Bearer ${bypass}`;
			}

			const httpResponse = await fetch(url, { headers });

			const retryAfterHeader = httpResponse.headers.get("retry-after");
			const status = httpResponse.status;

			if (status === 429) {
				if (attempt < MAX_RATE_LIMIT_RETRIES) {
					const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : 0;
					const delay = retryAfterSec > 0
						? Math.min(retryAfterSec * 1000, RATE_LIMIT_MAX_DELAY_MS)
						: Math.min(RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt, RATE_LIMIT_MAX_DELAY_MS);
					statsDebug.setRetry({
						key: requestKey,
						name,
						url,
						attempt: attempt + 1,
						maxRetries: MAX_RATE_LIMIT_RETRIES,
						delayMs: delay,
						retryAt: Date.now() + delay,
						message: `Retry-After: ${retryAfterHeader ?? "none"}`,
					});
					statsDebug.warn(`Rate limited: ${name}. Retrying in ${delay}ms`, {
						url,
						attempt: attempt + 1,
						retryAfterHeader,
					});
					console.warn("stats -", name, `rate limited (429), retrying in ${delay}ms`);
					await sleep(delay);
					continue;
				}
				statsDebug.clearRetry(requestKey);
				statsDebug.error(`Rate limit exhausted: ${name}`, { url });
				throw new Error("Failed to fetch the info from server (status 429). Try again later.");
			}

			if (!httpResponse.ok) {
				if (httpResponse.status === 401 && hasExternalAuth()) {
					clearExternalToken();
					statsDebug.clearRetry(requestKey);
					throw new Error("Failed to fetch the info from server (status 401). Please login with Spotify again.");
				}
				const errorBody = await httpResponse.json().catch(() => ({})) as { error?: { message?: string } };
				const message = errorBody?.error?.message || `status ${httpResponse.status}`;
				statsDebug.clearRetry(requestKey);
				statsDebug.error(`Request failed: ${name}`, { url, status: httpResponse.status, message });
				throw new Error(
					`Failed to fetch the info from server (status ${httpResponse.status}). Try again later. ${name.includes("lfm") ? "Check your LFM API key and username." : ""}`.trim(),
				);
			}

			const data = (await httpResponse.json()) as T;
			statsDebug.clearRetry(requestKey);
			statsDebug.info(`Request succeeded: ${name}`, {
				url,
				durationMs: Math.round(window.performance.now() - timeStart),
			});
			if (log) console.log("stats -", name, "fetch time:", window.performance.now() - timeStart);
			return data;

		} catch (error) {
			// Rethrow errors we deliberately threw (terminal errors, not network glitches)
			if (error instanceof Error && (
				error.message.startsWith("Failed to fetch the info") ||
				error.message.startsWith("Spotify access token") ||
				error.message.startsWith("Spotify returned")
			)) {
				throw error;
			}
			// Network / unexpected error — retry with backoff
			if (attempt < MAX_RATE_LIMIT_RETRIES) {
				const delay = Math.min(RATE_LIMIT_BASE_DELAY_MS * 2 ** attempt, RATE_LIMIT_MAX_DELAY_MS);
				console.warn("stats -", name, "network error, retrying in", delay, "ms:", error);
				await sleep(delay);
				continue;
			}
			statsDebug.clearRetry(requestKey);
			statsDebug.error(`Request failed: ${name}`, { url, error });
			throw error;
		}
	}

	statsDebug.clearRetry(requestKey);
	statsDebug.error(`Request failed: ${name}`, { url, status: 429, reason: "retry limit reached" });
	throw new Error("Failed to fetch the info from server (status 429). Try again later.");
};

const val = <T>(res: T | undefined) => {
	if (!res || (Array.isArray(res) && !res.length))
		throw new Error("Spotify returned an empty result. Try again later.");
	return res;
};

const f = (param: string) => {
	return encodeURIComponent(param.replace(/'/g, ""));
};

export const getTopTracks = (range: Spotify.SpotifyRange) => {
	return apiFetch<Spotify.TopTracksResponse>(
		"topTracks",
		`https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0&time_range=${range}`,
	).then((res) => val(res.items));
};

export const getTopArtists = (range: Spotify.SpotifyRange) => {
	return apiFetch<Spotify.TopArtistsResponse>(
		"topArtists",
		`https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=${range}`,
	).then((res) => val(res.items));
};

/**
 * @param ids - max: 50
 */
export const getArtistMetas = (ids: string[]) => {
	return apiFetch<Spotify.SeveralArtistsResponse>("artistMetas", `https://api.spotify.com/v1/artists?ids=${ids}`).then(
		(res) => res.artists,
	);
};

export const getAlbumMetas = (ids: string[]) => {
	return apiFetch<Spotify.SeveralAlbumsResponse>("albumMetas", `https://api.spotify.com/v1/albums?ids=${ids}`).then(
		(res) => res.albums,
	);
};

export const getTrackMetas = (ids: string[]) => {
	return apiFetch<Spotify.SeveralTracksResponse>("trackMetas", `https://api.spotify.com/v1/tracks?ids=${ids}`).then(
		(res) => res.tracks,
	);
};

export const getAudioFeatures = (ids: string[]) => {
	return apiFetch<Spotify.SeveralAudioFeaturesResponse>(
		"audioFeatures",
		`https://api.spotify.com/v1/audio-features?ids=${ids}`,
	).then((res) => res.audio_features);
};

export const searchForTrack = (track: string, artist: string) => {
	return apiFetch<Spotify.SearchResponse>(
		"searchForTrack",
		`https://api.spotify.com/v1/search?q=track:${f(track)}+artist:${f(artist)}&type=track&limit=50`,
	).then((res) => res.tracks.items);
};

export const searchForArtist = (artist: string) => {
	return apiFetch<Spotify.SearchResponse>(
		"searchForArtist",
		`https://api.spotify.com/v1/search?q=artist:${f(artist)}&type=artist&limit=50`,
	).then((res) => res.artists.items);
};

export const searchForAlbum = (album: string, artist: string) => {
	return apiFetch<Spotify.SearchResponse>(
		"searchForAlbum",
		`https://api.spotify.com/v1/search?q=album:${f(album)}+artist:${f(artist)}&type=album&limit=50`,
	).then((res) => res.albums.items);
};

export const queryLiked = (ids: string[]) => {
	return apiFetch<boolean[]>("queryLiked", `https://api.spotify.com/v1/me/tracks/contains?ids=${ids}`);
};

export const getPlaylistMeta = (id: string) => {
	return apiFetch<Spotify.PlaylistResponse>("playlistMeta", `https://api.spotify.com/v1/playlists/${id}`);
};

export const getUserPlaylists = () => {
	return apiFetch<Spotify.UserPlaylistsResponse>("userPlaylists", "https://api.spotify.com/v1/me/playlists").then(
		(res) => res.items,
	);
};
