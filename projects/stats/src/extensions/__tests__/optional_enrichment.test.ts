import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../debug", () => ({
	statsDebug: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		setActivity: vi.fn(),
		clearActivity: vi.fn(),
	},
}));

// We need fresh module state per test because of module-level queue/timing state
let runOptionalEnrichment: typeof import("../optional_enrichment").runOptionalEnrichment;

describe("runOptionalEnrichment", () => {
	beforeEach(async () => {
		vi.useFakeTimers();
		vi.resetModules();

		vi.doMock("../debug", () => ({
			statsDebug: {
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				setActivity: vi.fn(),
				clearActivity: vi.fn(),
			},
		}));

		const mod = await import("../optional_enrichment");
		runOptionalEnrichment = mod.runOptionalEnrichment;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("resolves with the task result", async () => {
		const promise = runOptionalEnrichment({
			key: "test-resolve",
			label: "Test Resolve",
			task: async () => "hello",
		});

		// Advance past startup delay + processing
		await vi.advanceTimersByTimeAsync(2000);

		const result = await promise;
		expect(result).toBe("hello");
	});

	it("rejects when the task throws", async () => {
		const promise = runOptionalEnrichment({
			key: "test-reject",
			label: "Test Reject",
			task: async () => {
				throw new Error("task failed");
			},
		});

		// Attach handler before advancing timers to prevent unhandled rejection
		const rejection = expect(promise).rejects.toThrow("task failed");

		await vi.advanceTimersByTimeAsync(2000);

		await rejection;
	});

	it("deduplicates requests with the same key", async () => {
		const task = vi.fn(async () => 42);

		const p1 = runOptionalEnrichment({ key: "dedup", label: "Dedup", task });
		const p2 = runOptionalEnrichment({ key: "dedup", label: "Dedup", task });

		await vi.advanceTimersByTimeAsync(2000);

		const [r1, r2] = await Promise.all([p1, p2]);
		expect(r1).toBe(42);
		expect(r2).toBe(42);
		// Task should only be executed once
		expect(task).toHaveBeenCalledTimes(1);
	});

	it("processes tasks sequentially (MAX_CONCURRENT_TASKS=1)", async () => {
		const order: string[] = [];

		const p1 = runOptionalEnrichment({
			key: "seq-1",
			label: "Seq 1",
			task: async () => {
				order.push("start-1");
				order.push("end-1");
				return 1;
			},
		});

		const p2 = runOptionalEnrichment({
			key: "seq-2",
			label: "Seq 2",
			task: async () => {
				order.push("start-2");
				order.push("end-2");
				return 2;
			},
		});

		// Advance past startup delay for first task
		await vi.advanceTimersByTimeAsync(1600);
		// Advance past REQUEST_GAP_MS for second task
		await vi.advanceTimersByTimeAsync(500);

		const [r1, r2] = await Promise.all([p1, p2]);
		expect(r1).toBe(1);
		expect(r2).toBe(2);
		// First task should complete before second starts
		expect(order.indexOf("end-1")).toBeLessThan(order.indexOf("start-2"));
	});

	it("allows new tasks with same key after completion", async () => {
		const task1 = vi.fn(async () => "first");
		const task2 = vi.fn(async () => "second");

		const p1 = runOptionalEnrichment({ key: "reuse", label: "Reuse", task: task1 });
		await vi.advanceTimersByTimeAsync(2000);
		const r1 = await p1;
		expect(r1).toBe("first");

		// After completion, a new task with same key should run
		const p2 = runOptionalEnrichment({ key: "reuse", label: "Reuse", task: task2 });
		await vi.advanceTimersByTimeAsync(1000);
		const r2 = await p2;
		expect(r2).toBe("second");
		expect(task2).toHaveBeenCalledTimes(1);
	});
});
