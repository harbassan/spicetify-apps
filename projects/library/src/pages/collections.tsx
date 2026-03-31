import React, { useEffect } from "react";
import SearchBar from "../components/searchbar";
import PageContainer from "@shared/components/page_container";
import SpotifyCard from "@shared/components/spotify_card";
import SettingsButton from "@shared/components/settings_button";
import AddButton from "../components/add_button";
import type { ConfigWrapper } from "../types/library_types";
import LoadMoreCard from "../components/load_more_card";
import TextInputDialog from "../components/text_input_dialog";
import { useInfiniteQuery } from "@shared/types/react_query";
import useStatus from "@shared/status/useStatus";
import useSortDropdownMenu from "@shared/dropdown/useSortDropdownMenu";
import BackButton from "../components/back_button";
import CustomCard from "../components/custom_card";
import { CollectionChild } from "../extensions/collections_wrapper";

const getAddMenuItems = (collection?: string) => {
	const createCollection = () => {
		const onSave = (value: string) => {
			CollectionsWrapper.createCollection(value || "New Collection", collection);
		};

		Spicetify.PopupModal.display({
			title: "Create Collection",
			content: <TextInputDialog def={"New Collection"} placeholder="Collection Name" onSave={onSave} />,
		});
	};

	const createDiscogCollection = () => {
		const onSave = (value: string) => {
			CollectionsWrapper.createCollectionFromDiscog(value);
		};

		Spicetify.PopupModal.display({
			title: "Create Discog Collection",
			content: <TextInputDialog def={""} placeholder="Artist URI" onSave={onSave} />,
		});
	};

	const addAlbum = () => {
		if (!collection) return;
		const onSave = (value: string) => {
			CollectionsWrapper.addAlbumToCollection(collection, value);
		};

		Spicetify.PopupModal.display({
			title: "Add Album",
			content: <TextInputDialog def={""} placeholder="Album URI" onSave={onSave} />,
		});
	};

	const items = [
		{ label: "Create Collection", iconPath: Spicetify.SVGIcons["playlist-folder"], onClick: createCollection },
		{ label: "Create Discog Collection", iconPath: Spicetify.SVGIcons.artist, onClick: createDiscogCollection },
	];
	if (collection) {
		items.push({ label: "Add Album", iconPath: Spicetify.SVGIcons.album, onClick: addAlbum });
	}
	return items;
};

function isValidCollectionItem(item: CollectionChild) {
	return item.name && item.uri;
}

const limit = 200;

const sortOptions = [
	{ id: "0", name: "Name" },
	{ id: "1", name: "Date Added" },
	{ id: "2", name: "Artist Name" },
	{ id: "6", name: "Recents" },
];

const CollectionsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
	const [sortDropdown, sortOption, isReversed] = useSortDropdownMenu(sortOptions, "library:collections");
	const [textFilter, setTextFilter] = React.useState("");

	const collection = Spicetify.Platform.History.location.pathname.split("/")[3];

	const fetchRootlist = async ({ pageParam }: { pageParam: number }) => {
		const res = await CollectionsWrapper.getContents({
			collectionUri: collection,
			textFilter,
			offset: pageParam,
			sortOrder: sortOption.id,
			sortDirection: isReversed ? "reverse" : undefined,
			limit,
		});
		if (!res.items.length) throw new Error("No collections found");
		return res;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:collections", textFilter, collection, isReversed, sortOption.id],
		queryFn: fetchRootlist,
		initialPageParam: 0,
		getNextPageParam: (lastPage) => {
			const current = lastPage.offset + limit;
			if (lastPage.totalLength > current) return current;
		},
		retry: false,
		structuralSharing: false,
	});

	useEffect(() => {
		const update = (e: CustomEvent | Event) => {
			refetch();
		};
		CollectionsWrapper.addEventListener("update", update);
		return () => {
			CollectionsWrapper.removeEventListener("update", update);
		};
	}, [refetch]);

	const Status = useStatus(status, error);

	const props = {
		lhs: [
			collection ? <BackButton url={`Collections/${data?.pages[0].parentCollectionUri}`} /> : null,
			data?.pages[0].openedCollectionName || "Collections"
		],
		rhs: [
			<AddButton menuItems={getAddMenuItems(collection)} />,
			sortDropdown,
			<SearchBar setSearch={setTextFilter} placeholder="Collections" />,
			<SettingsButton configWrapper={configWrapper} />,
		],
	};

	if (Status) return <PageContainer {...props}>{Status}</PageContainer>;

	const contents = data as NonNullable<typeof data>;

	const items = contents.pages.flatMap((page) => page.items);

	const rootlistCards = items.filter(isValidCollectionItem).map((item) => {
		if (item.type === "album") {
			return (
				<SpotifyCard
					key={item.uri}
					type={item.type}
					uri={item.uri}
					header={item.name}
					subheader={item.artists?.[0]?.name}
					imageUrl={item.images?.[0]?.url}
				/>
			);
		}
		if (item.type === "collection") {
			return (
				<CustomCard
					key={item.uri}
					type="collection"
					uri={item.uri}
					header={item.name}
					subheader={`${item.items.length} Albums`}
					imageUrl={item.image}
				/>
			);
		}
		// localalbum
		return (
			<CustomCard
				key={item.uri}
				type="localalbum"
				uri={item.uri}
				header={item.name}
				subheader={item.artists?.[0]?.name}
				imageUrl={item.images?.[0]?.url}
			/>
		);
	});

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

export default CollectionsPage;
