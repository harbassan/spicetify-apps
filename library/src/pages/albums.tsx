import React from "react";
import SearchBar from "../components/searchbar";
import type { ConfigWrapperProps } from "../types/library_types";
import SettingsButton from "@shared/components/settings_button";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import Status from "@shared/status/status";
import SpotifyCard from "@shared/components/spotify_card";
import LoadMoreCard from "../components/load_more_card";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";
import LeadingIcon from "../components/leading_icon";

interface AlbumProps {
	type: "album";
	uri: string;
	name: string;
	artists: { name: string; uri: string }[];
	images: { url: string }[];
}

interface CollectionProps {
	type: "collection";
	name: string;
	uri: string;
	items: RootlistItemProps[];
	totalLength: number;
	imgUrl: string;
}

type RootlistItemProps = AlbumProps | CollectionProps;

const sortOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
	{ id: "2", name: "Artist Name" },
	{ id: "6", name: "Recents" },
];

const AddMenu = ({ collection }: { collection?: string }) => {
	const { MenuItem, Menu } = Spicetify.ReactComponent;
	const { SVGIcons } = Spicetify;

	const createCollection = () => {
		const onSave = (value: string) => {
			SpicetifyLibrary.CollectionWrapper.createCollection(value, collection);
		};

		Spicetify.PopupModal.display({
			title: "Create Collection",
			// @ts-ignore
			content: <TextInputDialog def={"New Collection"} placeholder="Collection Name" onSave={onSave} />,
		});
	};

	const addAlbum = () => {
		const onSave = (value: string) => {
			if (collection) SpicetifyLibrary.CollectionWrapper.addAlbumToCollection(collection, value);
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
			<MenuItem onClick={createCollection} leadingIcon={<LeadingIcon path={SVGIcons["playlist-folder"]} />}>
				Create Collection
			</MenuItem>
			<MenuItem onClick={addAlbum} leadingIcon={<LeadingIcon path={SVGIcons.album} />}>
				Add Album
			</MenuItem>
		</Menu>
	);
};

const AlbumsPage = ({ configWrapper, collection }: { configWrapper: ConfigWrapperProps; collection?: string }) => {
	const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:albums");
	const [textFilter, setTextFilter] = React.useState("");

	const { useInfiniteQuery } = Spicetify.ReactQuery;
	const limit = 200;

	const fetchRootlist = async ({ pageParam }: { pageParam: number }) => {
		const collections = await SpicetifyLibrary.CollectionWrapper.getCollectionItems({
			collectionUri: collection,
			textFilter,
			sortOrder: sortOption.id,
			limit,
			offset: pageParam,
			rootlist: true,
		});

		return collections;
	};

	const { data, status, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:albums", sortOption.id, textFilter, collection],
		queryFn: fetchRootlist,
		initialPageParam: 0,
		getNextPageParam: (lastPage: any, _allPages: any, lastPageParam: number) => {
			return lastPage.totalLength > lastPageParam + limit ? lastPageParam + limit : undefined;
		},
		structuralSharing: false,
	});

	const props = {
		title: data?.pages[0].openedCollection || "Albums",
		headerEls: [
			<AddButton Menu={<AddMenu collection={collection} />} />,
			dropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Albums" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (status === "pending") {
		return (
			<PageContainer {...props}>
				<Status icon="library" heading="Loading" subheading="Fetching your albums" />
			</PageContainer>
		);
	}
	if (status === "error") {
		return (
			<PageContainer {...props}>
				<Status icon="error" heading="Error" subheading="Failed to load your albums" />
			</PageContainer>
		);
	}
	if (!data.pages[0].items.length) {
		return (
			<PageContainer {...props}>
				<Status icon="library" heading="Nothing Here" subheading="You don't have any albums saved" />
			</PageContainer>
		);
	}

	const rootlistItems = data.pages.flatMap((page: any) => page.items) as RootlistItemProps[];

	const rootlistCards = rootlistItems.map((item) => {
		const isAlbum = item.type === "album";
		return (
			<SpotifyCard
				provider="spotify"
				type={item.type}
				uri={item.uri}
				header={item.name}
				subheader={isAlbum ? item.artists?.[0]?.name : "Collection"}
				imageUrl={isAlbum ? item.images?.[0]?.url : item.imgUrl}
				artistUri={isAlbum ? item.artists?.[0]?.uri : undefined}
			/>
		);
	});

	if (hasNextPage) rootlistCards.push(<LoadMoreCard callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			<div className={"main-gridContainer-gridContainer grid"}>{rootlistCards}</div>
		</PageContainer>
	);
};

export default AlbumsPage;
