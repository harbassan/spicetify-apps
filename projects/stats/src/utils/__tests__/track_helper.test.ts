import { describe, it, expect, vi } from "vitest";
import { batchRequest, parseStat, minifyAlbumUnion } from "../track_helper";

vi.mock("../../api/platform", () => ({
	getAlbumMetas: vi.fn(),
	queryInLibrary: vi.fn(),
}));

vi.mock("../../api/spotify", () => ({
	getArtistMetas: vi.fn(),
	getAudioFeatures: vi.fn(),
	isSuppressedSpotifyError: vi.fn((e: unknown) => e instanceof Error && e.message === "suppressed"),
}));

vi.mock("../../extensions/cache", () => ({
	batchCacher: vi.fn((_key: string, fn: Function) => fn),
}));

vi.mock("../../api/lastfm", () => ({
	getArtistTopTags: vi.fn(),
}));

vi.mock("../../api/musicbrainz", () => ({
	getArtistGenres: vi.fn(),
}));

describe("batchRequest", () => {
	it("splits ids into chunks and returns all results", async () => {
		const request = vi.fn(async (batch: string[]) => batch.map((id) => ({ id })));
		const fn = batchRequest(2, request);
		const results = await fn(["a", "b", "c", "d", "e"]);
		expect(request).toHaveBeenCalledTimes(3); // [a,b], [c,d], [e]
		expect(results).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }]);
	});

	it("returns empty array for empty input", async () => {
		const request = vi.fn(async (batch: string[]) => batch.map((id) => ({ id })));
		const fn = batchRequest(2, request);
		const results = await fn([]);
		expect(results).toEqual([]);
		expect(request).not.toHaveBeenCalled();
	});

	it("replaces chunk results with undefined on non-suppressed error, then continues", async () => {
		const request = vi.fn()
			.mockResolvedValueOnce([{ id: "a" }, { id: "b" }])
			.mockRejectedValueOnce(new Error("regular error"))
			.mockResolvedValueOnce([{ id: "e" }]);

		const fn = batchRequest(2, request);
		const results = await fn(["a", "b", "c", "d", "e"]);
		// Chunk 1: ok, Chunk 2: error => undefineds, Chunk 3: ok (no break because not suppressed)
		expect(results).toEqual([{ id: "a" }, { id: "b" }, undefined, undefined, { id: "e" }]);
	});

	it("breaks on suppressed error (no further batches)", async () => {
		const request = vi.fn()
			.mockResolvedValueOnce([{ id: "a" }, { id: "b" }])
			.mockRejectedValueOnce(new Error("suppressed"))
			.mockResolvedValueOnce([{ id: "e" }]);

		const fn = batchRequest(2, request);
		const results = await fn(["a", "b", "c", "d", "e"]);
		// Chunk 2 fails with suppressed => break, chunk 3 never runs
		expect(results).toEqual([{ id: "a" }, { id: "b" }, undefined, undefined]);
		expect(request).toHaveBeenCalledTimes(2);
	});

	it("handles single element chunks", async () => {
		const request = vi.fn(async (batch: string[]) => batch.map((id) => ({ id })));
		const fn = batchRequest(1, request);
		const results = await fn(["x", "y"]);
		expect(request).toHaveBeenCalledTimes(2);
		expect(results).toEqual([{ id: "x" }, { id: "y" }]);
	});

	it("handles chunk size larger than input", async () => {
		const request = vi.fn(async (batch: string[]) => batch.map((id) => ({ id })));
		const fn = batchRequest(100, request);
		const results = await fn(["a", "b"]);
		expect(request).toHaveBeenCalledTimes(1);
		expect(results).toEqual([{ id: "a" }, { id: "b" }]);
	});
});

describe("parseStat", () => {
	describe("tempo", () => {
		const format = parseStat("tempo");

		it("formats normal tempo", () => {
			expect(format(120.6)).toBe("121 bpm");
		});

		it("returns 'Unavailable' for NaN", () => {
			expect(format(Number.NaN)).toBe("Unavailable");
		});

		it("returns 'Unavailable' for Infinity", () => {
			expect(format(Number.POSITIVE_INFINITY)).toBe("Unavailable");
		});
	});

	describe("popularity", () => {
		const format = parseStat("popularity");

		it("formats as percentage", () => {
			expect(format(75)).toBe("75%");
		});

		it("rounds to nearest integer", () => {
			expect(format(75.4)).toBe("75%");
			expect(format(75.6)).toBe("76%");
		});

		it("returns 'Unavailable' for NaN", () => {
			expect(format(Number.NaN)).toBe("Unavailable");
		});
	});

	describe("default (0-1 scale features)", () => {
		const format = parseStat("danceability");

		it("formats as percentage (multiplied by 100)", () => {
			expect(format(0.75)).toBe("75%");
		});

		it("formats 0 as 0%", () => {
			expect(format(0)).toBe("0%");
		});

		it("formats 1.0 as 100%", () => {
			expect(format(1.0)).toBe("100%");
		});

		it("returns 'Unavailable' for NaN", () => {
			expect(format(Number.NaN)).toBe("Unavailable");
		});

		it("returns 'Unavailable' for negative infinity", () => {
			expect(format(Number.NEGATIVE_INFINITY)).toBe("Unavailable");
		});
	});
});

describe("minifyAlbumUnion", () => {
	it("extracts id from URI and maps fields", () => {
		const album = {
			uri: "spotify:album:abc123",
			name: "Test Album",
			coverArt: {
				sources: [{ url: "https://img/cover", width: 300, height: 300 }],
			},
		};
		expect(minifyAlbumUnion(album as any)).toEqual({
			id: "abc123",
			uri: "spotify:album:abc123",
			name: "Test Album",
			image: "https://img/cover",
			type: "spotify",
		});
	});

	it("handles empty coverArt sources", () => {
		const album = {
			uri: "spotify:album:xyz",
			name: "No Cover",
			coverArt: { sources: [] },
		};
		expect(minifyAlbumUnion(album as any).image).toBeUndefined();
	});
});
