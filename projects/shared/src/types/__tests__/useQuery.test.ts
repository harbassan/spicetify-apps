import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useQuery } from "../react_query";

describe("useQuery", () => {
	it("fetches data on mount and transitions to success", async () => {
		const queryFn = vi.fn().mockResolvedValue("hello");

		const { result } = renderHook(() =>
			useQuery({ queryKey: ["test"], queryFn }),
		);

		expect(result.current.status).toBe("pending");

		await waitFor(() => expect(result.current.status).toBe("success"));

		expect(result.current.data).toBe("hello");
		expect(result.current.error).toBeNull();
		expect(queryFn).toHaveBeenCalledTimes(1);
	});

	it("transitions to error on query failure", async () => {
		const queryFn = vi.fn().mockRejectedValue(new Error("fetch failed"));

		const { result } = renderHook(() =>
			useQuery({ queryKey: ["fail"], queryFn }),
		);

		await waitFor(() => expect(result.current.status).toBe("error"));

		expect(result.current.data).toBeUndefined();
		expect(result.current.error).toBeInstanceOf(Error);
		expect(result.current.error!.message).toBe("fetch failed");
	});

	it("normalizes non-Error throws to Error", async () => {
		const queryFn = vi.fn().mockRejectedValue("string error");

		const { result } = renderHook(() =>
			useQuery({ queryKey: ["string-err"], queryFn }),
		);

		await waitFor(() => expect(result.current.status).toBe("error"));
		expect(result.current.error).toBeInstanceOf(Error);
		expect(result.current.error!.message).toBe("string error");
	});

	it("does not fetch when enabled=false", async () => {
		const queryFn = vi.fn().mockResolvedValue("data");

		const { result } = renderHook(() =>
			useQuery({ queryKey: ["disabled"], queryFn, enabled: false }),
		);

		// Give it a tick to ensure nothing fires
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});

		expect(result.current.status).toBe("pending");
		expect(result.current.data).toBeUndefined();
		expect(queryFn).not.toHaveBeenCalled();
	});

	it("fetches when enabled transitions from false to true", async () => {
		const queryFn = vi.fn().mockResolvedValue("delayed");

		const { result, rerender } = renderHook(
			({ enabled }) => useQuery({ queryKey: ["toggle"], queryFn, enabled }),
			{ initialProps: { enabled: false } },
		);

		expect(queryFn).not.toHaveBeenCalled();

		rerender({ enabled: true });

		await waitFor(() => expect(result.current.status).toBe("success"));
		expect(result.current.data).toBe("delayed");
	});

	it("preserves success status when enabled goes false after data loaded", async () => {
		const queryFn = vi.fn().mockResolvedValue("loaded");

		const { result, rerender } = renderHook(
			({ enabled }) => useQuery({ queryKey: ["preserve"], queryFn, enabled }),
			{ initialProps: { enabled: true } },
		);

		await waitFor(() => expect(result.current.status).toBe("success"));
		expect(result.current.data).toBe("loaded");

		rerender({ enabled: false });

		// Status should stay "success" since data exists
		expect(result.current.status).toBe("success");
		expect(result.current.data).toBe("loaded");
	});

	it("refetches when queryKey changes", async () => {
		let callCount = 0;
		const queryFn = vi.fn().mockImplementation(async ({ queryKey }: { queryKey: unknown[] }) => {
			callCount++;
			return `result-${queryKey[1]}`;
		});

		const { result, rerender } = renderHook(
			({ key }) => useQuery({ queryKey: ["rekey", key], queryFn }),
			{ initialProps: { key: "a" } },
		);

		await waitFor(() => expect(result.current.data).toBe("result-a"));

		rerender({ key: "b" });

		await waitFor(() => expect(result.current.data).toBe("result-b"));
		expect(callCount).toBe(2);
	});

	it("ignores stale responses when queryKey changes rapidly", async () => {
		let resolvers: Array<(v: string) => void> = [];
		const queryFn = vi.fn().mockImplementation(
			() => new Promise<string>((resolve) => { resolvers.push(resolve); }),
		);

		const { result, rerender } = renderHook(
			({ key }) => useQuery({ queryKey: ["race", key], queryFn }),
			{ initialProps: { key: "first" } },
		);

		// Key change before first resolves
		rerender({ key: "second" });

		// Resolve second first (it arrived faster)
		resolvers[1]!("second-result");
		await waitFor(() => expect(result.current.data).toBe("second-result"));

		// Resolve first (stale) — should be ignored
		resolvers[0]!("first-result");
		await act(async () => {
			await new Promise((r) => setTimeout(r, 50));
		});

		expect(result.current.data).toBe("second-result");
	});

	it("refetch returns data on success", async () => {
		let callCount = 0;
		const queryFn = vi.fn().mockImplementation(async () => `call-${++callCount}`);

		const { result } = renderHook(() =>
			useQuery({ queryKey: ["refetch-return"], queryFn }),
		);

		await waitFor(() => expect(result.current.status).toBe("success"));

		let refetchResult: unknown;
		await act(async () => {
			refetchResult = await result.current.refetch();
		});

		expect(refetchResult).toBe("call-2");
	});
});
