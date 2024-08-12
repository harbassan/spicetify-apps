const cache: Record<string, unknown> = {};

export const set = <T>(key: string, value: T) => {
	cache[key] = value;
};

const invalidate = (key: string) => {
	delete cache[key];
};

// cache a specific function
export const cacher = <T>(cb: () => Promise<T>) => {
	return async ({ queryKey }: { queryKey: string[] }) => {
		const key = queryKey.join("-");
		if (cache[key]) return cache[key] as T;
		const result = await cb();
		set(key, result);
		return result;
	};
};

// cache a batch function
export const batchCacher = <T>(prefix: string, cb: (ids: string[]) => Promise<T[]>) => {
	return async (ids: string[]) => {
		const cached = ids.map((id) => cache[`${prefix}-${id}`] as T);
		const uncached = ids.filter((_, index) => !cached[index]);
		const results = await cb(uncached);
		results.forEach((result, index) => set(`${prefix}-${uncached[index]}`, result));
		return [...cached.filter(Boolean), ...results];
	};
};

export const invalidator = <T>(queryKey: string[], refetch: () => Promise<T>) => {
	invalidate(queryKey.join("-"));
	refetch();
};
