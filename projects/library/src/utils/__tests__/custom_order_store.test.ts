import { describe, it, expect, beforeEach, vi } from "vitest";

// CustomOrderStore is a singleton exported as default. We need a fresh instance per test.
// Since it reads from localStorage in constructor, we mock localStorage first.

const STORAGE_KEY = "library:albums:custom-order";

// We dynamically import to get a fresh module per test via vi.resetModules()
let store: typeof import("../custom_order_store").default;

describe("CustomOrderStore", () => {
	beforeEach(async () => {
		vi.resetModules();
		localStorage.clear();
		const mod = await import("../custom_order_store");
		store = mod.default;
	});

	describe("getOrder / setOrder", () => {
		it("returns empty array when nothing is stored", () => {
			expect(store.getOrder()).toEqual([]);
		});

		it("setOrder stores and retrieves URIs", () => {
			store.setOrder(["spotify:album:a", "spotify:album:b"]);
			expect(store.getOrder()).toEqual(["spotify:album:a", "spotify:album:b"]);
		});

		it("getOrder returns a copy (not a reference)", () => {
			store.setOrder(["spotify:album:a"]);
			const order = store.getOrder();
			order.push("spotify:album:z");
			expect(store.getOrder()).toEqual(["spotify:album:a"]);
		});

		it("persists to localStorage", () => {
			store.setOrder(["spotify:album:a", "spotify:album:b"]);
			const raw = localStorage.getItem(STORAGE_KEY);
			expect(JSON.parse(raw!)).toEqual(["spotify:album:a", "spotify:album:b"]);
		});

		it("dispatches change event on setOrder", () => {
			const listener = vi.fn();
			store.addEventListener("change", listener);
			store.setOrder(["spotify:album:a"]);
			expect(listener).toHaveBeenCalledTimes(1);
			store.removeEventListener("change", listener);
		});
	});

	describe("hasOrder", () => {
		it("returns false when no order is set", () => {
			expect(store.hasOrder()).toBe(false);
		});

		it("returns true after setOrder", () => {
			store.setOrder(["spotify:album:a"]);
			expect(store.hasOrder()).toBe(true);
		});
	});

	describe("sortByOrder", () => {
		it("sorts items by stored order", () => {
			store.setOrder(["spotify:album:c", "spotify:album:a", "spotify:album:b"]);
			const items = [
				{ uri: "spotify:album:b", name: "B" },
				{ uri: "spotify:album:a", name: "A" },
				{ uri: "spotify:album:c", name: "C" },
			];
			const sorted = store.sortByOrder(items);
			expect(sorted.map((i) => i.uri)).toEqual([
				"spotify:album:c",
				"spotify:album:a",
				"spotify:album:b",
			]);
		});

		it("places unknown URIs at the end preserving input order", () => {
			store.setOrder(["spotify:album:b", "spotify:album:a"]);
			const items = [
				{ uri: "spotify:album:x", name: "X" },
				{ uri: "spotify:album:b", name: "B" },
				{ uri: "spotify:album:y", name: "Y" },
				{ uri: "spotify:album:a", name: "A" },
			];
			const sorted = store.sortByOrder(items);
			expect(sorted.map((i) => i.uri)).toEqual([
				"spotify:album:b",
				"spotify:album:a",
				"spotify:album:x",
				"spotify:album:y",
			]);
		});

		it("returns items in input order when no custom order is set", () => {
			const items = [
				{ uri: "spotify:album:c", name: "C" },
				{ uri: "spotify:album:a", name: "A" },
			];
			const sorted = store.sortByOrder(items);
			expect(sorted.map((i) => i.uri)).toEqual(["spotify:album:c", "spotify:album:a"]);
		});
	});

	describe("reconcile", () => {
		it("no-ops when no order has been saved", () => {
			const listener = vi.fn();
			store.addEventListener("change", listener);
			store.reconcile(["spotify:album:a", "spotify:album:b"]);
			expect(listener).not.toHaveBeenCalled();
			expect(store.getOrder()).toEqual([]);
			store.removeEventListener("change", listener);
		});

		it("removes stale URIs no longer in library", () => {
			store.setOrder(["spotify:album:a", "spotify:album:b", "spotify:album:c"]);
			store.reconcile(["spotify:album:a", "spotify:album:c"]);
			expect(store.getOrder()).toEqual(["spotify:album:a", "spotify:album:c"]);
		});

		it("appends new URIs at the end", () => {
			store.setOrder(["spotify:album:a", "spotify:album:b"]);
			store.reconcile(["spotify:album:a", "spotify:album:b", "spotify:album:c"]);
			expect(store.getOrder()).toEqual(["spotify:album:a", "spotify:album:b", "spotify:album:c"]);
		});

		it("short-circuits without saving when order is unchanged", () => {
			store.setOrder(["spotify:album:a", "spotify:album:b"]);
			const listener = vi.fn();
			store.addEventListener("change", listener);
			store.reconcile(["spotify:album:a", "spotify:album:b"]);
			// Listener is registered after setOrder; reconcile should not fire any change event when order is unchanged
			expect(listener).not.toHaveBeenCalled();
			store.removeEventListener("change", listener);
		});

		it("both removes stale and appends new in one call", () => {
			store.setOrder(["spotify:album:a", "spotify:album:b", "spotify:album:c"]);
			store.reconcile(["spotify:album:b", "spotify:album:d"]);
			expect(store.getOrder()).toEqual(["spotify:album:b", "spotify:album:d"]);
		});
	});

	describe("constructor loading", () => {
		it("loads from localStorage on construction", async () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(["spotify:album:x", "spotify:album:y"]));
			vi.resetModules();
			const mod = await import("../custom_order_store");
			expect(mod.default.getOrder()).toEqual(["spotify:album:x", "spotify:album:y"]);
		});

		it("handles corrupt localStorage gracefully", async () => {
			localStorage.setItem(STORAGE_KEY, "not-valid-json{{{");
			vi.resetModules();
			const mod = await import("../custom_order_store");
			expect(mod.default.getOrder()).toEqual([]);
		});

		it("handles non-array JSON gracefully", async () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "an array" }));
			vi.resetModules();
			const mod = await import("../custom_order_store");
			expect(mod.default.getOrder()).toEqual([]);
		});

		it("filters out non-string values", async () => {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(["spotify:album:a", 42, null, "spotify:album:b"]));
			vi.resetModules();
			const mod = await import("../custom_order_store");
			expect(mod.default.getOrder()).toEqual(["spotify:album:a", "spotify:album:b"]);
		});
	});
});
