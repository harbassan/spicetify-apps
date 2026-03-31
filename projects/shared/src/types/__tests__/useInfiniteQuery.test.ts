import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useInfiniteQuery } from "../react_query";

// Helper: creates a paginated data source
// Pages are arrays of items, getNextPageParam returns next offset or undefined
type Page = { items: string[]; nextOffset: number | undefined };

const makePaginatedFn = (pages: Page[]) => {
	return vi.fn().mockImplementation(async ({ pageParam }: { pageParam: number }) => {
		const page = pages.find((_, i) => {
			const offset = i === 0 ? 0 : pages[i - 1]!.nextOffset;
			return offset === pageParam;
		});
		if (!page) throw new Error(`No page for param ${pageParam}`);
		return page;
	});
};

const defaultGetNextPageParam = (lastPage: Page) => lastPage.nextOffset;

describe("useInfiniteQuery", () => {
	it("loads initial page and transitions to success", async () => {
		const page1: Page = { items: ["a", "b"], nextOffset: 2 };
		const queryFn = vi.fn().mockResolvedValue(page1);

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-basic"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		expect(result.current.status).toBe("pending");

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(result.current.data!.pages).toHaveLength(1);
		expect(result.current.data!.pages[0]).toEqual(page1);
		expect(result.current.hasNextPage).toBe(true);
		expect(result.current.error).toBeNull();
	});

	it("reports hasNextPage=false when no more pages", async () => {
		const page1: Page = { items: ["a"], nextOffset: undefined };
		const queryFn = vi.fn().mockResolvedValue(page1);

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-no-next"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("success"));
		expect(result.current.hasNextPage).toBe(false);
	});

	it("fetchNextPage appends pages", async () => {
		const page1: Page = { items: ["a"], nextOffset: 1 };
		const page2: Page = { items: ["b"], nextOffset: undefined };

		const queryFn = vi.fn()
			.mockResolvedValueOnce(page1)
			.mockResolvedValueOnce(page2);

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-paginate"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("success"));
		expect(result.current.hasNextPage).toBe(true);

		await act(async () => {
			await result.current.fetchNextPage();
		});

		expect(result.current.data!.pages).toHaveLength(2);
		expect(result.current.data!.pages[1]).toEqual(page2);
		expect(result.current.hasNextPage).toBe(false);
	});

	it("fetchNextPage is a no-op when no more pages", async () => {
		const page1: Page = { items: ["a"], nextOffset: undefined };
		const queryFn = vi.fn().mockResolvedValue(page1);

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-noop"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("success"));

		await act(async () => {
			await result.current.fetchNextPage();
		});

		expect(result.current.data!.pages).toHaveLength(1);
		expect(queryFn).toHaveBeenCalledTimes(1);
	});

	it("prevents concurrent fetchNextPage calls", async () => {
		const page1: Page = { items: ["a"], nextOffset: 1 };
		let resolveNext: ((v: Page) => void) | undefined;
		const page2Promise = new Promise<Page>((r) => { resolveNext = r; });

		const queryFn = vi.fn()
			.mockResolvedValueOnce(page1)
			.mockReturnValueOnce(page2Promise);

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-concurrent"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("success"));

		// Start first fetchNextPage (will be pending)
		let firstDone = false;
		act(() => {
			result.current.fetchNextPage().then(() => { firstDone = true; });
		});

		// Try second while first is in-flight — should be ignored
		await act(async () => {
			await result.current.fetchNextPage();
		});

		// Only 2 calls total: initial + one fetchNextPage (second was blocked)
		expect(queryFn).toHaveBeenCalledTimes(2);

		// Resolve the pending fetch
		resolveNext!({ items: ["b"], nextOffset: undefined });
		await waitFor(() => expect(result.current.data!.pages).toHaveLength(2));
	});

	it("fetchNextPage flag resets after completion, allowing further pagination", async () => {
		const page1: Page = { items: ["a"], nextOffset: 1 };
		const page2: Page = { items: ["b"], nextOffset: 2 };
		const page3: Page = { items: ["c"], nextOffset: undefined };

		const queryFn = vi.fn()
			.mockResolvedValueOnce(page1)
			.mockResolvedValueOnce(page2)
			.mockResolvedValueOnce(page3);

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-sequential"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("success"));

		await act(async () => {
			await result.current.fetchNextPage();
		});
		expect(result.current.data!.pages).toHaveLength(2);

		await act(async () => {
			await result.current.fetchNextPage();
		});
		expect(result.current.data!.pages).toHaveLength(3);
		expect(result.current.hasNextPage).toBe(false);
	});

	it("does not fetch when enabled=false", async () => {
		const queryFn = vi.fn().mockResolvedValue({ items: ["a"], nextOffset: undefined });

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-disabled"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
				enabled: false,
			}),
		);

		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});

		expect(result.current.status).toBe("pending");
		expect(queryFn).not.toHaveBeenCalled();
	});

	it("transitions to error on initial load failure", async () => {
		const queryFn = vi.fn().mockRejectedValue(new Error("load failed"));

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-error"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("error"));
		expect(result.current.error!.message).toBe("load failed");
	});

	it("transitions to error on fetchNextPage failure", async () => {
		const page1: Page = { items: ["a"], nextOffset: 1 };
		const queryFn = vi.fn()
			.mockResolvedValueOnce(page1)
			.mockRejectedValueOnce(new Error("page 2 failed"));

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-next-error"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("success"));

		await act(async () => {
			await result.current.fetchNextPage();
		});

		expect(result.current.status).toBe("error");
		expect(result.current.error!.message).toBe("page 2 failed");
	});

	it("refetch resets data to first page", async () => {
		const page1: Page = { items: ["a"], nextOffset: 1 };
		const page2: Page = { items: ["b"], nextOffset: undefined };
		const page1v2: Page = { items: ["a-refreshed"], nextOffset: 1 };

		const queryFn = vi.fn()
			.mockResolvedValueOnce(page1)
			.mockResolvedValueOnce(page2)
			.mockResolvedValueOnce(page1v2);

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-refetch"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("success"));

		await act(async () => {
			await result.current.fetchNextPage();
		});
		expect(result.current.data!.pages).toHaveLength(2);

		await act(async () => {
			await result.current.refetch();
		});

		// After refetch, only first page should be present
		expect(result.current.data!.pages).toHaveLength(1);
		expect(result.current.data!.pages[0]).toEqual(page1v2);
	});

	it("loadInitial resets fetchNextPage flag (stuck flag prevention)", async () => {
		// This tests the specific bug that was fixed: if loadInitial fires
		// while fetchNextPage is in-flight, the pagination flag should be reset
		const page1: Page = { items: ["a"], nextOffset: 1 };
		let resolveFetchNext: ((v: Page) => void) | undefined;
		const page2Promise = new Promise<Page>((r) => { resolveFetchNext = r; });
		const page1v2: Page = { items: ["a-v2"], nextOffset: 1 };
		const page2v2: Page = { items: ["b-v2"], nextOffset: undefined };

		const queryFn = vi.fn()
			.mockResolvedValueOnce(page1)      // initial load
			.mockReturnValueOnce(page2Promise)  // fetchNextPage (will be pending)
			.mockResolvedValueOnce(page1v2)     // refetch
			.mockResolvedValueOnce(page2v2);    // second fetchNextPage after refetch

		const { result } = renderHook(() =>
			useInfiniteQuery({
				queryKey: ["inf-stuck"],
				queryFn,
				initialPageParam: 0,
				getNextPageParam: defaultGetNextPageParam,
			}),
		);

		await waitFor(() => expect(result.current.status).toBe("success"));

		// Start fetchNextPage (will hang on page2Promise)
		act(() => {
			result.current.fetchNextPage();
		});

		// Refetch while fetchNextPage is in-flight
		// loadInitial should reset isFetchingNextPageRef
		await act(async () => {
			await result.current.refetch();
		});

		// Resolve the stale fetchNextPage — should be ignored (requestId mismatch)
		resolveFetchNext!({ items: ["stale"], nextOffset: undefined });
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});

		// Should have refetched page, not the stale one
		expect(result.current.data!.pages).toHaveLength(1);
		expect(result.current.data!.pages[0]).toEqual(page1v2);

		// fetchNextPage should work again (flag was reset by loadInitial)
		await act(async () => {
			await result.current.fetchNextPage();
		});

		expect(result.current.data!.pages).toHaveLength(2);
		expect(result.current.data!.pages[1]).toEqual(page2v2);
	});

	it("stale fetchNextPage response is ignored after queryKey change", async () => {
		const page1a: Page = { items: ["a"], nextOffset: 1 };
		let resolveFetchA: ((v: Page) => void) | undefined;
		const page2aPromise = new Promise<Page>((r) => { resolveFetchA = r; });
		const page1b: Page = { items: ["b"], nextOffset: undefined };

		const queryFn = vi.fn()
			.mockResolvedValueOnce(page1a)      // initial for key A
			.mockReturnValueOnce(page2aPromise)  // fetchNextPage for A (pending)
			.mockResolvedValueOnce(page1b);      // initial for key B

		const { result, rerender } = renderHook(
			({ queryKey }) =>
				useInfiniteQuery({
					queryKey,
					queryFn,
					initialPageParam: 0,
					getNextPageParam: defaultGetNextPageParam,
				}),
			{ initialProps: { queryKey: ["inf-keychange", "a"] as unknown[] } },
		);

		await waitFor(() => expect(result.current.status).toBe("success"));

		// Start fetchNextPage for key A
		act(() => {
			result.current.fetchNextPage();
		});

		// Change key while fetchNextPage is in-flight
		rerender({ queryKey: ["inf-keychange", "b"] });

		await waitFor(() =>
			expect(result.current.data!.pages[0]).toEqual(page1b),
		);

		// Resolve stale fetch — should be ignored
		resolveFetchA!({ items: ["stale-a"], nextOffset: undefined });
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});

		// Only page1b should be present
		expect(result.current.data!.pages).toHaveLength(1);
		expect(result.current.data!.pages[0]).toEqual(page1b);
	});
});
