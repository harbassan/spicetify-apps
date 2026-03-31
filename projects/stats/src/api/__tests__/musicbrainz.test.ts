import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";

// We need fresh module state per test because of module-level caches
// (artistGenresCache, serviceUnavailableUntil).
let getArtistGenres: typeof import("../musicbrainz").getArtistGenres;
let mockedFetchWithRetry: Mock;

describe("musicbrainz — getArtistGenres", () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.resetModules();

		vi.doMock("../../utils/fetch-with-retry", () => ({
			fetchWithRetry: vi.fn(),
		}));

		const mod = await import("../musicbrainz");
		getArtistGenres = mod.getArtistGenres;

		const fetchMod = await import("../../utils/fetch-with-retry");
		mockedFetchWithRetry = fetchMod.fetchWithRetry as unknown as Mock;
	});

	const mockJsonResponse = (data: unknown, status = 200) => ({
		ok: status >= 200 && status < 300,
		status,
		json: () => Promise.resolve(data),
		headers: new Headers(),
	});

	it("returns genres from search result with matching artist", async () => {
		// First call: search
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({
				artists: [
					{
						id: "mb-id-1",
						name: "Radiohead",
						score: 100,
						genres: [{ name: "alternative rock", count: 10 }],
						tags: [{ name: "electronic", count: 5 }],
					},
				],
			}) as any,
		);

		// Second call: artist details
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({
				genres: [{ name: "Alternative Rock", count: 12 }],
				tags: [{ name: "Electronic", count: 8 }, { name: "Art Rock", count: 6 }],
			}) as any,
		);

		const result = await getArtistGenres("Radiohead");
		expect(result.length).toBeGreaterThan(0);
		// Should be sorted by count descending
		for (let i = 1; i < result.length; i++) {
			expect((result[i - 1].count ?? 0)).toBeGreaterThanOrEqual(result[i].count ?? 0);
		}
	});

	it("returns empty array for empty search results", async () => {
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({ artists: [] }) as any,
		);

		const result = await getArtistGenres("NonexistentArtist12345");
		expect(result).toEqual([]);
	});

	it("returns cached result on second call (same artist name)", async () => {
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({
				artists: [{ id: "mb1", name: "Muse", genres: [{ name: "rock", count: 5 }], tags: [] }],
			}) as any,
		);
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({ genres: [{ name: "rock", count: 5 }], tags: [] }) as any,
		);

		const first = await getArtistGenres("Muse");
		const second = await getArtistGenres("Muse");
		expect(first).toBe(second); // Same promise reference
		expect(mockedFetchWithRetry).toHaveBeenCalledTimes(2); // Only the initial calls
	});

	it("normalizes artist name for cache lookup (case insensitive)", async () => {
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({
				artists: [{ id: "mb1", name: "muse", genres: [{ name: "rock", count: 5 }], tags: [] }],
			}) as any,
		);
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({ genres: [{ name: "rock", count: 5 }], tags: [] }) as any,
		);

		const first = await getArtistGenres("MUSE");
		const second = await getArtistGenres("muse");
		expect(first).toBe(second);
	});

	it("starts cooldown on 429 response", async () => {
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse(null, 429) as any,
		);

		const first = await getArtistGenres("CooldownArtist");
		const second = await getArtistGenres("CooldownArtist2"); // different artist, not cached

		expect(first).toEqual([]);
		expect(second).toEqual([]);
		// Second call is short-circuited by cooldown and must not hit fetch again
		expect(mockedFetchWithRetry).toHaveBeenCalledTimes(1);
	});

	it("starts cooldown on 503 response", async () => {
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse(null, 503) as any,
		);

		const result = await getArtistGenres("ServiceDown");
		expect(result).toEqual([]);
	});

	it("merges duplicate tags by taking max count", async () => {
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({
				artists: [{
					id: "mb1",
					name: "Test",
					genres: [{ name: "Rock", count: 3 }],
					tags: [{ name: "rock", count: 7 }], // same tag, different case, higher count
				}],
			}) as any,
		);
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({
				genres: [{ name: "Rock", count: 5 }],
				tags: [{ name: "rock", count: 10 }],
			}) as any,
		);

		const result = await getArtistGenres("Test");
		const rockTag = result.find((t) => t.name === "rock");
		expect(rockTag).toBeDefined();
		expect(rockTag!.count).toBe(10); // max of 5 and 10
	});

	it("evicts cache on transient (null) failure to allow retry", async () => {
		// First call: network error (fetchWithRetry throws)
		mockedFetchWithRetry.mockRejectedValueOnce(new Error("Network Error"));

		const first = await getArtistGenres("RetryMe");
		expect(first).toEqual([]);

		// After transient failure, cache should be evicted.
		// A fresh call should make a new request and succeed.
		mockedFetchWithRetry.mockResolvedValueOnce(
			mockJsonResponse({
				artists: [{ name: "retryme", genres: [{ name: "pop", count: 1 }], tags: [] }],
			}) as any,
		);

		const second = await getArtistGenres("RetryMe");
		expect(second).toEqual([{ name: "pop", count: 1 }]);
		// The second call was made (cache was evicted after transient failure)
		expect(mockedFetchWithRetry).toHaveBeenCalledTimes(2);
	});
});
