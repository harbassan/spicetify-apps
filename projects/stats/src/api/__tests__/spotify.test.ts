import { describe, it, expect, vi, beforeEach } from "vitest";

// We need to test: getEndpointKey, suppression logic, isSuppressedSpotifyError,
// clearSpotifyRequestSuppressions, and the core apiFetch routing.
// Since many helpers are not exported, we test them through apiFetch behavior.

// Mock all external deps before importing the module under test.
vi.mock("../../extensions/debug", () => ({
	statsDebug: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		setActivity: vi.fn(),
		clearActivity: vi.fn(),
	},
	debugLog: vi.fn(),
}));

vi.mock("../../utils/fetch-with-retry", () => ({
	fetchWithRetry: vi.fn(),
}));

vi.mock("../oauth", () => ({
	isOAuthEnabled: vi.fn(() => false),
	hasValidTokens: vi.fn(() => false),
	oauthFetch: vi.fn(),
	getAccessToken: vi.fn(),
}));

// Provide Spicetify globals
const mockCosmosAsyncGet = vi.fn();
const mockShowNotification = vi.fn();
(globalThis as any).Spicetify = {
	CosmosAsync: { get: mockCosmosAsyncGet },
	showNotification: mockShowNotification,
	Platform: {
		AuthorizationAPI: {
			getState: () => ({ token: { accessToken: "internal-token" } }),
		},
	},
};
(globalThis as any).SpicetifyStats = { ConfigWrapper: { Config: {} } };

import { apiFetch, isSuppressedSpotifyError, clearSpotifyRequestSuppressions, getAudioFeatures } from "../spotify";
import { fetchWithRetry } from "../../utils/fetch-with-retry";

const mockedFetchWithRetry = vi.mocked(fetchWithRetry);

describe("isSuppressedSpotifyError", () => {
	it("returns false for null/undefined", () => {
		expect(isSuppressedSpotifyError(null)).toBe(false);
		expect(isSuppressedSpotifyError(undefined)).toBe(false);
	});

	it("returns false for plain errors", () => {
		expect(isSuppressedSpotifyError(new Error("x"))).toBe(false);
	});

	it("returns true when error has suppressed=true", () => {
		const err = Object.assign(new Error("suppressed"), { suppressed: true });
		expect(isSuppressedSpotifyError(err)).toBe(true);
	});

	it("returns false for non-objects", () => {
		expect(isSuppressedSpotifyError("string")).toBe(false);
		expect(isSuppressedSpotifyError(42)).toBe(false);
	});
});

describe("clearSpotifyRequestSuppressions", () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it("clears localStorage suppression key", () => {
		localStorage.setItem("stats:spotify:endpoint-suppressions", JSON.stringify({ "audio-features": { status: 429, reason: "test", until: Date.now() + 60000 } }));
		clearSpotifyRequestSuppressions();
		expect(localStorage.getItem("stats:spotify:endpoint-suppressions")).toBeNull();
	});
});

describe("apiFetch — external (non-Spotify) URL", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches external URL with fetchWithRetry and returns JSON", async () => {
		const data = { result: "ok" };
		mockedFetchWithRetry.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(data),
			headers: new Headers(),
		} as any);

		const result = await apiFetch("lfmTest", "https://ws.audioscrobbler.com/2.0/?method=test");
		expect(result).toEqual(data);
		expect(mockedFetchWithRetry).toHaveBeenCalledWith(
			"https://ws.audioscrobbler.com/2.0/?method=test",
			expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) }),
			expect.anything(),
		);
	});

	it("caches repeated external requests", async () => {
		const data = { result: "cached" };
		mockedFetchWithRetry.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(data),
			headers: new Headers(),
		} as any);

		const url = "https://ws.audioscrobbler.com/2.0/?method=cache-test&unique=" + Math.random();
		const first = await apiFetch("lfmTest", url);
		const second = await apiFetch("lfmTest", url);
		expect(first).toEqual(data);
		expect(second).toEqual(data);
		expect(mockedFetchWithRetry).toHaveBeenCalledTimes(1);
	});

	it("throws for non-OK external responses", async () => {
		mockedFetchWithRetry.mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: "Internal Server Error",
			headers: new Headers(),
		} as any);

		const url = "https://ws.audioscrobbler.com/2.0/?method=fail&unique=" + Math.random();
		await expect(apiFetch("lfmFail", url)).rejects.toEqual(
			expect.objectContaining({ code: 500 }),
		);
	});
});

