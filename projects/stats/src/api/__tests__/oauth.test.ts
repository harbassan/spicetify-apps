import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../utils/fetch-with-retry", () => ({
	fetchWithRetry: vi.fn(),
}));

// Provide Spicetify global
const mockShowNotification = vi.fn();
(globalThis as any).Spicetify = {
	showNotification: mockShowNotification,
};

// We need to re-import the module fresh for some tests due to module-level state
// (refreshPromise guard). Use vi.resetModules() for those.

import {
	isOAuthEnabled,
	hasValidTokens,
	getAccessToken,
	clearTokens,
	getConnectionStatus,
	oauthFetch,
} from "../oauth";
import { fetchWithRetry } from "../../utils/fetch-with-retry";

const mockedFetchWithRetry = vi.mocked(fetchWithRetry);

const STORAGE_PREFIX = "stats:oauth:";
const KEYS = {
	accessToken: `${STORAGE_PREFIX}access_token`,
	refreshToken: `${STORAGE_PREFIX}refresh_token`,
	expiresAt: `${STORAGE_PREFIX}expires_at`,
};

describe("isOAuthEnabled", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns false when no config is set", () => {
		expect(isOAuthEnabled()).toBe(false);
	});

	it("returns false when use-oauth is false", () => {
		localStorage.setItem("stats:config:use-oauth", JSON.stringify(false));
		localStorage.setItem("stats:config:oauth-client-id", JSON.stringify("my-client-id"));
		expect(isOAuthEnabled()).toBe(false);
	});

	it("returns false when client ID is empty", () => {
		localStorage.setItem("stats:config:use-oauth", JSON.stringify(true));
		localStorage.setItem("stats:config:oauth-client-id", JSON.stringify(""));
		expect(isOAuthEnabled()).toBe(false);
	});

	it("returns true when both use-oauth and client ID are set", () => {
		localStorage.setItem("stats:config:use-oauth", JSON.stringify(true));
		localStorage.setItem("stats:config:oauth-client-id", JSON.stringify("abc123"));
		expect(isOAuthEnabled()).toBe(true);
	});
});

describe("hasValidTokens", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns false when no tokens exist", () => {
		expect(hasValidTokens()).toBe(false);
	});

	it("returns true when a refresh token exists (even without access token)", () => {
		localStorage.setItem(KEYS.refreshToken, "refresh-tok");
		expect(hasValidTokens()).toBe(true);
	});

	it("returns true when access token exists and is not expired", () => {
		localStorage.setItem(KEYS.accessToken, "access-tok");
		localStorage.setItem(KEYS.expiresAt, String(Date.now() + 60 * 60 * 1000)); // 1 hour from now
		expect(hasValidTokens()).toBe(true);
	});

	it("returns false when access token exists but expires within 5 minutes", () => {
		localStorage.setItem(KEYS.accessToken, "access-tok");
		localStorage.setItem(KEYS.expiresAt, String(Date.now() + 2 * 60 * 1000)); // 2 min from now
		expect(hasValidTokens()).toBe(false);
	});
});

