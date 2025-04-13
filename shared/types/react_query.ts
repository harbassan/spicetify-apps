import type {
	QueryClientProvider as QueryClientProviderT,
	QueryClient as QueryClientT,
	useQuery as useQueryT,
	useInfiniteQuery as useInfiniteQueryT,
} from "@tanstack/react-query";


export const ReactQuery = Spicetify.ReactQuery;

export const useQuery: typeof useQueryT = (...args) => ReactQuery.useQuery(...args);
export const useInfiniteQuery: typeof useInfiniteQueryT = (...args) => ReactQuery.useInfiniteQuery(...args);
export const getQueryClient = () => ReactQuery.QueryClient as QueryClientT;
export const QueryClientProvider: typeof QueryClientProviderT = (...args) => ReactQuery.QueryClientProvider(...args);
