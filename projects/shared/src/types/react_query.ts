import type {
	QueryClientProvider as QueryClientProviderT,
	QueryClient as QueryClientT,
	useQuery as useQueryT,
	useInfiniteQuery as useInfiniteQueryT,
} from "@tanstack/react-query";

// Accessing Spicetify modules via getters to ensure they are ready
export const useQuery: typeof useQueryT = (...args) => (window.Spicetify.ReactQuery as any).useQuery(...args);
export const useInfiniteQuery: typeof useInfiniteQueryT = (...args) => (window.Spicetify.ReactQuery as any).useInfiniteQuery(...args);
export const getQueryClient = () => (window.Spicetify.ReactQuery as any).QueryClient as QueryClientT;
export const QueryClientProvider: typeof QueryClientProviderT = (...args) => (window.Spicetify.ReactQuery as any).QueryClientProvider(...args);
