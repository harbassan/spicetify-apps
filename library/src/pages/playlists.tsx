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
import FolderImageWrapper from "../extensions/folder_image_wrapper";
import PinIcon from "../components/pin_icon";

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

const PlaylistsPage = ({ folder, configWrapper }: { configWrapper: ConfigWrapper; folder?: string }) => {
	const [sortDropdown, sortOption] = useDropdownMenu(dropdownOptions, "library:playlists-sort");
	const [filterDropdown, filterOption] = useDropdownMenu(filterOptions);
	const [flattenDropdown, flattenOption] = useDropdownMenu(flattenOptions);
	const [textFilter, setTextFilter] = React.useState("");
	const [images, setImages] = React.useState({ ...FolderImageWrapper.getFolderImages() });

	const fetchRootlist = async ({ pageParam }: { pageParam: number }) => {
		const filters = filterOption.id === "all" ? ["2"] : ["2", filterOption.id];
		const res = (await Spicetify.Platform.LibraryAPI.getContents({
			filters,
			sortOrder: sortOption.id,
			folderUri: folder,
			textFilter,
			offset: pageParam,
			limit,
			flattenTree: JSON.parse(flattenOption.id),
		})) as GetContentsResponse<PlaylistItem | FolderItem>;
		if (!res.items?.length) throw new Error("No playlists found");
		return res;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:playlists", sortOption.id, filterOption.id, flattenOption.id, textFilter, folder],
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
		title: data?.pages[0].openedFolderName || "Playlists",
		headerEls: [
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

	const rootlistCards = items.map((item) => (
		<SpotifyCard
			provider="spotify"
			type={item.type}
			uri={item.uri}
			header={item.name}
			subheader={
				item.type === "playlist"
					? item.owner.name
					: `${item.numberOfPlaylists} Playlists${item.numberOfFolders ? ` • ${item.numberOfFolders} Folders` : ""}`
			}
			imageUrl={item.images?.[0]?.url || images[item.uri]}
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
