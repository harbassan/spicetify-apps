import React from "react";

type QueryStatus = "pending" | "error" | "success";

type QueryContext<TQueryKey extends readonly unknown[]> = {
	queryKey: TQueryKey;
};

type QueryOptions<TData, TQueryKey extends readonly unknown[]> = {
	queryKey: TQueryKey;
	queryFn: (context: QueryContext<TQueryKey>) => Promise<TData>;
	enabled?: boolean;
};

type QueryResult<TData> = {
	status: QueryStatus;
	error: Error | null;
	data: TData | null;
	refetch: () => Promise<TData | undefined>;
};

const getQueryKeyId = (queryKey: readonly unknown[]) => JSON.stringify(queryKey);

export function useQuery<TData, TQueryKey extends readonly unknown[] = readonly unknown[]>(
	options: QueryOptions<TData, TQueryKey>,
): QueryResult<TData> {
	const { queryKey, queryFn, enabled = true } = options;
	const queryKeyId = getQueryKeyId(queryKey);
	const latestRef = React.useRef({ queryKey, queryFn });
	const [status, setStatus] = React.useState<QueryStatus>(enabled ? "pending" : "success");
	const [error, setError] = React.useState<Error | null>(null);
	const [data, setData] = React.useState<TData | null>(null);
	const latestDataRef = React.useRef<TData | null>(null);

	React.useEffect(() => {
		latestRef.current = { queryKey, queryFn };
	}, [queryKeyId, queryFn, queryKey]);

	React.useEffect(() => {
		latestDataRef.current = data;
	}, [data]);

	const executeQuery = React.useCallback(async () => {
		if (!enabled) return latestDataRef.current ?? undefined;

		setStatus("pending");
		setError(null);

		try {
			const nextData = await latestRef.current.queryFn({ queryKey: latestRef.current.queryKey });
			setData(nextData);
			setStatus("success");
			return nextData;
		} catch (queryError) {
			setError(queryError as Error);
			setStatus("error");
			return undefined;
		}
	}, [enabled]);

	React.useEffect(() => {
		if (!enabled) return;
		void executeQuery();
	}, [enabled, executeQuery, queryKeyId]);

	return {
		status,
		error,
		data,
		refetch: executeQuery,
	};
}