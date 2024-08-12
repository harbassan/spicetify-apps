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
import useStatus from "@shared/status/useStatus";

const AddMenu = ({ collection }: { collection?: string }) => {
	const { MenuItem, Menu } = Spicetify.ReactComponent;
	const { RootlistAPI } = Spicetify.Platform;
	const { SVGIcons } = Spicetify;

	const createCollection = () => {
		const onSave = (value: string) => {
			CollectionsWrapper.createCollection(value || "New Collection", collection);
		};

		Spicetify.PopupModal.display({
			title: "Create Collection",
			// @ts-ignore
			content: <TextInputDialog def={"New Collection"} placeholder="Collection Name" onSave={onSave} />,
		});
	};

	const addAlbum = () => {
		if (!collection) return;
		const onSave = (value: string) => {
			CollectionsWrapper.addAlbumToCollection(collection, value);
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
			{collection && (
				<MenuItem onClick={addAlbum} leadingIcon={<LeadingIcon path={SVGIcons.album} />}>
					Add Album
				</MenuItem>
			)}
		</Menu>
	);
};

const limit = 200;

const CollectionsPage = ({ collection, configWrapper }: { configWrapper: ConfigWrapper; collection?: string }) => {
	const [textFilter, setTextFilter] = React.useState("");

	const fetchRootlist = async ({ pageParam }: { pageParam: number }) => {
		const res = await CollectionsWrapper.getContents({
			collectionUri: collection,
			textFilter,
			offset: pageParam,
			limit,
		});
		console.log(res);
		if (!res.items.length) throw new Error("No collections found");
		return res;
	};

	const { data, status, error, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
		queryKey: ["library:collections", textFilter, collection],
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
			console.log("recieved");
			refetch();
		};
		CollectionsWrapper.addEventListener("update", update);
		return () => {
			CollectionsWrapper.removeEventListener("update", update);
		};
	}, [refetch]);

	const Status = useStatus(status, error);

	const props = {
		title: data?.pages[0].openedCollectionName || "Collections",
		headerEls: [
			<AddButton Menu={<AddMenu collection={collection} />} />,
			<SearchBar setSearch={setTextFilter} placeholder="Collections" />,
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
			subheader={item.type === "collection" ? "Collection" : item.artists?.[0]?.name}
			imageUrl={item.type === "collection" ? item.image : item.images?.[0]?.url}
		/>
	));

	if (hasNextPage) rootlistCards.push(<LoadMoreCard callback={fetchNextPage} />);

	return (
		<PageContainer {...props}>
			<div className={"main-gridContainer-gridContainer grid"}>{rootlistCards}</div>
		</PageContainer>
	);
};

export default CollectionsPage;
