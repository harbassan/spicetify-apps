import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { throttledMap, getThrottledMapOptions, minifyArtist, minifyAlbum, minifyTrack, convertArtistLastFMOnly, convertAlbumLastFMOnly } from "../converter";

vi.mock("../../api/spotify", () => ({
	searchForAlbum: vi.fn(),
	searchForArtist: vi.fn(),
	searchForTrack: vi.fn(),
}));

vi.mock("../../extensions/cache", () => ({
	cacher: vi.fn(),
	set: vi.fn(),
}));

vi.mock("../../api/lastfm", () => ({
	getArtistTopAlbumImage: vi.fn(),
	getLastFmImageUrl: vi.fn((images: { "#text": string }[] | undefined) => {
		if (!images?.length) return undefined;
		const img = [...images].reverse().find((e) => e?.["#text"]?.trim());
		return img?.["#text"] || undefined;
	}),
	getTrackAlbumImage: vi.fn(),
}));

describe("throttledMap", () => {
	afterEach(() => vi.useRealTimers());

	it("maps all items with default options (sequential, no delay)", async () => {
		const result = await throttledMap([1, 2, 3], async (n) => n * 2);
		expect(result).toEqual([2, 4, 6]);
	});

	it("returns empty array for empty input", async () => {
		const result = await throttledMap([], async (n) => n);
		expect(result).toEqual([]);
	});

	it("respects batchSize (processes in batches)", async () => {
		const callOrder: number[] = [];
		const fn = async (n: number) => {
			callOrder.push(n);
			return n;
		};
		await throttledMap([1, 2, 3, 4, 5], fn, { batchSize: 2, delayMs: 0 });
		expect(callOrder).toEqual([1, 2, 3, 4, 5]);
	});

	it("delays between batches when delayMs > 0", async () => {
		vi.useFakeTimers();
		const fn = vi.fn(async (n: number) => n);

		const promise = throttledMap([1, 2, 3], fn, { batchSize: 1, delayMs: 100 });

		// First batch processed immediately
		await vi.advanceTimersByTimeAsync(0);
		expect(fn).toHaveBeenCalledTimes(1);

		// After first delay
		await vi.advanceTimersByTimeAsync(100);
		expect(fn).toHaveBeenCalledTimes(2);

		// After second delay
		await vi.advanceTimersByTimeAsync(100);
		expect(fn).toHaveBeenCalledTimes(3);

		await promise;
	});

	it("does not delay after the last batch", async () => {
		vi.useFakeTimers();
		const fn = vi.fn(async (n: number) => n);

		const promise = throttledMap([1, 2], fn, { batchSize: 2, delayMs: 500 });
		// Only one batch, all items fit — no delay needed
		await vi.advanceTimersByTimeAsync(0);
		const result = await promise;
		expect(result).toEqual([1, 2]);
		expect(fn).toHaveBeenCalledTimes(2);
	});

	it("propagates errors from the mapping function", async () => {
		const fn = async (n: number) => {
			if (n === 2) throw new Error("boom");
			return n;
		};
		await expect(throttledMap([1, 2, 3], fn, { batchSize: 1 })).rejects.toThrow("boom");
	});
});

describe("getThrottledMapOptions", () => {
	it("returns high batch / no delay for lastfm-only", () => {
		const opts = getThrottledMapOptions(true);
		expect(opts.batchSize).toBe(8);
		expect(opts.delayMs).toBe(0);
	});

	it("returns smaller batch + delay for non-lastfm", () => {
		const opts = getThrottledMapOptions(false);
		expect(opts.batchSize).toBe(2);
		expect(opts.delayMs).toBe(250);
	});
});

describe("minifyArtist", () => {
	it("extracts expected fields", () => {
		const artist = {
			id: "abc",
			name: "Test Artist",
			images: [{ url: "https://img/1", height: 300, width: 300 }],
			uri: "spotify:artist:abc",
			genres: ["rock", "pop"],
			popularity: 75,
			type: "artist" as const,
			external_urls: { spotify: "" },
			href: "",
			followers: { href: null, total: 0 },
		};
		const result = minifyArtist(artist);
		expect(result).toEqual({
			id: "abc",
			name: "Test Artist",
			image: "https://img/1",
			uri: "spotify:artist:abc",
			genres: ["rock", "pop"],
			type: "spotify",
		});
	});

	it("handles missing images", () => {
		const artist = {
			id: "abc",
			name: "No Image",
			images: [],
			uri: "spotify:artist:abc",
			genres: [],
			popularity: 0,
			type: "artist" as const,
			external_urls: { spotify: "" },
			href: "",
			followers: { href: null, total: 0 },
		};
		expect(minifyArtist(artist).image).toBeUndefined();
	});
});