describe("apiFetch — Spotify URL with CosmosAsync", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearSpotifyRequestSuppressions();
		(globalThis as any).SpicetifyStats = { ConfigWrapper: { Config: {} } };
	});

	it("returns data from CosmosAsync on success", async () => {
		const data = { items: ["a", "b"] };
		mockCosmosAsyncGet.mockResolvedValueOnce(data);

		const result = await apiFetch("test", "https://api.spotify.com/v1/me/top/tracks?limit=50");
		expect(result).toEqual(data);
	});

	it("suppresses endpoint on 429 from CosmosAsync", async () => {
		mockCosmosAsyncGet.mockResolvedValueOnce({ code: 429 });

		await expect(
			apiFetch("test", "https://api.spotify.com/v1/audio-features?ids=a,b"),
		).rejects.toEqual(expect.objectContaining({ suppressed: true }));
	});

	it("second call to suppressed endpoint throws without network call", async () => {
		mockCosmosAsyncGet.mockResolvedValueOnce({ code: 429 });

		const url = "https://api.spotify.com/v1/me/top/artists?limit=50";
		await expect(apiFetch("test", url)).rejects.toEqual(
			expect.objectContaining({ suppressed: true }),
		);

		mockCosmosAsyncGet.mockClear();
		await expect(apiFetch("test2", url)).rejects.toEqual(
			expect.objectContaining({ suppressed: true }),
		);
		// CosmosAsync should not have been called for the second request
		expect(mockCosmosAsyncGet).not.toHaveBeenCalled();
	});

	it("suppresses endpoint on 403 from CosmosAsync", async () => {
		mockCosmosAsyncGet.mockResolvedValueOnce({ code: 403 });

		await expect(
			apiFetch("test", "https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0&time_range=short_term"),
		).rejects.toEqual(expect.objectContaining({ suppressed: true }));
	});

	it("suppresses on thrown 429 error from CosmosAsync", async () => {
		mockCosmosAsyncGet.mockRejectedValueOnce({ code: 429, message: "Rate limited" });

		await expect(
			apiFetch("test", "https://api.spotify.com/v1/artists?ids=abc"),
		).rejects.toEqual(expect.objectContaining({ suppressed: true }));
	});
});

describe("apiFetch — direct fetch path", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearSpotifyRequestSuppressions();
		(globalThis as any).SpicetifyStats = { ConfigWrapper: { Config: { "use-direct-fetch": true } } };
	});

	it("uses direct fetch when use-direct-fetch is enabled", async () => {
		const data = { items: [] };
		mockedFetchWithRetry.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: () => Promise.resolve(data),
			headers: new Headers(),
		} as any);

		const result = await apiFetch("test", "https://api.spotify.com/v1/albums?ids=abc");
		expect(result).toEqual(data);
		expect(mockedFetchWithRetry).toHaveBeenCalledWith(
			"https://api.spotify.com/v1/albums?ids=abc",
			expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer internal-token" }) }),
			expect.anything(),
		);
		// CosmosAsync should not be called when direct fetch succeeds
		expect(mockCosmosAsyncGet).not.toHaveBeenCalled();
	});

	it("falls back to CosmosAsync when direct fetch fails with non-suppressing status", async () => {
		mockedFetchWithRetry.mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: "Server Error",
			headers: new Headers(),
		} as any);
		mockCosmosAsyncGet.mockResolvedValueOnce({ data: "fallback" });

		const result = await apiFetch("test", "https://api.spotify.com/v1/tracks?ids=abc");
		expect(result).toEqual({ data: "fallback" });
		expect(mockCosmosAsyncGet).toHaveBeenCalled();
	});

	it("suppresses on 429 from direct fetch (no CosmosAsync fallback)", async () => {
		mockedFetchWithRetry.mockResolvedValueOnce({
			ok: false,
			status: 429,
			statusText: "Too Many Requests",
			headers: new Headers({ "Retry-After": "30" }),
		} as any);

		await expect(
			apiFetch("test", "https://api.spotify.com/v1/search?q=test&type=artist"),
		).rejects.toEqual(expect.objectContaining({ suppressed: true }));
		expect(mockCosmosAsyncGet).not.toHaveBeenCalled();
	});
});
