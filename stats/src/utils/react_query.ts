import type { useQuery as useQueryT } from "@tanstack/react-query";
interface ReactQueryTypes {
	useQuery: typeof useQueryT;
}

export const ReactQuery = Spicetify.ReactQuery as ReactQueryTypes;

export const useQuery = ReactQuery.useQuery;