describe("getAccessToken", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("returns null when no tokens exist", async () => {
		expect(await getAccessToken()).toBeNull();
	});

	it("returns access token when it's still valid", async () => {
		localStorage.setItem(KEYS.accessToken, "valid-token");
		localStorage.setItem(KEYS.expiresAt, String(Date.now() + 60 * 60 * 1000));
		expect(await getAccessToken()).toBe("valid-token");
	});

	it("attempts refresh when access token is near expiry and refresh token exists", async () => {
		localStorage.setItem(KEYS.accessToken, "old-token");
		localStorage.setItem(KEYS.expiresAt, String(Date.now() + 60 * 1000)); // 1 min — within 5 min threshold
		localStorage.setItem(KEYS.refreshToken, "refresh-tok");
		localStorage.setItem("stats:config:oauth-client-id", JSON.stringify("client-id"));

		const originalFetch = globalThis.fetch;
		try {
			// Mock the token refresh fetch
			const mockFetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve({
					access_token: "new-token",
					refresh_token: "new-refresh",
					expires_in: 3600,
				}),
			});
			globalThis.fetch = mockFetch;

			const result = await getAccessToken();
			expect(result).toBe("new-token");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("clears tokens and returns null on failed refresh", async () => {
		localStorage.setItem(KEYS.accessToken, "old-token");
		localStorage.setItem(KEYS.expiresAt, String(Date.now() + 60 * 1000));
		localStorage.setItem(KEYS.refreshToken, "invalid-refresh");
		localStorage.setItem("stats:config:oauth-client-id", JSON.stringify("client-id"));

		const originalFetch = globalThis.fetch;
		try {
			const mockFetch = vi.fn().mockResolvedValueOnce({
				ok: false,
				json: () => Promise.resolve({ error: "invalid_grant" }),
			});
			globalThis.fetch = mockFetch;

			const result = await getAccessToken();
			expect(result).toBeNull();
			expect(localStorage.getItem(KEYS.accessToken)).toBeNull();
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});

describe("clearTokens", () => {
	it("removes all OAuth-related storage", () => {
		localStorage.setItem(KEYS.accessToken, "tok");
		localStorage.setItem(KEYS.refreshToken, "ref");
		localStorage.setItem(KEYS.expiresAt, "123");
		sessionStorage.setItem(`${STORAGE_PREFIX}code_verifier`, "cv");
		sessionStorage.setItem(`${STORAGE_PREFIX}oauth_state`, "state");

		clearTokens();

		expect(localStorage.getItem(KEYS.accessToken)).toBeNull();
		expect(localStorage.getItem(KEYS.refreshToken)).toBeNull();
		expect(localStorage.getItem(KEYS.expiresAt)).toBeNull();
		expect(sessionStorage.getItem(`${STORAGE_PREFIX}code_verifier`)).toBeNull();
		expect(sessionStorage.getItem(`${STORAGE_PREFIX}oauth_state`)).toBeNull();
	});
});

describe("getConnectionStatus", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("returns not connected when no token", () => {
		expect(getConnectionStatus()).toEqual({ connected: false });
	});

	it("returns connected with expiry when token exists", () => {
		const expiresAt = Date.now() + 3600000;
		localStorage.setItem(KEYS.accessToken, "tok");
		localStorage.setItem(KEYS.expiresAt, String(expiresAt));

		const status = getConnectionStatus();
		expect(status.connected).toBe(true);
		expect(status.expiresAt).toBeInstanceOf(Date);
	});
});

describe("oauthFetch", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("throws OAuthError when no valid token", async () => {
		await expect(oauthFetch("https://api.spotify.com/v1/me")).rejects.toThrow(
			"No valid OAuth token",
		);
	});

	it("returns data on successful fetch", async () => {
		localStorage.setItem(KEYS.accessToken, "my-token");
		localStorage.setItem(KEYS.expiresAt, String(Date.now() + 3600000));

		const data = { items: ["track1"] };
		mockedFetchWithRetry.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(data),
		} as any);

		const result = await oauthFetch("https://api.spotify.com/v1/me/top/tracks");
		expect(result).toEqual(data);
	});

	it("attempts refresh on 401 and retries", async () => {
		localStorage.setItem(KEYS.accessToken, "expired-token");
		localStorage.setItem(KEYS.expiresAt, String(Date.now() + 3600000));
		localStorage.setItem(KEYS.refreshToken, "refresh-tok");
		localStorage.setItem("stats:config:oauth-client-id", JSON.stringify("cid"));

		// First call returns 401
		mockedFetchWithRetry.mockResolvedValueOnce({
			ok: false,
			status: 401,
		} as any);

		const originalFetch = globalThis.fetch;
		try {
			// Mock global fetch for token refresh
			const refreshData = { access_token: "new-token", refresh_token: "new-ref", expires_in: 3600 };
			globalThis.fetch = vi.fn().mockResolvedValueOnce({
				ok: true,
				json: () => Promise.resolve(refreshData),
			});

			// Retry after refresh succeeds
			mockedFetchWithRetry.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: () => Promise.resolve({ data: "refreshed" }),
			} as any);

			const result = await oauthFetch("https://api.spotify.com/v1/me/top/tracks");
			expect(result).toEqual({ data: "refreshed" });
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("throws OAuthError for non-OK non-401 responses", async () => {
		localStorage.setItem(KEYS.accessToken, "tok");
		localStorage.setItem(KEYS.expiresAt, String(Date.now() + 3600000));

		mockedFetchWithRetry.mockResolvedValueOnce({
			ok: false,
			status: 403,
			statusText: "Forbidden",
		} as any);

		await expect(oauthFetch("https://api.spotify.com/v1/me")).rejects.toThrow("403");
	});
});

describe("concurrent refresh guard (C-2)", () => {
	beforeEach(async () => {
		localStorage.clear();
		vi.clearAllMocks();
	});

	it("multiple concurrent getAccessToken calls share a single refresh request", async () => {
		localStorage.setItem(KEYS.accessToken, "old");
		localStorage.setItem(KEYS.expiresAt, String(Date.now() + 60 * 1000)); // near expiry
		localStorage.setItem(KEYS.refreshToken, "ref");
		localStorage.setItem("stats:config:oauth-client-id", JSON.stringify("cid"));

		const originalFetch = globalThis.fetch;
		try {
			let resolveRefresh!: (value: Response) => void;
			const refreshPromise = new Promise<Response>((resolve) => {
				resolveRefresh = resolve;
			});
			globalThis.fetch = vi.fn().mockReturnValue(refreshPromise);

			// Launch two concurrent token requests
			const p1 = getAccessToken();
			const p2 = getAccessToken();

			// Only one fetch call should have been made
			expect(globalThis.fetch).toHaveBeenCalledTimes(1);

			// Resolve the refresh
			resolveRefresh({
				ok: true,
				json: () => Promise.resolve({ access_token: "shared-new", refresh_token: "r", expires_in: 3600 }),
			} as Response);

			const [t1, t2] = await Promise.all([p1, p2]);
			expect(t1).toBe("shared-new");
			expect(t2).toBe("shared-new");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});
});
