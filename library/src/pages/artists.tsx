import React, { useEffect } from "react";
import SearchBar from "../components/searchbar";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import SpotifyCard from "@shared/components/spotify_card";
import SettingsButton from "@shared/components/settings_button";
import type { ConfigWrapper } from "../types/library_types";
import LoadMoreCard from "../components/load_more_card";
import LeadingIcon from "../components/leading_icon";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";
import useStatus from "@shared/status/useStatus";
import { useInfiniteQuery } from "@shared/types/react_query";
import type { ArtistItem, GetContentsResponse, UpdateEvent } from "../types/platform";

const AddMenu = () => {
	const { MenuItem, Menu } = Spicetify.ReactComponent;
	const { SVGIcons } = Spicetify;

	const addAlbum = () => {
		const onSave = (value: string) => {
			Spicetify.Platform.LibraryAPI.add({ uris: [value] });
		};

		Spicetify.PopupModal.display({
			title: "Add Artist",
			// @ts-ignore
			content: <TextInputDialog def={""} placeholder="Artist URI" onSave={onSave} />,
		});
	};

	return (
		<Menu>
			<MenuItem onClick={addAlbum} leadingIcon={<LeadingIcon path={SVGIcons.artist} />}>
				Add Artist
			</MenuItem>
		</Menu>
	);
};

const limit = 200;

const sortOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
];

const ArtistsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:artists");
	const [textFilter, setTextFilter] = React.useState("");

	const fetchArtists = async ({ pageParam }: { pageParam: number }) => {
		const res = (await Spicetify.Platform.LibraryAPI.getContents({
			filters: ["1"],
			sortOrder: sortOption.id,
			textFilter,
			offset: pageParam,
			limit,
		})) as GetContentsResponse<ArtistItem>;
		if (!res.items?.length) throw new Error("No artists found");
		return res;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:artists", sortOption.id, textFilter],
		queryFn: fetchArtists,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const current = lastPage.offset + limit;
			if (lastPage.totalLength > current) return current;
		},
	});

	useEffect(() => {
		const update = (e: UpdateEvent) => {
			if (e.data.list === "artists") refetch();
		};
		Spicetify.Platform.LibraryAPI.getEvents()._emitter.addListener("update", update, {});
		return () => {
			Spicetify.Platform.LibraryAPI.getEvents()._emitter.removeListener("update", update);
		};
	}, [refetch]);

	const Status = useStatus(status, error);

	const props = {
		title: "Artists",
		headerEls: [
			<AddButton Menu={<AddMenu />} />,
			dropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Artists" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const contents = data as NonNullable<typeof data>;

	const artists = contents.pages.flatMap((page) => page.items);

	const artistCards = artists.map((artist) => (
		<SpotifyCard
			provider="spotify"
			type="artist"
			uri={artist.uri}
			header={artist.name}
			subheader={"Artist"}
			imageUrl={artist.images?.at(0)?.url}
		/>
	));

	if (hasNextPage) artistCards.push(<LoadMoreCard callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			<div className={"main-gridContainer-gridContainer grid"}>{artistCards}</div>
		</PageContainer>
	);
};

export default ArtistsPage;
