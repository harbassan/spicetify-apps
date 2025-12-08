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
import LeadingIcon from "../components/leading_icon";
import { useInfiniteQuery } from "@shared/types/react_query";
import type { FolderItem, GetContentsResponse, PlaylistItem, UpdateEvent } from "../types/platform";
import useStatus from "@shared/status/useStatus";
import PinIcon from "../components/pin_icon";
import useSortDropdownMenu from "@shared/dropdown/useSortDropdownMenu";
import BackButton from "../components/back_button";
import CustomCard from "../components/custom_card";

const AddMenu = ({ folder }: { folder?: string }) => {
	const { MenuItem, Menu } = Spicetify.ReactComponent;
	const { RootlistAPI } = Spicetify.Platform;
	const { SVGIcons } = Spicetify;

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

	return (
		<Menu>
			<MenuItem onClick={createFolder} leadingIcon={<LeadingIcon path={SVGIcons["playlist-folder"]} />}>
				Create Folder
			</MenuItem>
			<MenuItem onClick={createPlaylist} leadingIcon={<LeadingIcon path={SVGIcons.playlist} />}>
				Create Playlist
			</MenuItem>
		</Menu>
	);
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

const PlaylistsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [sortDropdown, sortOption, isReversed] = useSortDropdownMenu(dropdownOptions, "library:playlists-sort");
	const [filterDropdown, filterOption] = useDropdownMenu(filterOptions);
	const [flattenDropdown, flattenOption] = useDropdownMenu(flattenOptions);
	const [textFilter, setTextFilter] = React.useState("");
	const [images, setImages] = React.useState({ ...FolderImageWrapper.getFolderImages() });

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
			<AddButton Menu={<AddMenu folder={folder} />} />,
			sortDropdown,
			filterDropdown,
			flattenDropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Playlists" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const contents = data as NonNullable<typeof data>;

	const items = contents.pages.flatMap((page) => page.items);

	const rootlistCards = items.filter(isValidRootlistItem).map((item) => (
		item.type === "folder" ?
			<CustomCard
				type={item.type}
				uri={item.uri}
				header={item.name}
				subheader={
					`${item.numberOfPlaylists} Playlists${item.numberOfFolders ? ` • ${item.numberOfFolders} Folders` : ""}`
				}
				imageUrl={images[item.uri]}
				badge={item.pinned ? <PinIcon /> : undefined}
			/> :
			<SpotifyCard
				type={item.type}
				// NOTE: spotify returns the wrong uri for the local files playlist
				uri={item.uri === "spotify:local-files" ? "spotify:collection:local-files" : item.uri}
				header={item.name}
				subheader={item.owner?.name || "System Playlist"}
				imageUrl={item.images?.[0]?.url}
				badge={item.pinned ? <PinIcon /> : undefined}
			/>
	));

	if (hasNextPage) rootlistCards.push(<LoadMoreCard callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			<div className={"main-gridContainer-gridContainer grid"}>{rootlistCards}</div>
		</PageContainer>
	);
};

export default PlaylistsPage;
