import React, { useEffect } from "react";
import SearchBar from "../components/searchbar";
import type { ConfigWrapper } from "../types/library_types";
import SettingsButton from "@shared/components/settings_button";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import SpotifyCard from "@shared/components/spotify_card";
import CustomCard from "../components/custom_card";
import LoadMoreCard from "../components/load_more_card";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";
import useStatus from "@shared/status/useStatus";
import { useInfiniteQuery, useQuery } from "@shared/types/react_query";
import type { AlbumItem, GetContentsResponse, UpdateEvent } from "../types/platform";
import PinIcon from "../components/pin_icon";
import useSortDropdownMenu from "@shared/dropdown/useSortDropdownMenu";
import collectionSort from "../utils/collection_sort";
import customOrderStore from "../utils/custom_order_store";
import ReorderModal from "../components/reorder_modal";

import { libraryDebug } from "../extensions/debug";

const getAddMenuItems = () => {
	const addAlbum = () => {
		const onSave = (value: string) => {
			Spicetify.Platform.LibraryAPI.add({ uris: [value] });
		};

		Spicetify.PopupModal.display({
			title: "Add Album",
			// @ts-ignore
			content: <TextInputDialog def={""} placeholder="Album URI" onSave={onSave} />,
		});
	};

	return [
		{ label: "Add Album", iconPath: Spicetify.SVGIcons.album, onClick: addAlbum },
	];
};

const limit = 200;

const sortOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
	{ id: "2", name: "Artist Name" },
	{ id: "3", name: "Release Year" },
	{ id: "6", name: "Recents" },
	{ id: "custom", name: "Custom Order" },
];

const filterOptions = [
	{ id: "0", name: "All" },
	{ id: "1", name: "Albums" },
	{ id: "2", name: "Local Albums" },
];

function isValidAlbum(album: AlbumItem) {
	const primaryArtist = album.artists?.[0];
	return album.name && album.uri && primaryArtist?.name;
}

const AlbumsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [sortDropdown, sortOption, isReversed] = useSortDropdownMenu(sortOptions, "library:albums", ["custom"]);
	const [filterDropdown, filterOption] = useDropdownMenu(filterOptions);
	const [textFilter, setTextFilter] = React.useState("");

	const isCustomOrder = sortOption.id === "custom";
	const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
	const [customPage, setCustomPage] = React.useState(1);

	const fetchAlbums = async ({ pageParam }: { pageParam: number }) => {
		if (isCustomOrder) return { items: [], totalLength: 0, offset: 0 } as unknown as GetContentsResponse<AlbumItem>;
		libraryDebug.info(`Albums: fetching page offset=${pageParam}, sort=${sortOption.id}, reversed=${isReversed}`);
		const res = (await Spicetify.Platform.LibraryAPI.getContents({
			filters: ["0"],
			sortOrder: sortOption.id,
			textFilter,
			sortDirection: isReversed ? "reverse" : undefined,
			offset: pageParam,
			limit,
		})) as GetContentsResponse<AlbumItem>;
		libraryDebug.info(`Albums: got ${res.items?.length ?? 0} items (total: ${res.totalLength})`, {
			offset: res.offset,
			totalLength: res.totalLength,
			itemCount: res.items?.length,
		});
		return res;
	};

	const fetchLocalAlbums = async () => {
		libraryDebug.info("Albums: fetching local albums");
		const localAlbums = await CollectionsWrapper.getLocalAlbums();
		let albums = localAlbums.values().toArray() as AlbumItem[];

		if (textFilter) {
			const escaped = textFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(`\\b${escaped}`, "i");
			albums = albums.filter((album) => {
				return regex.test(album.name) || album.artists.some((artist) => regex.test(artist.name));
			});
		}

		return albums;
	};

	// Full-fetch query for custom sort — fetches all albums in one go
	const fetchAllAlbums = async () => {
		libraryDebug.info("Albums: fetching all albums for custom order");
		const res = (await Spicetify.Platform.LibraryAPI.getContents({
			filters: ["0"],
			sortOrder: "1", // Use "Date Added" as the baseline server order; client-side custom order and reconciliation derive from this
			offset: 0,
			limit: 9999, // Fetch all — matches CollectionsWrapper pattern
		})) as GetContentsResponse<AlbumItem>;
		libraryDebug.info(`Albums: got ${res.items?.length ?? 0} items for custom order (total: ${res.totalLength})`);
		return res;
	};

	// Standard paginated query — disabled when custom order is active
	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:albums", sortOption.id, isReversed, textFilter],
		queryFn: fetchAlbums,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const current = lastPage.offset + limit;
			if (lastPage.totalLength > current) return current;
		},
		enabled: !isCustomOrder,
	});

	// Custom order query — fetches all albums at once (N1: no textFilter in key)
	const {
		data: customData,
		status: customStatus,
		error: customError,
		refetch: customRefetch,
	} = useQuery({
		queryKey: ["library:albums:custom"],
		queryFn: fetchAllAlbums,
		enabled: isCustomOrder,
	});

	const {
		data: localData,
		status: localStatus,
		error: localError,
	} = useQuery({
		queryKey: ["library:localAlbums", textFilter],
		queryFn: fetchLocalAlbums,
		enabled: configWrapper.config.localAlbums,
	});

	// Active query routing
	const activeStatus = isCustomOrder ? customStatus : status;
	const activeError = isCustomOrder ? customError : error;
	const activeRefetch = isCustomOrder ? customRefetch : refetch;

	// Library update listener — refetch the active query
	useEffect(() => {
		const update = (e: UpdateEvent) => {
			if (e.data.list === "albums") activeRefetch();
		};
		Spicetify.Platform.LibraryAPI.getEvents()._emitter.addListener("update", update, {});
		return () => {
			Spicetify.Platform.LibraryAPI.getEvents()._emitter.removeListener("update", update);
		};
	}, [activeRefetch]);

	// Listen for custom order store changes (re-render to apply new sort order without re-fetching)
	useEffect(() => {
		if (!isCustomOrder) return;
		const handleChange = () => {
			forceUpdate();
		};
		customOrderStore.addEventListener("change", handleChange);
		return () => {
			customOrderStore.removeEventListener("change", handleChange);
		};
	}, [isCustomOrder, forceUpdate]);

	// Reset custom page when sort or filter changes
	useEffect(() => {
		setCustomPage(1);
	}, [sortOption.id, filterOption.id, textFilter]);

	// Reconcile custom order when data arrives (only when no text filter).
	// Filter to standard albums only — local albums are excluded from
	// custom order persistence (matching the reorder modal's filter).
	useEffect(() => {
		if (!isCustomOrder || !customData || textFilter) return;
		const uris = (customData.items ?? []).filter((a) => a.type === "album").map((a) => a.uri);
		customOrderStore.reconcile(uris);
	}, [isCustomOrder, customData, textFilter]);

	const Status = useStatus(activeStatus, activeError);
	const localStatusResult = useStatus(localStatus, localError);
	const LocalStatus = configWrapper.config.localAlbums ? localStatusResult : null;
	const EmptyStatus = useStatus("error", new Error("No albums found")) as React.ReactElement;

	// Declare albums early so openReorderModal closure can reference it.
	// Populated after status guards below.
	let albums: AlbumItem[] = [];
	let allCustomAlbums: AlbumItem[] = []; // Full unsliced list for reorder modal
	let customTotalValid = 0;

	// Reorder modal opener — uses full unsliced list, only includes standard (non-local) albums
	const openReorderModal = () => {
		const source = allCustomAlbums.length > 0 ? allCustomAlbums : albums;
		const validItems = source.filter((item) => isValidAlbum(item) && item.type === "album").map((item) => ({
			uri: item.uri,
			name: item.name,
			artist: item.artists[0]?.name ?? "Unknown",
			imageUrl: item.images?.[0]?.url,
		}));

		// N2: onSave only calls setOrder — the "change" event listener handles re-render
		const onSave = (uris: string[]) => {
			customOrderStore.setOrder(uris);
		};

		const onReset = () => {
			customOrderStore.setOrder([]);
		};

		// @ts-ignore — Spicetify types expect DOM element, not JSX
		Spicetify.PopupModal.display({
			title: "Reorder Albums",
			content: <ReorderModal items={validItems} onSave={onSave} onReset={onReset} />,
			isLarge: true,
		});
	};

	const props = {
		lhs: ["Albums"],
		rhs: [
			<AddButton menuItems={getAddMenuItems()} />,
			filterDropdown,
			sortDropdown,
			isCustomOrder && !textFilter && filterOption.id !== "2" && activeStatus === "success" ? (
				<button
					type="button"
					className="library-reorder-button"
					onClick={openReorderModal}
					title="Reorder albums"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
						<path d="M2 4h12v1H2zM2 7.5h12v1H2zM2 11h12v1H2z" />
					</svg>
				</button>
			) : null,
			<SearchBar setSearch={setTextFilter} placeholder="Albums" />,
			<SettingsButton configWrapper={configWrapper} />,
		].filter(Boolean),
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;
	if (LocalStatus) return <PageContainer {...props}>{LocalStatus}</PageContainer>;

	// Build album list
	if (isCustomOrder) {
		const customContents = customData as NonNullable<typeof customData>;

		// Respect filter dropdown: when "Local Albums" filter active, exclude standard albums
		if (filterOption.id === "2") {
			albums = []; // Local Albums only — standard albums excluded
		} else {
			albums = customContents.items ?? [];
		}

		// N3: Merge local albums BEFORE sorting (sort once after merge)
		if (localData?.length && filterOption.id !== "1") {
			albums = albums.concat(localData);
		}

		// Apply custom sort after merge
		albums = customOrderStore.sortByOrder(albums);

		// Apply text filter client-side (skip local albums — already filtered by fetchLocalAlbums)
		if (textFilter) {
			const escaped = textFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(`\\b${escaped}`, "i");
			albums = albums.filter((album) =>
				album.type === "localalbum" || regex.test(album.name) || album.artists.some((artist) => regex.test(artist.name))
			);
		}

		// Client-side pagination: save full list for reorder modal, then slice to current page
		customTotalValid = albums.filter(isValidAlbum).length;
		allCustomAlbums = albums;
		albums = albums.slice(0, customPage * limit);
	} else {
		const contents = data as NonNullable<typeof data>;
		albums = filterOption.id !== "2" ? contents.pages.flatMap((page) => page.items) : [];

		if (localData?.length && filterOption.id !== "1") {
			albums = albums.concat(localData).sort(collectionSort(sortOption.id, isReversed));
		}
	}

	if (albums.length === 0) return <PageContainer {...props}>{EmptyStatus}</PageContainer>;

	const validAlbums = albums.filter(isValidAlbum);

	const albumCards = validAlbums.map((item) => (
		item.type === "album" ? (
			<SpotifyCard
				key={item.uri}
				type="album"
				uri={item.uri}
				header={item.name}
				subheader={item.artists[0].name}
				imageUrl={item.images?.[0]?.url}
				badge={item.pinned ? <PinIcon /> : undefined}
			/>
		) : (
			<CustomCard
				key={item.uri}
				type="localalbum"
				uri={item.uri}
				header={item.name}
				subheader={item.artists[0].name}
				imageUrl={item.images?.[0]?.url}
				badge={item.pinned ? <PinIcon /> : undefined}
			/>
		)
	));

	// LoadMoreCard for standard pagination or custom order client-side pagination
	if (isCustomOrder && customTotalValid > validAlbums.length) {
		albumCards.push(<LoadMoreCard key="load-more" callback={() => setCustomPage((p) => p + 1)} />);
	} else if (!isCustomOrder && hasNextPage) {
		albumCards.push(<LoadMoreCard key="load-more" callback={fetchNextPage} />);
	}

	return (
		<PageContainer {...props}>
			{configWrapper.config["show-item-count"] ? (
				<div className="library-item-count">{isCustomOrder ? customTotalValid : validAlbums.length} albums</div>
			) : null}
			<div className={"main-gridContainer-gridContainer grid"}>{albumCards}</div>
		</PageContainer>
	);
};

export default AlbumsPage;
