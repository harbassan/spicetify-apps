import React from "react";
import LeadingIcon from "./leading_icon";
import TextInputDialog from "./text_input_dialog";
import SearchBar from "./searchbar";

const createCollection = () => {
	const onSave = (value: string) => {
		CollectionsWrapper.createCollection(value);
	};

	Spicetify.PopupModal.display({
		title: "Create Collection",
		content: <TextInputDialog def={"New Collection"} placeholder="Collection Name" onSave={onSave} />,
	});
};

const CollectionSearchMenu = () => {
	const { MenuItem } = Spicetify.ReactComponent;
	const { SVGIcons } = Spicetify;

	const [textFilter, setTextFilter] = React.useState("");
	const [collections, setCollections] = React.useState<Awaited<
		ReturnType<typeof CollectionsWrapper.getContents>
	> | null>(null);

	const context = React.useContext(Spicetify.ContextMenuV2._context);
	const uri = context?.props?.uri;

	React.useEffect(() => {
		const fetchCollections = async () => {
			setCollections(await CollectionsWrapper.getContents({ textFilter, limit: 20, offset: 0 }));
		};
		fetchCollections();
	}, [textFilter]);

	if (!collections) return <></>;

	const addToCollection = (collectionUri: string) => {
		CollectionsWrapper.addAlbumToCollection(collectionUri, uri);
	};

	const activeCollections = CollectionsWrapper.getCollectionsWithAlbum(uri);
	const hasCollections = activeCollections.length > 0;

	const removeFromCollections = () => {
		for (const collection of activeCollections) {
			CollectionsWrapper.removeAlbumFromCollection(collection.uri, uri);
		}
	};

	const allCollectionsLength = collections.totalLength;

	const menuItems = collections.items.map((collection, index) => {
		return (
			<MenuItem
				key={collection.uri}
				onClick={() => {
					addToCollection(collection.uri);
				}}
				divider={index === 0 ? "before" : undefined}
			>
				{collection.name}
			</MenuItem>
		);
	});

	const menuLength = allCollectionsLength + (hasCollections ? 1 : 0);

	return (
		<div
			className="main-contextMenu-filterPlaylistSearchContainer"
			// @ts-expect-error
			style={{ "--context-menu-submenu-length": `${menuLength}` }}
		>
			<li role="presentation" className="main-contextMenu-filterPlaylistSearch">
				<div role="menuitem">
					<SearchBar setSearch={setTextFilter} placeholder="collections" />
				</div>
			</li>
			<MenuItem key="new-collection" leadingIcon={<LeadingIcon path={SVGIcons.plus2px} />} onClick={createCollection}>
				Create collection
			</MenuItem>
			{hasCollections && (
				<MenuItem
					key="remove-collection"
					leadingIcon={<LeadingIcon path={SVGIcons.minus} />}
					onClick={removeFromCollections}
				>
					Remove from all
				</MenuItem>
			)}
			{menuItems}
		</div>
	);
};

const AlbumMenuItem = () => {
	// @ts-expect-error
	const { MenuSubMenuItem } = Spicetify.ReactComponent;
	const { SVGIcons } = Spicetify;

	return (
		<MenuSubMenuItem
			displayText="Add to collection"
			divider="after"
			leadingIcon={<LeadingIcon path={SVGIcons.plus2px} />}
		>
			<CollectionSearchMenu />
		</MenuSubMenuItem>
	);
};

export default AlbumMenuItem;
