import { describe, it, expect, vi } from "vitest";
import { getLastFmImageUrl } from "../lastfm";

// We test getLastFmImageUrl directly without mocking since it's pure logic.
// The module also exports functions that call apiFetch, so we mock that.

vi.mock("../spotify", () => ({
	apiFetch: vi.fn(),
}));

type LastFmImage = { "#text": string };

describe("getLastFmImageUrl", () => {
	it("returns undefined for undefined input", () => {
		expect(getLastFmImageUrl(undefined)).toBeUndefined();
	});

	it("returns undefined for empty array", () => {
		expect(getLastFmImageUrl([])).toBeUndefined();
	});

	it("returns the last non-empty image URL (reverse priority)", () => {
		const images: LastFmImage[] = [
			{ "#text": "https://small.jpg" },
			{ "#text": "https://medium.jpg" },
			{ "#text": "https://large.jpg" },
		];
		// Reversed: large, medium, small — first non-empty is large
		expect(getLastFmImageUrl(images)).toBe("https://large.jpg");
	});

	it("skips empty strings and returns first non-empty from end", () => {
		const images: LastFmImage[] = [
			{ "#text": "https://small.jpg" },
			{ "#text": "" },
			{ "#text": "" },
		];
		expect(getLastFmImageUrl(images)).toBe("https://small.jpg");
	});

	it("skips whitespace-only strings", () => {
		const images: LastFmImage[] = [
			{ "#text": "https://valid.jpg" },
			{ "#text": "   " },
		];
		expect(getLastFmImageUrl(images)).toBe("https://valid.jpg");
	});

	it("returns undefined when all entries are empty", () => {
		const images: LastFmImage[] = [{ "#text": "" }, { "#text": "" }];
		expect(getLastFmImageUrl(images)).toBeUndefined();
	});

	it("converts http to https", () => {
		const images: LastFmImage[] = [{ "#text": "http://lastfm.img/photo.jpg" }];
		expect(getLastFmImageUrl(images)).toBe("https://lastfm.img/photo.jpg");
	});

	it("filters out placeholder image (2a96cbd8)", () => {
		const images: LastFmImage[] = [
			{ "#text": "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png" },
		];
		expect(getLastFmImageUrl(images)).toBeUndefined();
	});

	it("filters out placeholder image (c6f59c1e)", () => {
		const images: LastFmImage[] = [
			{ "#text": "https://lastfm.freetls.fastly.net/i/u/300x300/c6f59c1e5e7240a4c0d427abd71f3dbb.png" },
		];
		expect(getLastFmImageUrl(images)).toBeUndefined();
	});

	it("returns undefined when largest image is a placeholder, even if a smaller real image exists", () => {
		const images: LastFmImage[] = [
			{ "#text": "https://real-image.jpg" },
			{ "#text": "https://lastfm.freetls.fastly.net/i/u/300x300/2a96cbd8b46e442fc41c2b86b821562f.png" },
		];
		// Reversed: [placeholder, real-image]. The function picks the first non-empty from the
		// reversed array (the placeholder), identifies it as a placeholder, and returns undefined.
		// The smaller real image is not used as a fallback.
		expect(getLastFmImageUrl(images)).toBeUndefined();
	});

	it("returns https URL unchanged", () => {
		const images: LastFmImage[] = [{ "#text": "https://already-secure.jpg" }];
		expect(getLastFmImageUrl(images)).toBe("https://already-secure.jpg");
	});
});
