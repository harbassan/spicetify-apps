import React, { useEffect } from "react";
import SearchBar from "../components/searchbar";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import SpotifyCard from "@shared/components/spotify_card";
import SettingsButton from "@shared/components/settings_button";
import AddButton from "../components/add_button";
import type { ConfigWrapper } from "../types/library_types";
import LoadMoreCard from "../components/load_more_card";
import TextInputDialog from "../components/text_input_dialog";
import { useInfiniteQuery } from "@shared/types/react_query";
import type { FolderItem, GetContentsResponse, PlaylistItem, UpdateEvent } from "../types/platform";
import useStatus from "@shared/status/useStatus";
import PinIcon from "../components/pin_icon";
import useSortDropdownMenu from "@shared/dropdown/useSortDropdownMenu";
import BackButton from "../components/back_button";
import CustomCard from "../components/custom_card";

const getAddMenuItems = (folder?: string) => {
	const { RootlistAPI } = Spicetify.Platform;
	const insertLocation = folder ? { uri: folder } : "start";

	const createFolder = () => {
		const onSave = (value: string) => {
			RootlistAPI.createFolder(value || "New Folder", { after: insertLocation });
		};

		Spicetify.PopupModal.display({
			title: "Create Folder",
			// @ts-ignore
			content: <TextInputDialog def={"New Folder"} placeholder="Folder Name" onSave={onSave} />,
		});
	};

	const createPlaylist = () => {
		const onSave = (value: string) => {
			RootlistAPI.createPlaylist(value || "New Playlist", { after: insertLocation });
		};

		Spicetify.PopupModal.display({
			title: "Create Playlist",
			// @ts-ignore
			content: <TextInputDialog def={"New Playlist"} placeholder="Playlist Name" onSave={onSave} />,
		});
	};

	return [
		{ label: "Create Folder", iconPath: Spicetify.SVGIcons["playlist-folder"], onClick: createFolder },
		{ label: "Create Playlist", iconPath: Spicetify.SVGIcons.playlist, onClick: createPlaylist },
	];
};

function isValidRootlistItem(item: PlaylistItem | FolderItem) {
	return item.name && item.uri;
}

const limit = 200;

const dropdownOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
	{ id: "2", name: "Creator" },
	{ id: "4", name: "Custom Order" },
	{ id: "6", name: "Recents" },
];

const filterOptions = [
	{ id: "all", name: "All" },
	{ id: "100", name: "Downloaded" },
	{ id: "102", name: "By You" },
	{ id: "103", name: "By Spotify" },
];

const flattenOptions = [
	{ id: "false", name: "Unflattened" },
	{ id: "true", name: "Flattened" },
];

// Module-level cache: URIs whose images have already been fetched or attempted.
// Persists across re-renders and page navigations within the session.
// Bounded to prevent unbounded memory growth over long sessions.
const MAX_CACHE_SIZE = 2000;
const imageCache: Record<string, string | null> = {};
const imageCacheKeys: string[] = [];

function addToImageCache(uri: string, url: string | null) {
	if (!(uri in imageCache)) {
		imageCacheKeys.push(uri);
		if (imageCacheKeys.length > MAX_CACHE_SIZE) {
			const oldest = imageCacheKeys.shift()!;
			delete imageCache[oldest];
		}
	}
	imageCache[uri] = url;
}

const PlaylistsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [sortDropdown, sortOption, isReversed] = useSortDropdownMenu(dropdownOptions, "library:playlists-sort");
	const [filterDropdown, filterOption] = useDropdownMenu(filterOptions);
	const [flattenDropdown, flattenOption] = useDropdownMenu(flattenOptions);
	const [textFilter, setTextFilter] = React.useState("");
	const [images, setImages] = React.useState({ ...FolderImageWrapper.getFolderImages() });
	const [playlistImages, setPlaylistImages] = React.useState<Record<string, string>>(
		Object.fromEntries(Object.entries(imageCache).filter((e): e is [string, string] => e[1] !== null))
	);

	const folder = Spicetify.Platform.History.location.pathname.split("/")[3];

	const fetchRootlist = async ({ pageParam }: { pageParam: number }) => {
		const filters = filterOption.id === "all" ? ["2"] : ["2", filterOption.id];
		const res = (await Spicetify.Platform.LibraryAPI.getContents({
			filters,
			sortOrder: sortOption.id,
			sortDirection: isReversed ? "reverse" : undefined,
			folderUri: folder,
			textFilter,
			offset: pageParam,
			includeLikedSongs: configWrapper.config.includeLikedSongs,
			includeLocalFiles: configWrapper.config.includeLocalFiles,
			limit,
			flattenTree: JSON.parse(flattenOption.id),
		})) as GetContentsResponse<PlaylistItem | FolderItem>;
		if (!res.items?.length) throw new Error("No playlists found");
		return res;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:playlists", sortOption.id, isReversed, filterOption.id, flattenOption.id, textFilter, folder],
		queryFn: fetchRootlist,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const current = lastPage.offset + limit;
			if (lastPage.totalLength > current) return current;
		},
		retry: false,
	});

	// Fetch playlist cover images using hybrid approach:
	// 1. Bulk fetch from RootlistAPI (fast, covers already-resolved images)
	// 2. Per-playlist PlaylistAPI.getMetadata fallback for remaining items
	// Uses module-level imageCache to avoid re-fetching on data changes.
	useEffect(() => {
		if (status !== "success" || !data) return;

		const items = data.pages.flatMap((page) => page.items ?? []);
		const missingImages = items.filter(
			(item): item is PlaylistItem =>
				item.type === "playlist" &&
				!item.images?.[0]?.url &&
				!(item.uri in imageCache)
		);

		if (missingImages.length === 0) return;

		let cancelled = false;
		const BATCH_SIZE = 10;
		const BATCH_DELAY = 50;

		const fetchImages = async () => {
			const imageMap: Record<string, string> = {};
			// Track attempted URIs locally — only commit to imageCache
			// atomically at the end to avoid poisoning on cancellation.
			const attemptedUris = new Set<string>();
			const missingUris = new Set(missingImages.map((i) => i.uri));

			// Phase 1: Bulk fetch from RootlistAPI — resolves most images in one call
			try {
				const res = await Spicetify.Platform.RootlistAPI.getContents({ flatten: true });
				for (const item of res.items ?? []) {
					if (cancelled) return;
					if (item.type === "playlist" && missingUris.has(item.uri) && item.images?.[0]?.url) {
						imageMap[item.uri] = item.images[0].url;
						attemptedUris.add(item.uri);
					}
				}
			} catch { /* ignore — fall through to per-playlist fetch */ }

			if (cancelled) return;

			// Phase 2: Per-playlist fallback for items still missing images
			const stillMissing = missingImages.filter(
				(item) => !attemptedUris.has(item.uri)
			);

			for (let i = 0; i < stillMissing.length; i += BATCH_SIZE) {
				if (cancelled) return;
				const batch = stillMissing.slice(i, i + BATCH_SIZE);
				await Promise.allSettled(
					batch.map((item) =>
						Spicetify.Platform.PlaylistAPI.getMetadata(item.uri)
							.then((meta: { images?: Array<{ url: string }> }) => {
								attemptedUris.add(item.uri);
								if (meta?.images?.[0]?.url) {
									imageMap[item.uri] = meta.images[0].url;
								}
							})
							.catch(() => {
								attemptedUris.add(item.uri);
							})
					)
				);
				if (i + BATCH_SIZE < stillMissing.length) {
					await new Promise((r) => setTimeout(r, BATCH_DELAY));
				}
			}

			if (!cancelled) {
				// Commit all attempted URIs — positive (string URL) or null (no image found)
				for (const uri of attemptedUris) addToImageCache(uri, imageMap[uri] ?? null);
				if (attemptedUris.size > 0) {
					// Derive state directly from imageCache so playlistImages stays bounded
					// by MAX_CACHE_SIZE and stays consistent with imageCache after evictions.
					setPlaylistImages(
						Object.fromEntries(Object.entries(imageCache).filter((e): e is [string, string] => e[1] !== null))
					);
				}
			}
		};

		fetchImages();
		return () => { cancelled = true; };
	}, [status, data]);

	useEffect(() => {
		const update = (e: UpdateEvent) => refetch();
		const updateImages = (e: CustomEvent | Event) => "detail" in e && setImages({ ...e.detail });
		FolderImageWrapper.addEventListener("update", updateImages);
		Spicetify.Platform.RootlistAPI.getEvents()._emitter.addListener("update", update, {});
		return () => {
			FolderImageWrapper.removeEventListener("update", updateImages);
			Spicetify.Platform.RootlistAPI.getEvents()._emitter.removeListener("update", update);
		};
	}, [refetch]);

	const Status = useStatus(status, error);

	const props = {
		lhs: [
			folder ? <BackButton url={`Playlists/${data?.pages[0].parentFolderUri}`} /> : null,
			data?.pages[0].openedFolderName || "Playlists",
		],
		rhs: [
			<AddButton menuItems={getAddMenuItems(folder)} />,
			sortDropdown,
			filterDropdown,
			flattenDropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Playlists" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const contents = data as NonNullable<typeof data>;

	const items = contents.pages.flatMap((page) => page.items ?? []);

	const rootlistCards = items.filter(isValidRootlistItem).map((item) => (
		item.type === "folder" ?
			<CustomCard
				key={item.uri}
				type={item.type}
				uri={item.uri}
				header={item.name}
				subheader={
					`${item.numberOfPlaylists} Playlists${item.numberOfFolders ? ` • ${item.numberOfFolders} Folders` : ""}`
				}
				imageUrl={images[item.uri]}
				badge={item.pinned ? <PinIcon /> : undefined}
			/> :
		item.uri === "spotify:local-files" ?
			<CustomCard
				key={item.uri}
				type="localfiles"
				uri="spotify:collection:local-files"
				header={item.name}
				subheader={item.owner?.name || "System Playlist"}
				badge={item.pinned ? <PinIcon /> : undefined}
			/> :
			<SpotifyCard
				key={item.uri}
				type={item.type}
				uri={item.uri}
				header={item.name}
				subheader={item.owner?.name || "System Playlist"}
				imageUrl={playlistImages[item.uri] || item.images?.[0]?.url}
				badge={item.pinned ? <PinIcon /> : undefined}
			/>
	));

	if (hasNextPage) rootlistCards.push(<LoadMoreCard key="load-more" callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			{configWrapper.config["show-item-count"] ? (
				<div className="library-item-count">{items.length} items</div>
			) : null}
			<div className={"main-gridContainer-gridContainer grid"}>{rootlistCards}</div>
		</PageContainer>
	);
};

export default PlaylistsPage;
