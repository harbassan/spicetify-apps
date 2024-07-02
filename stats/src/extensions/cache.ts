const cache: Record<string, unknown> = {};

const set = <T>(key: string, value: T) => {
	cache[key] = value;
};

const invalidate = (key: string) => {
	delete cache[key];
};

export const cacher = <T>(cb: () => Promise<T>) => {
	return async ({ queryKey }: { queryKey: string[] }) => {
		const key = queryKey.join("-");
		if (cache[key]) return cache[key] as T;
		const result = await cb();
		set(key, result);
		return result;
	};
};

export const invalidator = <T>(queryKey: string[], refetch: () => Promise<T>) => {
	invalidate(queryKey.join("-"));
	refetch();
};
