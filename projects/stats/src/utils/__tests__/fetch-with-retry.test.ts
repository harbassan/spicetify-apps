import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	fetchWithRetry,
	type RetryConfig,
} from "../fetch-with-retry";

const TEST_URL = "https://example.com/resource";
const TEST_OPTIONS: RequestInit = {
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ hello: "world" }),
};

const originalFetch = globalThis.fetch;

const makeResponse = (status: number, headers?: HeadersInit) =>
	new Response(null, { status, headers });

const createLogger = (): NonNullable<RetryConfig["logger"]> => ({
	info: vi.fn(),
	warn: vi.fn(),
});

describe("fetchWithRetry", () => {
	let fetchMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.useFakeTimers();
		fetchMock = vi.fn();
		globalThis.fetch = fetchMock as typeof globalThis.fetch;
	});

	afterEach(() => {
		vi.clearAllTimers();
		vi.restoreAllMocks();
		vi.useRealTimers();

		if (originalFetch === undefined) {
			Reflect.deleteProperty(globalThis, "fetch");
		} else {
			globalThis.fetch = originalFetch;
		}
	});

	it("returns a 200 response without retrying", async () => {
		const response = makeResponse(200);
		fetchMock.mockResolvedValueOnce(response);

		const result = await fetchWithRetry(TEST_URL, TEST_OPTIONS);

		expect(result).toBe(response);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock).toHaveBeenCalledWith(TEST_URL, TEST_OPTIONS);
	});

	it.each([500, 403])("returns non-429 status %i directly without retrying", async (status) => {
		const response = makeResponse(status);
		fetchMock.mockResolvedValueOnce(response);

		const result = await fetchWithRetry(TEST_URL);

		expect(result).toBe(response);
		expect(result.status).toBe(status);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("retries 429 responses using the Retry-After header value in seconds", async () => {
		const rateLimited = makeResponse(429, { "Retry-After": "2" });
		const success = makeResponse(200);
		fetchMock.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(success);

		const promise = fetchWithRetry(TEST_URL);

		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1_999);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		const result = await promise;
		expect(result).toBe(success);
	});

	it("falls back to exponential backoff when 429 has no Retry-After header", async () => {
		const rateLimited = makeResponse(429);
		const success = makeResponse(200);
		fetchMock.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(success);

		const promise = fetchWithRetry(TEST_URL);

		await vi.advanceTimersByTimeAsync(999);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		const result = await promise;
		expect(result).toBe(success);
	});

	it.each([
		["empty", ""],
		["whitespace", "   "],
	])("falls back to backoff when Retry-After is %s", async (_label, retryAfter) => {
		const rateLimited = makeResponse(429, { "Retry-After": retryAfter });
		const success = makeResponse(200);
		fetchMock.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(success);

		const promise = fetchWithRetry(TEST_URL);

		await vi.advanceTimersByTimeAsync(999);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		const result = await promise;
		expect(result).toBe(success);
	});

	it("falls back to backoff when Retry-After is negative", async () => {
		const rateLimited = makeResponse(429, { "Retry-After": "-5" });
		const success = makeResponse(200);
		fetchMock.mockResolvedValueOnce(rateLimited).mockResolvedValueOnce(success);

		const promise = fetchWithRetry(TEST_URL);

		await vi.advanceTimersByTimeAsync(999);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		const result = await promise;
		expect(result).toBe(success);
	});

	it("returns the final 429 response after exhausting retries", async () => {
		const finalResponse = makeResponse(429);
		fetchMock
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(finalResponse);

		const promise = fetchWithRetry(TEST_URL, {}, { maxRetries: 2 });

		await vi.advanceTimersByTimeAsync(1_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(2_000);
		expect(fetchMock).toHaveBeenCalledTimes(3);

		const result = await promise;
		expect(result).toBe(finalResponse);
		expect(result.status).toBe(429);
	});

	it("retries thrown network errors and eventually throws the last error", async () => {
		fetchMock.mockRejectedValue(new Error("offline"));

		const promise = fetchWithRetry(TEST_URL);
		const rejection = expect(promise).rejects.toThrow("offline");

		await vi.advanceTimersByTimeAsync(1_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(2_000);
		expect(fetchMock).toHaveBeenCalledTimes(3);

		await vi.advanceTimersByTimeAsync(4_000);
		expect(fetchMock).toHaveBeenCalledTimes(4);

		await rejection;
	});

	it("recovers from transient network errors and returns a later success", async () => {
		const success = makeResponse(200);
		fetchMock
			.mockRejectedValueOnce(new Error("temporary outage"))
			.mockRejectedValueOnce(new Error("still down"))
			.mockResolvedValueOnce(success);

		const promise = fetchWithRetry(TEST_URL);

		await vi.advanceTimersByTimeAsync(1_000);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(2_000);
		expect(fetchMock).toHaveBeenCalledTimes(3);

		const result = await promise;
		expect(result).toBe(success);
	});

	it("grows exponential backoff as 1s, 2s, then 4s", async () => {
		const success = makeResponse(200);
		fetchMock
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(success);

		const promise = fetchWithRetry(TEST_URL);

		await vi.advanceTimersByTimeAsync(999);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(1_999);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(3);

		await vi.advanceTimersByTimeAsync(3_999);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(4);

		const result = await promise;
		expect(result).toBe(success);
	});

	it("caps backoff at maxBackoffMs", async () => {
		const success = makeResponse(200);
		fetchMock
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(success);

		const promise = fetchWithRetry(TEST_URL, {}, {
			maxRetries: 3,
			initialBackoffMs: 100,
			maxBackoffMs: 150,
			backoffMultiplier: 10,
		});

		await vi.advanceTimersByTimeAsync(99);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(149);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(3);

		await vi.advanceTimersByTimeAsync(149);
		expect(fetchMock).toHaveBeenCalledTimes(3);
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(4);

		const result = await promise;
		expect(result).toBe(success);
	});

	it("calls logger.warn with the expected retry messages", async () => {
		const logger = createLogger();
		const success = makeResponse(200);
		fetchMock
			.mockResolvedValueOnce(makeResponse(429))
			.mockRejectedValueOnce(new Error("socket hang up"))
			.mockResolvedValueOnce(success);

		const promise = fetchWithRetry(TEST_URL, {}, { logger });

		await vi.advanceTimersByTimeAsync(1_000);
		await vi.advanceTimersByTimeAsync(2_000);

		const result = await promise;

		expect(result).toBe(success);
		expect(logger.info).not.toHaveBeenCalled();
		expect(logger.warn).toHaveBeenNthCalledWith(
			1,
			`fetchWithRetry: 429 rate limited, backing off (url=${TEST_URL}, attempt=1/4, waitMs=1000)`,
		);
		expect(logger.warn).toHaveBeenNthCalledWith(
			2,
			`fetchWithRetry: network error, backing off (url=${TEST_URL}, attempt=2/4, backoffMs=2000, error=socket hang up)`,
		);
	});

	it("honors custom retry config overrides", async () => {
		const logger = createLogger();
		const success = makeResponse(200);
		fetchMock
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(makeResponse(429))
			.mockResolvedValueOnce(success);

		const promise = fetchWithRetry(TEST_URL, TEST_OPTIONS, {
			maxRetries: 2,
			initialBackoffMs: 250,
			maxBackoffMs: 500,
			backoffMultiplier: 3,
			logger,
		});

		await vi.advanceTimersByTimeAsync(249);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(2);

		await vi.advanceTimersByTimeAsync(499);
		expect(fetchMock).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(fetchMock).toHaveBeenCalledTimes(3);

		const result = await promise;

		expect(result).toBe(success);
		expect(fetchMock).toHaveBeenNthCalledWith(1, TEST_URL, TEST_OPTIONS);
		expect(fetchMock).toHaveBeenNthCalledWith(2, TEST_URL, TEST_OPTIONS);
		expect(fetchMock).toHaveBeenNthCalledWith(3, TEST_URL, TEST_OPTIONS);
		expect(logger.warn).toHaveBeenNthCalledWith(
			1,
			`fetchWithRetry: 429 rate limited, backing off (url=${TEST_URL}, attempt=1/3, waitMs=250)`,
		);
		expect(logger.warn).toHaveBeenNthCalledWith(
			2,
			`fetchWithRetry: 429 rate limited, backing off (url=${TEST_URL}, attempt=2/3, waitMs=500)`,
		);
	});
});