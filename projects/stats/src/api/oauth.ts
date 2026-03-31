/**
 * OAuth PKCE flow for Spotify Web API.
 * Allows users to authenticate with their own Spotify Developer App
 * to bypass rate limits on CosmosAsync.
 *
 * Setup:
 * 1. Go to https://developer.spotify.com/dashboard
 * 2. Create a new app
 * 3. Add redirect URI: http://127.0.0.1:5173/callback
 * 4. Copy the Client ID to Stats settings
 *
 * Security / threat-model notes:
 * - Tokens (access_token, refresh_token) are stored in localStorage so they
 *   persist across Spotify restarts. This is acceptable because Spicetify runs
 *   inside the trusted Spotify desktop client process — localStorage is not
 *   exposed to third-party web content or external XSS vectors.
 * - Ephemeral auth-flow values (PKCE code_verifier, OAuth state) are stored in
 *   sessionStorage because they are only needed during a single auth flow and
 *   should not survive across sessions.
 */

import { fetchWithRetry } from "../utils/fetch-with-retry";

class OAuthError extends Error {
	code: number;
	constructor(code: number, message: string) {
		super(message);
		this.name = "OAuthError";
		this.code = code;
	}
}

const STORAGE_PREFIX = "stats:oauth:";
const REDIRECT_URI = "http://127.0.0.1:5173/callback";
const SCOPES = [
	"user-top-read",
	"user-read-recently-played",
	"user-library-read",
].join(" ");

// Persistent token storage keys (localStorage)
const KEYS = {
	accessToken: `${STORAGE_PREFIX}access_token`,
	refreshToken: `${STORAGE_PREFIX}refresh_token`,
	expiresAt: `${STORAGE_PREFIX}expires_at`,
};

// Ephemeral auth-flow storage keys (sessionStorage)
const SESSION_KEYS = {
	codeVerifier: `${STORAGE_PREFIX}code_verifier`,
	oauthState: `${STORAGE_PREFIX}oauth_state`,
};

// Module-level guard to prevent concurrent token refresh requests (C-2).
// When a refresh is in flight, subsequent callers await the same promise
// instead of firing a second request with the now-invalidated refresh token.
let refreshPromise: Promise<void> | null = null;

function getConfigValue<T>(key: string): T | null {
	const value = localStorage.getItem(`stats:config:${key}`);
	if (value === null) return null;

	try {
		return JSON.parse(value) as T;
	} catch {
		return value as T;
	}
}

/**
 * Generate a cryptographically random string.
 * Uses crypto.getRandomValues() for secure randomness (not Math.random()).
 */
function generateRandomString(length: number): string {
	const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
	const randomValues = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(randomValues, (v) => possible[v % possible.length]).join("");
}

/**
 * SHA256 hash for PKCE code challenge
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return crypto.subtle.digest("SHA-256", data);
}

/**
 * Base64URL encode for PKCE
 */
function base64urlEncode(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let str = "";
	bytes.forEach((b) => (str += String.fromCharCode(b)));
	return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate PKCE code challenge from verifier
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
	const hashed = await sha256(verifier);
	return base64urlEncode(hashed);
}

/**
 * Check if OAuth is enabled and configured
 */
export function isOAuthEnabled(): boolean {
	const clientId = getConfigValue<string>("oauth-client-id");
	const useOAuth = getConfigValue<boolean>("use-oauth");
	return Boolean(useOAuth && clientId && clientId.length > 0);
}

/**
 * Check if we have valid OAuth tokens
 */
export function hasValidTokens(): boolean {
	const accessToken = localStorage.getItem(KEYS.accessToken);
	const expiresAt = localStorage.getItem(KEYS.expiresAt);
	const refreshToken = localStorage.getItem(KEYS.refreshToken);
	if (refreshToken) return true;
	if (!accessToken || !expiresAt) return false;
	// Consider token invalid if it expires in less than 5 minutes
	return Date.now() < parseInt(expiresAt) - 5 * 60 * 1000;
}

/**
 * Get the current access token, refreshing if necessary
 */
export async function getAccessToken(): Promise<string | null> {
	const accessToken = localStorage.getItem(KEYS.accessToken);
	const expiresAt = localStorage.getItem(KEYS.expiresAt);
	const refreshToken = localStorage.getItem(KEYS.refreshToken);

	if (!accessToken) {
		if (refreshToken) {
			try {
				await refreshAccessToken();
				return localStorage.getItem(KEYS.accessToken);
			} catch (e) {
				console.error("stats - OAuth access token recovery failed:", e);
				clearTokens();
				return null;
			}
		}
		return null;
	}

	// Check if token needs refresh (expires in less than 5 minutes)
	if (expiresAt && Date.now() > parseInt(expiresAt) - 5 * 60 * 1000) {
		if (refreshToken) {
			try {
				await refreshAccessToken();
				return localStorage.getItem(KEYS.accessToken);
			} catch (e) {
				console.error("stats - OAuth token refresh failed:", e);
				clearTokens();
				return null;
			}
		}
		return null;
	}

	return accessToken;
}

