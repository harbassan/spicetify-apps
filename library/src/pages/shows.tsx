import React, { useEffect } from "react";
import SearchBar from "../components/searchbar";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import SettingsButton from "@shared/components/settings_button";
import type { ConfigWrapper } from "../types/library_types";
import SpotifyCard from "@shared/components/spotify_card";
import LoadMoreCard from "../components/load_more_card";
import LeadingIcon from "../components/leading_icon";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";
import { useInfiniteQuery } from "@shared/types/react_query";
import type { GetContentsResponse, ShowItem, UpdateEvent } from "../types/platform";
import useStatus from "@shared/status/useStatus";
import PinIcon from "../components/pin_icon";

const AddMenu = () => {
	const { MenuItem, Menu } = Spicetify.ReactComponent;
	const { SVGIcons } = Spicetify;

	const addAlbum = () => {
		const onSave = (value: string) => {
			Spicetify.Platform.LibraryAPI.add({ uris: [value] });
		};

		Spicetify.PopupModal.display({
			title: "Add Show",
			// @ts-ignore
			content: <TextInputDialog def={""} placeholder="Show URI" onSave={onSave} />,
		});
	};

	return (
		<Menu>
			<MenuItem onClick={addAlbum} leadingIcon={<LeadingIcon path={SVGIcons.podcasts} />}>
				Add Show
			</MenuItem>
		</Menu>
	);
};

const limit = 200;

const sortOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
];

const ShowsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:shows");
	const [textFilter, setTextFilter] = React.useState("");

	const fetchShows = async ({ pageParam }: { pageParam: number }) => {
		const res = (await Spicetify.Platform.LibraryAPI.getContents({
			filters: ["3"],
			sortOrder: sortOption.id,
			textFilter,
			offset: pageParam,
			limit,
		})) as GetContentsResponse<ShowItem>;
		if (!res.items?.length) throw new Error("No shows found");
		return res;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:shows", sortOption.id, textFilter],
		queryFn: fetchShows,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const current = lastPage.offset + limit;
			if (lastPage.totalLength > current) return current;
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

	const props = {
		title: "Shows",
		headerEls: [
			<AddButton Menu={<AddMenu />} />,
			dropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Shows" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const contents = data as NonNullable<typeof data>;

	const shows = contents.pages.flatMap((page) => page.items);

	const showCards = shows.map((show) => (
		<SpotifyCard
			provider="spotify"
			type="show"
			uri={show.uri}
			header={show.name}
			subheader={show.publisher}
			imageUrl={show.images?.[0]?.url}
			badge={show.pinned ? <PinIcon /> : undefined}
		/>
	));

	if (hasNextPage) showCards.push(<LoadMoreCard callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			<div className={"main-gridContainer-gridContainer grid"}>{showCards}</div>
		</PageContainer>
	);
};

export default ShowsPage;
