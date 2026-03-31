import React, { useEffect } from "react";
import SearchBar from "../components/searchbar";
import PageContainer from "@shared/components/page_container";
import SettingsButton from "@shared/components/settings_button";
import type { ConfigWrapper } from "../types/library_types";
import LoadMoreCard from "../components/load_more_card";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";
import { useInfiniteQuery } from "@shared/types/react_query";
import type { GetContentsResponse, ShowItem, UpdateEvent } from "../types/platform";
import useStatus from "@shared/status/useStatus";
import PinIcon from "../components/pin_icon";
import useSortDropdownMenu from "@shared/dropdown/useSortDropdownMenu";
import CustomCard from "../components/custom_card";
import { libraryDebug } from "../extensions/debug";

type SavedShowEntry = {
	added_at: string;
	show: {
		uri: string;
		name: string;
		publisher: string;
		images?: { url: string }[];
		id?: string;
	};
};

type SavedShowsResponse = {
	href?: string;
	items: SavedShowEntry[];
	limit: number;
	offset: number;
	total: number;
	next?: string | null;
	previous?: string | null;
};

type SavedShowItem = ShowItem & {
	addedAt: string;
};

const SHOWS_CACHE_KEY_PREFIX = "library:shows:page:";

type SavedShowsCacheKeyParams = {
	offset: number;
	sortOptionId: string;
	isReversed: boolean;
	textFilter: string;
};

const getAddMenuItems = () => {
	const addShow = () => {
		const onSave = (value: string) => {
			Spicetify.Platform.LibraryAPI.add({ uris: [value] });
		};

		Spicetify.PopupModal.display({
			title: "Add Show",
			// @ts-ignore
			content: <TextInputDialog def={""} placeholder="Show URI" onSave={onSave} />,
		});
	};

	return [
		{ label: "Add Show", iconPath: Spicetify.SVGIcons.podcasts, onClick: addShow },
	];
};

function isValidShow(show: ShowItem) {
	return show.name && show.uri;
}

const sortShows = (shows: SavedShowItem[], sortOrder: string, isReversed: boolean) => {
	const sorted = [...shows].sort((left, right) => {
		if (sortOrder === "1") {
			return new Date(right.addedAt).getTime() - new Date(left.addedAt).getTime();
		}

		return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
	});

	return isReversed ? sorted.reverse() : sorted;
};

const SPOTIFY_SHOWS_LIMIT = 50;
const LIBRARY_SHOWS_LIMIT = 200;

const sortOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
];

const getShowsCacheKey = ({ offset, sortOptionId, isReversed, textFilter }: SavedShowsCacheKeyParams) => {
	const normalizedFilter = textFilter.trim().toLocaleLowerCase();
	return `${SHOWS_CACHE_KEY_PREFIX}${offset}:${sortOptionId}:${isReversed ? "reverse" : "forward"}:${normalizedFilter}`;
};

const persistCachedShows = (params: SavedShowsCacheKeyParams, response: SavedShowsResponse) => {
	try {
		localStorage.setItem(getShowsCacheKey(params), JSON.stringify(response));
	} catch {
		libraryDebug.warn("Shows: failed to persist cached response", params);
	}
	return response;
};

const loadCachedShows = (params: SavedShowsCacheKeyParams) => {
	try {
		const raw = localStorage.getItem(getShowsCacheKey(params));
		if (!raw) return null;
		return JSON.parse(raw) as SavedShowsResponse;
	} catch {
		libraryDebug.warn("Shows: failed to read cached response", params);
		return null;
	}
};

const toSavedShowResponse = (response: GetContentsResponse<ShowItem>): SavedShowsResponse => {
	const nextOffset = response.offset + response.limit;
	return {
		items: (response.items ?? []).map((show) => ({
			added_at: new Date(show.addedAt ?? Date.now()).toISOString(),
			show: {
				uri: show.uri,
				name: show.name,
				publisher: show.publisher,
				images: show.images,
				id: show.uri.split(":").at(-1),
			},
		})),
		limit: response.limit,
		offset: response.offset,
		total: response.totalLength,
		next: response.totalLength > nextOffset ? String(nextOffset) : null,
		previous: response.offset > 0 ? String(Math.max(0, response.offset - response.limit)) : null,
	};
};

const ShowsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [sortDropdown, sortOption, isReversed] = useSortDropdownMenu(sortOptions, "library:shows");
	const [textFilter, setTextFilter] = React.useState("");

	const fetchShows = async ({ pageParam }: { pageParam: number }) => {
		const cacheParams = {
			offset: pageParam,
			sortOptionId: sortOption.id,
			isReversed,
			textFilter,
		};
		libraryDebug.info(`Shows: fetching page offset=${pageParam}, sort=${sortOption.id}, reversed=${isReversed}`);

		const tryLibraryApiFallback = async () => {
			try {
				const response = (await Spicetify.Platform.LibraryAPI.getContents({
					filters: ["3"],
					sortOrder: sortOption.id,
					textFilter,
					offset: pageParam,
					sortDirection: isReversed ? "reverse" : undefined,
					limit: LIBRARY_SHOWS_LIMIT,
				})) as GetContentsResponse<ShowItem>;

				libraryDebug.info("Shows: LibraryAPI fallback result", {
					offset: response.offset,
					totalLength: response.totalLength,
					itemCount: response.items?.length,
					availableFilters: response.availableFilters?.map((filter) => filter.id),
				});

				if (response.items?.length) {
					return persistCachedShows(cacheParams, toSavedShowResponse(response));
				}
			} catch (error) {
				libraryDebug.warn("Shows: LibraryAPI fallback failed", {
					error: error instanceof Error ? error.message : String(error),
				});
			}

			return null;
		};

		const token = Spicetify.Platform?.AuthorizationAPI?.getState?.()?.token?.accessToken;
		if (!token) {
			libraryDebug.error("Shows: no Spotify access token available");
			throw new Error("Spotify access token unavailable for saved shows");
		}

		const response = await fetch(
			`https://api.spotify.com/v1/me/shows?limit=${SPOTIFY_SHOWS_LIMIT}&offset=${pageParam}`,
			{
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
			},
			},
		);
		const raw = (await response.json().catch(() => ({}))) as Partial<SavedShowsResponse> & {
			error?: { status?: number; message?: string };
		};

		libraryDebug.info(`Shows: response status=${response.status}`, {
			ok: response.ok,
			keys: Object.keys(raw ?? {}),
			error: raw.error,
			retryAfter: response.headers.get("Retry-After"),
		});

		if (!response.ok) {
			if (response.status === 429) {
				const libraryFallback = await tryLibraryApiFallback();
				if (libraryFallback) {
					libraryDebug.warn("Shows: using LibraryAPI fallback after Spotify rate limit", {
						offset: pageParam,
					});
					return libraryFallback;
				}

				const cachedResponse = loadCachedShows(cacheParams);
				if (cachedResponse) {
					libraryDebug.warn("Shows: using cached response after Spotify rate limit", {
						...cacheParams,
						itemCount: cachedResponse.items?.length,
						total: cachedResponse.total,
					});
					return cachedResponse;
				}
			}

			throw new Error(raw.error?.message || `Saved shows request failed (${response.status})`);
		}

		const res = persistCachedShows(cacheParams, raw as SavedShowsResponse);
		libraryDebug.info(`Shows: got ${res.items?.length ?? 0} items (total: ${res.total ?? 0})`, {
			offset: res.offset,
			totalLength: res.total,
			itemCount: res.items?.length,
			next: res.next,
		});
		return res;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:shows", sortOption.id, isReversed, textFilter],
		queryFn: fetchShows,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const current = lastPage.offset + lastPage.limit;
			if (lastPage.total > current) return current;
		},
	});

	useEffect(() => {
		const update = (e: UpdateEvent) => {
			if (e.data.list === "shows") refetch();
		};
		Spicetify.Platform.LibraryAPI.getEvents()._emitter.addListener("update", update, {});
		return () => {
			Spicetify.Platform.LibraryAPI.getEvents()._emitter.removeListener("update", update);
		};
	}, [refetch]);

	const Status = useStatus(status, error);
	const EmptyStatus = useStatus("error", new Error("No shows found")) as React.ReactElement;

	const props = {
		lhs: ["Shows"],
		rhs: [
			<AddButton menuItems={getAddMenuItems()} />,
			sortDropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Shows" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const contents = data as NonNullable<typeof data>;

	const shows = sortShows(
		contents.pages.flatMap((page) =>
			(page.items ?? []).map(
				(entry) =>
					({
						...entry.show,
						addedAt: entry.added_at,
					}) as SavedShowItem,
				),
		),
		sortOption.id,
		isReversed,
	).filter((show) => {
		if (!textFilter) return true;
		const query = textFilter.trim().toLocaleLowerCase();
		return (
			show.name.toLocaleLowerCase().includes(query) ||
			show.publisher?.toLocaleLowerCase().includes(query)
		);
	});

	if (shows.length === 0) {
		return <PageContainer {...props}>{EmptyStatus}</PageContainer>;
	}

	const showCards = shows.filter(isValidShow).map((show) => (
		<CustomCard
			key={show.uri}
			type="show"
			uri={show.uri}
			header={show.name}
			subheader={show.publisher}
			imageUrl={show.images?.[0]?.url}
			badge={show.pinned ? <PinIcon /> : undefined}
		/>
	));

	if (hasNextPage) showCards.push(<LoadMoreCard key="load-more" callback={fetchNextPage} />);

	const totalShows =
		contents.pages[0] && "total" in contents.pages[0] && typeof contents.pages[0].total === "number"
			? contents.pages[0].total
			: shows.length;

	return (
		<PageContainer {...props}>
			{configWrapper.config["show-item-count"] ? (
				<div className="library-item-count">
					Loaded {shows.length} of {totalShows} shows
				</div>
			) : null}
			<div className={"main-gridContainer-gridContainer grid"}>{showCards}</div>
		</PageContainer>
	);
};

export default ShowsPage;
