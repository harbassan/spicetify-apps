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
import { useInfiniteQuery } from "@shared/types/react_query";
import type { AlbumItem, GetContentsResponse, UpdateEvent } from "../types/platform";
import PinIcon from "../components/pin_icon";

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

const AlbumsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:albums");
	const [textFilter, setTextFilter] = React.useState("");

	const fetchAlbums = async ({ pageParam }: { pageParam: number }) => {
		const res = (await Spicetify.Platform.LibraryAPI.getContents({
			filters: ["0"],
			sortOrder: sortOption.id,
			textFilter,
			offset: pageParam,
			limit,
		})) as GetContentsResponse<AlbumItem>;
		if (!res.items?.length) throw new Error("No albums found");
		return res;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:albums", sortOption.id, textFilter],
		queryFn: fetchAlbums,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const current = lastPage.offset + limit;
			if (lastPage.totalLength > current) return current;
		},
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

	const props = {
		title: "Albums",
		headerEls: [
			<AddButton Menu={<AddMenu />} />,
			dropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Albums" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const contents = data as NonNullable<typeof data>;

	const albums = contents.pages.flatMap((page) => page.items);

	const albumCards = albums.map((item) => {
		return (
			<SpotifyCard
				provider="spotify"
				type={item.type}
				uri={item.uri}
				header={item.name}
				subheader={item.artists[0].name}
				imageUrl={item.images?.[0]?.url}
				artistUri={item.artists[0].uri}
				badge={item.pinned ? <PinIcon /> : undefined}
			/>
		);
	});

	if (hasNextPage) albumCards.push(<LoadMoreCard callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			<div className={"main-gridContainer-gridContainer grid"}>{albumCards}</div>
		</PageContainer>
	);
};

export default AlbumsPage;
