import React from "react";
import { debugLog } from "../extensions/debug";

export const usePopupQuery = <T,>(callback: () => Promise<T>, initialData?: T) => {
	const [error, setError] = React.useState<null | Error>(null);
	const [data, setData] = React.useState<null | T>(initialData ?? null);
	const [status, setStatus] = React.useState<"pending" | "error" | "success">(
		initialData !== undefined ? "success" : "pending",
	);

	React.useEffect(() => {
		// If cached data was provided, sync state and skip fetch.
		if (initialData !== undefined) {
			setData(initialData);
			setStatus("success");
			setError(null);
			return;
		}

		let cancelled = false;
		setStatus("pending");
		setError(null);
		setData(null);
		const fetchData = async () => {
			try {
				const result = await callback();
				if (cancelled) return;
				setData(result);
				setStatus("success");
			} catch (e) {
				debugLog(e);
				if (cancelled) return;
				setError(e as Error);
				setStatus("error");
			}
		};
		fetchData();
		return () => {
			cancelled = true;
		};
	}, [callback]); // eslint-disable-line react-hooks/exhaustive-deps -- initialData is intentionally not a dependency: it is only honored on mount or when `callback` changes. If initialData changes while callback is stable, this effect will not re-run or resync from the new value.

	return { status, error, data };
};
