import React, { useEffect } from "react";
import SearchBar from "../components/searchbar";
import type { ConfigWrapper } from "../types/library_types";
import SettingsButton from "@shared/components/settings_button";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import SpotifyCard from "@shared/components/spotify_card";
import LoadMoreCard from "../components/load_more_card";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";
import LeadingIcon from "../components/leading_icon";
import useStatus from "@shared/status/useStatus";
import { useInfiniteQuery, useQuery } from "@shared/types/react_query";
import type { AlbumItem, GetContentsResponse, UpdateEvent } from "../types/platform";
import PinIcon from "../components/pin_icon";
import useSortDropdownMenu from "@shared/dropdown/useSortDropdownMenu";
import collectionSort from "../utils/collection_sort";

const AddMenu = () => {
	const { MenuItem, Menu } = Spicetify.ReactComponent;
	const { SVGIcons } = Spicetify;

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

	return (
		<Menu>
			<MenuItem onClick={addAlbum} leadingIcon={<LeadingIcon path={SVGIcons.album} />}>
				Add Album
			</MenuItem>
		</Menu>
	);
};

const limit = 200;

const sortOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
	{ id: "2", name: "Artist Name" },
	{ id: "6", name: "Recents" },
];

const filterOptions = [
	{ id: "0", name: "All" },
	{ id: "1", name: "Albums" },
	{ id: "2", name: "Local Albums" },
];

function isValidAlbum(album: AlbumItem) {
	const primaryArtist = album.artists?.[0];
	return album.name && album.uri && primaryArtist?.name && primaryArtist?.uri;
}

const AlbumsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [sortDropdown, sortOption, isReversed] = useSortDropdownMenu(sortOptions, "library:albums");
	const [filterDropdown, filterOption] = useDropdownMenu(filterOptions);
	const [textFilter, setTextFilter] = React.useState("");

	const fetchAlbums = async ({ pageParam }: { pageParam: number }) => {
		const res = (await Spicetify.Platform.LibraryAPI.getContents({
			filters: ["0"],
			sortOrder: sortOption.id,
			textFilter,
			sortDirection: isReversed ? "reverse" : undefined,
			offset: pageParam,
			limit,
		})) as GetContentsResponse<AlbumItem>;
		return res;
	};

	const fetchLocalAlbums = async () => {
		const localAlbums = await CollectionsWrapper.getLocalAlbums();
		let albums = localAlbums.values().toArray() as AlbumItem[];

		if (textFilter) {
			const regex = new RegExp(`\\b${textFilter}`, "i");
			albums = albums.filter((album) => {
				return regex.test(album.name) || album.artists.some((artist) => regex.test(artist.name));
			});
		}

		return albums;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:albums", sortOption.id, isReversed, textFilter],
		queryFn: fetchAlbums,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const current = lastPage.offset + limit;
			if (lastPage.totalLength > current) return current;
		},
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

	useEffect(() => {
		const update = (e: UpdateEvent) => {
			if (e.data.list === "albums") refetch();
		};
		Spicetify.Platform.LibraryAPI.getEvents()._emitter.addListener("update", update, {});
		return () => {
			Spicetify.Platform.LibraryAPI.getEvents()._emitter.removeListener("update", update);
		};
	}, [refetch]);

	const Status = useStatus(status, error);
	const LocalStatus = configWrapper.config.localAlbums && useStatus(localStatus, localError);
	const EmptyStatus = useStatus("error", new Error("No albums found")) as React.ReactElement;

	const props = {
		lhs: ["Albums"],
		rhs: [
			<AddButton Menu={<AddMenu />} />,
			filterDropdown,
			sortDropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Albums" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;
	if (LocalStatus) return <PageContainer {...props}>{LocalStatus}</PageContainer>;

	const contents = data as NonNullable<typeof data>;

	let albums = filterOption.id !== "2" ? contents.pages.flatMap((page) => page.items) : [];
	if (localData?.length && filterOption.id !== "1") {
		albums = albums.concat(localData).sort(collectionSort(sortOption.id, isReversed));
	}

	if (albums.length === 0) return <PageContainer {...props}>{EmptyStatus}</PageContainer>;

	const albumCards = albums.filter(isValidAlbum).map((item) => (
		<SpotifyCard
			type={item.type || "localalbum"}
			uri={item.uri}
			header={item.name}
			subheader={item.artists[0].name}
			imageUrl={item.images?.[0]?.url}
			artistUri={item.artists[0].uri}
			badge={item.pinned ? <PinIcon /> : undefined}
		/>
	));

	if (hasNextPage) albumCards.push(<LoadMoreCard callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			<div className={"main-gridContainer-gridContainer grid"}>{albumCards}</div>
		</PageContainer>
	);
};

export default AlbumsPage;
