import React from "react";
import SearchBar from "../components/searchbar";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import Status from "@shared/status/status";
import SettingsButton from "@shared/components/settings_button";
import type { ConfigWrapperProps } from "../types/library_types";
import SpotifyCard from "@shared/components/spotify_card";
import LoadMoreCard from "../components/load_more_card";
import LeadingIcon from "../components/leading_icon";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";

interface ShowProps {
	uri: string;
	name: string;
	publisher: string;
	images: { url: string }[];
}

const sortOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
];

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

const ShowsPage = ({ configWrapper }: { configWrapper: ConfigWrapperProps }) => {
	const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:shows");
	const [textFilter, setTextFilter] = React.useState("");

	const { useInfiniteQuery } = Spicetify.ReactQuery;
	const limit = 200;

	const fetchShows = async ({ pageParam }: { pageParam: number }) => {
		const res = await Spicetify.Platform.LibraryAPI.getContents({
			filters: ["3"],
			sortOrder: sortOption.id,
			textFilter,
			offset: pageParam,
			limit,
		});
		return res;
	};

	const { data, status, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:shows", sortOption.id, textFilter],
		queryFn: fetchShows,
		initialPageParam: 0,
		getNextPageParam: (lastPage: any, _allPages: any, lastPageParam: number) => {
			return lastPage.totalLength > lastPageParam + limit ? lastPageParam + limit : undefined;
		},
	});

	const props = {
		title: "Shows",
		headerEls: [
			<AddButton Menu={<AddMenu />} />,
			dropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Shows" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (status === "pending") {
		return (
			<PageContainer {...props}>
				<Status icon="library" heading="Loading" subheading="Fetching your shows" />
			</PageContainer>
		);
	}
	if (status === "error") {
		return (
			<PageContainer {...props}>
				<Status icon="error" heading="Error" subheading="Failed to load your shows" />
			</PageContainer>
		);
	}
	if (!data.pages[0].items.length) {
		return (
			<PageContainer {...props}>
				<Status icon="library" heading="Nothing Here" subheading="You don't have any shows saved" />
			</PageContainer>
		);
	}

	const shows = data.pages.flatMap((page: any) => page.items) as ShowProps[];

	const showCards = shows.map((show) => {
		return (
			<SpotifyCard
				provider="spotify"
				type="show"
				uri={show.uri}
				header={show.name}
				subheader={show.publisher}
				imageUrl={show.images?.[0]?.url || ""}
			/>
		);
	});

	if (hasNextPage) showCards.push(<LoadMoreCard callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			<div className={"main-gridContainer-gridContainer grid"}>{showCards}</div>
		</PageContainer>
	);
};

export default ShowsPage;
