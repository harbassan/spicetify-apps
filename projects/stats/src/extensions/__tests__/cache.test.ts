import { describe, it, expect, vi } from "vitest";

// Mock the debug module before importing cache
vi.mock("../debug", () => ({
	statsDebug: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

import { set, cacher, invalidator, getCacheDiagnostics } from "../cache";

describe("cache", () => {
	describe("set and cacher", () => {
		it("cacher returns cached value on cache hit", async () => {
			let callCount = 0;
			const fn = async () => {
				callCount++;
				return "result";
			};

			const cached = cacher(fn);
			const key = ["test", "key"];

			const first = await cached({ queryKey: key });
			const second = await cached({ queryKey: key });

			expect(first).toBe("result");
			expect(second).toBe("result");
			expect(callCount).toBe(1);
		});

		it("cacher calls function on cache miss", async () => {
			let callCount = 0;
			const fn = async () => {
				callCount++;
				return `result-${callCount}`;
			};

			const cached = cacher(fn);

			const first = await cached({ queryKey: ["miss", "a"] });
			const second = await cached({ queryKey: ["miss", "b"] });

			expect(first).toBe("result-1");
			expect(second).toBe("result-2");
			expect(callCount).toBe(2);
		});

		it("cacher uses JSON.stringify for key serialization (no collisions)", async () => {
			let callCount = 0;
			const fn = async () => ++callCount;

			const cached = cacher(fn);

			// These would collide with join("-") but not with JSON.stringify
			await cached({ queryKey: ["a-b", "c"] });
			await cached({ queryKey: ["a", "b-c"] });

			expect(callCount).toBe(2);
		});

		it("cacher handles non-string queryKey elements", async () => {
			let callCount = 0;
			const fn = async () => ++callCount;

			const cached = cacher(fn);

			await cached({ queryKey: ["prefix", 42, true, null] });
			const second = await cached({ queryKey: ["prefix", 42, true, null] });

			expect(callCount).toBe(1);
			expect(second).toBe(1);
		});

		it("cacher distinguishes different non-string keys", async () => {
			let callCount = 0;
			const fn = async () => ++callCount;

			const cached = cacher(fn);

			await cached({ queryKey: ["key", 1] });
			await cached({ queryKey: ["key", "1"] });

			// number 1 vs string "1" should be different keys
			expect(callCount).toBe(2);
		});
	});

	describe("invalidator", () => {
		it("invalidates cached entry and refetches", async () => {
			let callCount = 0;
			const fn = async () => ++callCount;
			const cached = cacher(fn);
			const key = ["invalidate", "test"];

			// Populate cache
			await cached({ queryKey: key });
			expect(callCount).toBe(1);

			// Invalidate and refetch
			const refetch = async () => {
				// Simulate the queryFn being called again through cacher
				return cached({ queryKey: key });
			};

			await invalidator(key, refetch);

			// After invalidation, the cacher should call fn again
			expect(callCount).toBe(2);
		});

		it("uses JSON.stringify for invalidation key matching", async () => {
			let callCount = 0;
			const fn = async () => ++callCount;
			const cached = cacher(fn);
			const key = ["inv", 42];

			await cached({ queryKey: key });
			expect(callCount).toBe(1);

			await invalidator(key, () => cached({ queryKey: key }));
			expect(callCount).toBe(2);
		});
	});

	describe("getCacheDiagnostics", () => {
		it("reports fresh entries", async () => {
			const uniqueKey = `diag-${Date.now()}`;
			set(uniqueKey, "value");

			const diagnostics = getCacheDiagnostics();
			const entry = diagnostics.find((d) => d.key === uniqueKey);

			expect(entry).toBeDefined();
			expect(entry!.status).toBe("fresh");
			expect(entry!.hits).toBe(0);
		});

		it("reports stale entries after invalidation", async () => {
			const fn = async () => "val";
			const cached = cacher(fn);
			const key = ["diag", "stale", `${Date.now()}`];

			await cached({ queryKey: key });
			await invalidator(key, () => Promise.resolve("refetched"));

			const diagnostics = getCacheDiagnostics();
			const stale = diagnostics.find((d) => d.key === JSON.stringify(key) && d.status === "stale");

			expect(stale).toBeDefined();
			expect(stale!.reason).toBe("Manual refresh");
		});
	});
});