describe("minifyAlbum", () => {
	it("extracts expected fields", () => {
		const album = {
			id: "alb1",
			uri: "spotify:album:alb1",
			name: "My Album",
			images: [{ url: "https://img/album", height: 300, width: 300 }],
			release_date: "2024-01-01",
			album_type: "album",
			type: "album" as const,
			artists: [],
			total_tracks: 10,
			external_urls: { spotify: "" },
			href: "",
		};
		expect(minifyAlbum(album)).toEqual({
			id: "alb1",
			uri: "spotify:album:alb1",
			name: "My Album",
			image: "https://img/album",
			type: "spotify",
		});
	});

	it("handles empty images array", () => {
		const album = {
			id: "alb2",
			uri: "spotify:album:alb2",
			name: "No Image",
			images: [],
			release_date: "2024-01-01",
			album_type: "album",
			type: "album" as const,
			artists: [],
			total_tracks: 0,
			external_urls: { spotify: "" },
			href: "",
		};
		expect(minifyAlbum(album).image).toBeUndefined();
	});
});

describe("minifyTrack", () => {
	const makeTrack = () => ({
		id: "tr1",
		uri: "spotify:track:tr1",
		name: "My Track",
		duration_ms: 200000,
		popularity: 80,
		explicit: true,
		album: {
			id: "alb1",
			name: "Album",
			uri: "spotify:album:alb1",
			images: [
				{ url: "https://img/big", height: 640, width: 640 },
				{ url: "https://img/small", height: 64, width: 64 },
			],
			release_date: "2024-01-01",
			album_type: "album",
			type: "album" as const,
			artists: [],
			total_tracks: 10,
			external_urls: { spotify: "" },
			href: "",
		},
		artists: [
			{ id: "a1", name: "Artist One", uri: "spotify:artist:a1", type: "artist" as const, external_urls: { spotify: "" }, href: "" },
			{ id: "a2", name: "Artist Two", uri: "spotify:artist:a2", type: "artist" as const, external_urls: { spotify: "" }, href: "" },
		],
		type: "track" as const,
		disc_number: 1,
		track_number: 1,
		external_urls: { spotify: "" },
		href: "",
		is_local: false,
		preview_url: null,
		external_ids: {},
		is_playable: true,
	});

	it("extracts and transforms all fields correctly", () => {
		const result = minifyTrack(makeTrack());
		expect(result).toEqual({
			id: "tr1",
			uri: "spotify:track:tr1",
			name: "My Track",
			duration_ms: 200000,
			popularity: 80,
			explicit: true,
			image: "https://img/small", // .at(-1) — last image
			artists: [
				{ name: "Artist One", uri: "spotify:artist:a1" },
				{ name: "Artist Two", uri: "spotify:artist:a2" },
			],
			album: {
				name: "Album",
				uri: "spotify:album:alb1",
				release_date: "2024-01-01",
			},
			type: "spotify",
		});
	});

	it("handles empty album images", () => {
		const track = makeTrack();
		track.album.images = [];
		expect(minifyTrack(track).image).toBeUndefined();
	});
});

describe("convertArtistLastFMOnly", () => {
	it("converts LastFM artist to minified format", () => {
		const lfmArtist = {
			name: "LFM Artist",
			playcount: "12345",
			url: "https://last.fm/artist/test",
			image: [{ "#text": "https://img/test" }],
			mbid: "",
		};
		const result = convertArtistLastFMOnly(lfmArtist as any);
		expect(result.name).toBe("LFM Artist");
		expect(result.playcount).toBe(12345);
		expect(result.uri).toBe("https://last.fm/artist/test");
		expect(result.type).toBe("lastfm");
	});
});

describe("convertAlbumLastFMOnly", () => {
	it("converts LastFM album to minified format", () => {
		const lfmAlbum = {
			name: "LFM Album",
			playcount: "999",
			url: "https://last.fm/album/test",
			image: [{ "#text": "https://img/album" }],
			artist: { name: "Art", url: "" },
		};
		const result = convertAlbumLastFMOnly(lfmAlbum as any);
		expect(result.name).toBe("LFM Album");
		expect(result.playcount).toBe(999);
		expect(result.uri).toBe("https://last.fm/album/test");
		expect(result.type).toBe("lastfm");
	});
});
