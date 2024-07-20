import type {
	QueryClientProvider as QueryClientProviderT,
	QueryClient as QueryClientT,
	useQuery as useQueryT,
} from "@tanstack/react-query";
interface ReactQueryTypes {
	useQuery: typeof useQueryT;
	QueryClient: typeof QueryClientT;
	QueryClientProvider: typeof QueryClientProviderT;
}

export const ReactQuery = Spicetify.ReactQuery as ReactQueryTypes;

export const useQuery = ReactQuery.useQuery;
export const QueryClient = ReactQuery.QueryClient;
export const QueryClientProvider = ReactQuery.QueryClientProvider;