/**
 * Initiate OAuth authorization flow.
 * Generates a PKCE code_verifier and a cryptographic `state` nonce,
 * stores both in sessionStorage (ephemeral), then opens the Spotify
 * authorization URL.
 */
export async function startAuthFlow(): Promise<void> {
	const clientId = getConfigValue<string>("oauth-client-id");
	if (!clientId) {
		Spicetify.showNotification("Please enter your Spotify Client ID first", true);
		return;
	}

	// Generate and store PKCE code verifier in sessionStorage (ephemeral)
	const codeVerifier = generateRandomString(128);
	sessionStorage.setItem(SESSION_KEYS.codeVerifier, codeVerifier);

	// Generate and store a cryptographic state parameter to prevent CSRF (C-1)
	const state = generateRandomString(64);
	sessionStorage.setItem(SESSION_KEYS.oauthState, state);

	const codeChallenge = await generateCodeChallenge(codeVerifier);

	const params = new URLSearchParams({
		client_id: clientId,
		response_type: "code",
		redirect_uri: REDIRECT_URI,
		code_challenge_method: "S256",
		code_challenge: codeChallenge,
		scope: SCOPES,
		state,
	});

	const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

	// Open in browser and show instructions
	Spicetify.showNotification(
		"Opening browser for Spotify authorization. After approval, copy the URL from the browser.",
		false,
		5000
	);

	// Open auth URL - this will redirect to localhost which won't work,
	// but user can copy the callback URL
	window.open(authUrl, "_blank", "noopener,noreferrer");
}

/**
 * Complete OAuth flow by exchanging authorization code for tokens.
 * Validates the `state` parameter against the value stored during startAuthFlow
 * to prevent CSRF attacks (C-1).
 */
export async function handleCallback(callbackUrl: string): Promise<boolean> {
	try {
		const url = new URL(callbackUrl);
		const code = url.searchParams.get("code");
		const error = url.searchParams.get("error");
		const returnedState = url.searchParams.get("state");

		if (error) {
			console.error("stats - OAuth error:", error);
			Spicetify.showNotification(`Authorization failed: ${error}`, true);
			return false;
		}

		// Validate CSRF state parameter (C-1)
		const storedState = sessionStorage.getItem(SESSION_KEYS.oauthState);
		if (!storedState || !returnedState || storedState !== returnedState) {
			console.error("stats - OAuth state mismatch: possible CSRF attack");
			sessionStorage.removeItem(SESSION_KEYS.oauthState);
			sessionStorage.removeItem(SESSION_KEYS.codeVerifier);
			Spicetify.showNotification("Authorization failed: state mismatch (possible CSRF). Please try again.", true);
			return false;
		}
		// State validated; clean it up immediately
		sessionStorage.removeItem(SESSION_KEYS.oauthState);

		if (!code) {
			Spicetify.showNotification("No authorization code found in URL", true);
			return false;
		}

		const clientId = getConfigValue<string>("oauth-client-id");
		const codeVerifier = sessionStorage.getItem(SESSION_KEYS.codeVerifier);

		if (!clientId || !codeVerifier) {
			Spicetify.showNotification("Missing client ID or code verifier", true);
			return false;
		}

		// Exchange code for tokens
		const response = await fetch("https://accounts.spotify.com/api/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: REDIRECT_URI,
				client_id: clientId,
				code_verifier: codeVerifier,
			}),
		});

		if (!response.ok) {
			const errorData = await response.json();
			console.error("stats - Token exchange failed:", errorData);
			Spicetify.showNotification(`Token exchange failed: ${errorData.error_description || errorData.error}`, true);
			return false;
		}

		const data = await response.json();
		storeTokens(data);

		// Clean up code verifier from sessionStorage
		sessionStorage.removeItem(SESSION_KEYS.codeVerifier);

		Spicetify.showNotification("Successfully connected to Spotify!", false);
		return true;
	} catch (e) {
		console.error("stats - OAuth callback error:", e);
		Spicetify.showNotification("Failed to complete authorization", true);
		return false;
	}
}

/**
 * Refresh the access token using the refresh token.
 *
 * Uses a module-level promise guard (C-2) to prevent concurrent refresh
 * requests. If a refresh is already in flight, subsequent callers await the
 * same promise instead of firing a second request that would fail because
 * the first request already invalidated the old refresh token.
 */
