import { describe, it, expect } from "vitest";
import collectionSort from "../collection_sort";
import type { CollectionChild, CollectionItem } from "../../extensions/collections_wrapper";
import type { AlbumItem } from "../../types/platform";

// --- Test fixture helpers ---
const makeAlbum = (overrides: Partial<AlbumItem> & { name: string; uri: string }): AlbumItem => ({
	type: "album",
	artists: [{ type: "artist", name: "Artist", uri: "spotify:artist:1" }],
	pinned: false,
	addedAt: new Date("2024-01-01"),
	lastPlayedAt: null,
	isPremiumOnly: false,
	canPin: 0,
	...overrides,
});

const makeLocalAlbum = (overrides: Partial<AlbumItem> & { name: string; uri: string }): AlbumItem => ({
	...makeAlbum(overrides),
	type: "localalbum",
	...overrides,
});

const makeCollection = (overrides: Partial<CollectionItem> & { name: string; uri: string }): CollectionItem => ({
	type: "collection",
	addedAt: new Date("2024-01-01"),
	lastPlayedAt: null,
	items: [],
	parentCollection: "",
	...overrides,
});

describe("collectionSort", () => {
	describe("case 0: alphabetical by name", () => {
		it("sorts alphabetically", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "Banana", uri: "u:1" }),
				makeAlbum({ name: "Apple", uri: "u:2" }),
				makeAlbum({ name: "Cherry", uri: "u:3" }),
			];
			items.sort(collectionSort("0", false));
			expect(items.map((i) => i.name)).toEqual(["Apple", "Banana", "Cherry"]);
		});

		it("strips 'the ' prefix for comparison", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "The Beatles Album", uri: "u:1" }),
				makeAlbum({ name: "Alpha", uri: "u:2" }),
			];
			items.sort(collectionSort("0", false));
			// "Beatles Album" < "Alpha"? No, "Alpha" < "Beatles Album"
			expect(items.map((i) => i.name)).toEqual(["Alpha", "The Beatles Album"]);
		});

		it("reverses when reverse=true", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "Apple", uri: "u:1" }),
				makeAlbum({ name: "Cherry", uri: "u:2" }),
			];
			items.sort(collectionSort("0", true));
			expect(items.map((i) => i.name)).toEqual(["Cherry", "Apple"]);
		});
	});

	describe("case 1: addedAt (recent first)", () => {
		it("sorts by addedAt descending", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "Old", uri: "u:1", addedAt: new Date("2020-01-01") }),
				makeAlbum({ name: "New", uri: "u:2", addedAt: new Date("2024-06-01") }),
				makeAlbum({ name: "Mid", uri: "u:3", addedAt: new Date("2022-03-15") }),
			];
			items.sort(collectionSort("1", false));
			expect(items.map((i) => i.name)).toEqual(["New", "Mid", "Old"]);
		});

		it("reverses to ascending when reverse=true", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "Old", uri: "u:1", addedAt: new Date("2020-01-01") }),
				makeAlbum({ name: "New", uri: "u:2", addedAt: new Date("2024-06-01") }),
			];
			items.sort(collectionSort("1", true));
			expect(items.map((i) => i.name)).toEqual(["Old", "New"]);
		});
	});

	describe("case 2: artist name", () => {
		it("sorts by first artist name", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "A1", uri: "u:1", artists: [{ type: "artist", name: "Zed", uri: "a:1" }] }),
				makeAlbum({ name: "A2", uri: "u:2", artists: [{ type: "artist", name: "Alpha", uri: "a:2" }] }),
			];
			items.sort(collectionSort("2", false));
			expect(items.map((i) => i.name)).toEqual(["A2", "A1"]);
		});

		it("collections sort before albums", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "Album", uri: "u:1", artists: [{ type: "artist", name: "AAA", uri: "a:1" }] }),
				makeCollection({ name: "My Collection", uri: "u:2" }),
			];
			items.sort(collectionSort("2", false));
			expect(items.map((i) => i.name)).toEqual(["My Collection", "Album"]);
		});

		it("strips 'the' from artist name", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "A1", uri: "u:1", artists: [{ type: "artist", name: "The Zebras", uri: "a:1" }] }),
				makeAlbum({ name: "A2", uri: "u:2", artists: [{ type: "artist", name: "Alpha Band", uri: "a:2" }] }),
			];
			items.sort(collectionSort("2", false));
			expect(items.map((i) => i.name)).toEqual(["A2", "A1"]);
		});
	});

	describe("case 3: release year", () => {
		it("preserves server order for standard albums", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "A1", uri: "u:1" }),
				makeAlbum({ name: "A2", uri: "u:2" }),
			];
			const compare = collectionSort("3", false);
			expect(compare(items[0], items[1])).toBe(0);
		});

		it("local albums sort to the end", () => {
			const items: CollectionChild[] = [
				makeLocalAlbum({ name: "Local", uri: "u:1" }),
				makeAlbum({ name: "Standard", uri: "u:2" }),
			];
			items.sort(collectionSort("3", false));
			expect(items.map((i) => i.name)).toEqual(["Standard", "Local"]);
		});

		it("local albums sort alphabetically among themselves", () => {
			const items: CollectionChild[] = [
				makeLocalAlbum({ name: "Zebra", uri: "u:1" }),
				makeLocalAlbum({ name: "Alpha", uri: "u:2" }),
			];
			items.sort(collectionSort("3", false));
			expect(items.map((i) => i.name)).toEqual(["Alpha", "Zebra"]);
		});

		it("local album sort is reversed when reverse=true", () => {
			const items: CollectionChild[] = [
				makeLocalAlbum({ name: "Zebra", uri: "u:1" }),
				makeLocalAlbum({ name: "Alpha", uri: "u:2" }),
			];
			items.sort(collectionSort("3", true));
			expect(items.map((i) => i.name)).toEqual(["Zebra", "Alpha"]);
		});

		it("does NOT apply global reverse wrapper", () => {
			// For case "3", local albums must always go to the end regardless of reverse
			const items: CollectionChild[] = [
				makeLocalAlbum({ name: "Local", uri: "u:1" }),
				makeAlbum({ name: "Standard", uri: "u:2" }),
			];
			items.sort(collectionSort("3", true));
			// Local still at the end even with reverse
			expect(items.map((i) => i.name)).toEqual(["Standard", "Local"]);
		});

		it("returns 0 for collections", () => {
			const a = makeCollection({ name: "Col", uri: "u:1" });
			const b = makeAlbum({ name: "Album", uri: "u:2" });
			const compare = collectionSort("3", false);
			expect(compare(a, b)).toBe(0);
		});
	});

	describe("case 6: lastPlayed", () => {
		it("sorts by lastPlayedAt descending", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "Old", uri: "u:1", lastPlayedAt: new Date("2020-01-01") }),
				makeAlbum({ name: "New", uri: "u:2", lastPlayedAt: new Date("2024-06-01") }),
			];
			items.sort(collectionSort("6", false));
			expect(items.map((i) => i.name)).toEqual(["New", "Old"]);
		});

		it("handles null lastPlayedAt", () => {
			const items: CollectionChild[] = [
				makeAlbum({ name: "Never", uri: "u:1", lastPlayedAt: null }),
				makeAlbum({ name: "Played", uri: "u:2", lastPlayedAt: new Date("2024-01-01") }),
			];
			items.sort(collectionSort("6", false));
			// null => "Invalid Date" => NaN, so played should come first
			expect(items[0].name).toBe("Played");
		});
	});

	describe("pinned items", () => {
		it("returns 0 for pinned items (preserves position)", () => {
			const a = makeAlbum({ name: "Zebra", uri: "u:1", pinned: true });
			const b = makeAlbum({ name: "Alpha", uri: "u:2" });
			const compare = collectionSort("0", false);
			expect(compare(a, b)).toBe(0);
		});

		it("returns 0 when both are pinned", () => {
			const a = makeAlbum({ name: "B", uri: "u:1", pinned: true });
			const b = makeAlbum({ name: "A", uri: "u:2", pinned: true });
			const compare = collectionSort("0", false);
			expect(compare(a, b)).toBe(0);
		});
	});

	describe("unknown sort order", () => {
		it("returns 0 for unknown order codes", () => {
			const a = makeAlbum({ name: "A", uri: "u:1" });
			const b = makeAlbum({ name: "B", uri: "u:2" });
			const compare = collectionSort("99", false);
			expect(compare(a, b)).toBe(0);
		});
	});
});