async function refreshAccessToken(): Promise<void> {
	if (refreshPromise) {
		return refreshPromise;
	}

	refreshPromise = (async () => {
		const clientId = getConfigValue<string>("oauth-client-id");
		const refreshToken = localStorage.getItem(KEYS.refreshToken);

		if (!clientId || !refreshToken) {
			throw new Error("Missing client ID or refresh token");
		}

		const response = await fetch("https://accounts.spotify.com/api/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: new URLSearchParams({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				client_id: clientId,
			}),
		});

		if (!response.ok) {
			throw new Error("Token refresh failed");
		}

		const data = await response.json();
		storeTokens(data);
	})();

	try {
		await refreshPromise;
	} finally {
		refreshPromise = null;
	}
}

/**
 * Store tokens in localStorage.
 *
 * THREAT MODEL: Spicetify extensions run inside the Spotify desktop client,
 * which is a trusted, same-origin context — there is no untrusted third-party
 * code sharing this origin. localStorage is therefore an acceptable storage
 * mechanism here. If an XSS vector were ever introduced into the Spicetify
 * extension sandbox, an attacker could exfiltrate these tokens. That risk is
 * accepted because (a) the desktop client does not load arbitrary web content,
 * and (b) encrypting tokens in JS offers no real protection when the
 * decryption key must also live in the same JS context.
 */
function storeTokens(data: { access_token: string; refresh_token?: string; expires_in: number }): void {
	localStorage.setItem(KEYS.accessToken, data.access_token);
	if (data.refresh_token) {
		localStorage.setItem(KEYS.refreshToken, data.refresh_token);
	}
	// Store expiry time (current time + expires_in seconds)
	const expiresAt = Date.now() + data.expires_in * 1000;
	localStorage.setItem(KEYS.expiresAt, expiresAt.toString());
}

/**
 * Clear all OAuth tokens (logout)
 */
export function clearTokens(): void {
	localStorage.removeItem(KEYS.accessToken);
	localStorage.removeItem(KEYS.refreshToken);
	localStorage.removeItem(KEYS.expiresAt);
	// Also clear any ephemeral auth-flow values
	sessionStorage.removeItem(SESSION_KEYS.codeVerifier);
	sessionStorage.removeItem(SESSION_KEYS.oauthState);
}

/**
 * Get OAuth connection status for display
 */
export function getConnectionStatus(): { connected: boolean; expiresAt?: Date } {
	const accessToken = localStorage.getItem(KEYS.accessToken);
	const expiresAt = localStorage.getItem(KEYS.expiresAt);

	if (!accessToken) {
		return { connected: false };
	}

	return {
		connected: true,
		expiresAt: expiresAt ? new Date(parseInt(expiresAt)) : undefined,
	};
}

/**
 * Make an authenticated API request using OAuth token.
 *
 * Uses fetchWithRetry for automatic 429 backoff.  On 401, attempts a
 * single token refresh + retry.  All thrown errors carry a numeric
 * `code` property so callers (e.g. apiFetch) can detect the HTTP status
 * via extractStatus().
 */
export async function oauthFetch<T>(url: string): Promise<T> {
	const token = await getAccessToken();
	if (!token) {
		throw new OAuthError(401, "No valid OAuth token. Please reconnect to Spotify.");
	}

	const response = await fetchWithRetry(url, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (response.status === 401) {
		// Token might be invalid, try to refresh once
		try {
			await refreshAccessToken();
			const newToken = await getAccessToken();
			if (newToken) {
				const retryResponse = await fetchWithRetry(url, {
					headers: {
						Authorization: `Bearer ${newToken}`,
					},
				});
				if (retryResponse.status === 401) {
					// Refresh succeeded but new token is also rejected — token is unrecoverable
					clearTokens();
					throw new OAuthError(401, "OAuth token expired after refresh. Please reconnect to Spotify.");
				}
				if (!retryResponse.ok) {
					throw new OAuthError(retryResponse.status, `API request failed: ${retryResponse.status}`);
				}
				return retryResponse.json();
			}
			throw new OAuthError(401, "Failed to obtain new access token after refresh");
		} catch (e) {
			// Re-throw structured errors produced above
			if (e instanceof OAuthError) throw e;
			clearTokens();
			throw new OAuthError(401, "OAuth token expired. Please reconnect to Spotify.");
		}
	}

	if (!response.ok) {
		throw new OAuthError(response.status, `API request failed: ${response.status} ${response.statusText}`);
	}

	return response.json();
}
