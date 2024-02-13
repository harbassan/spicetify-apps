import React from "react";
import LeadingIcon from "./leading_icon";
import TextInputDialog from "./text_input_dialog";
import SearchBar from "./searchbar";

const createCollection = () => {
    const onSave = (value: string) => {
        SpicetifyLibrary.CollectionWrapper.createCollection(value);
    };

    Spicetify.PopupModal.display({
        title: "Create Collection",
        // @ts-ignore
        content: <TextInputDialog def={"New Collection"} placeholder="Collection Name" onSave={onSave} />,
    });
};

const CollectionSearchMenu = () => {
    const { MenuItem } = Spicetify.ReactComponent;
    const { SVGIcons } = Spicetify;

    const [textFilter, setTextFilter] = React.useState("");

    // @ts-ignore
    const context: any = React.useContext(Spicetify.ContextMenuV2._context);
    const uri = context?.props?.uri;

    const addToCollection = (collectionUri: string) => {
        SpicetifyLibrary.CollectionWrapper.addAlbumToCollection(collectionUri, uri);
    };

    const activeCollections = SpicetifyLibrary.CollectionWrapper.getCollectionsWithAlbum(uri);
    const hasCollections = activeCollections.length > 0;

    const removeFromCollections = () => {
        activeCollections.forEach((collection) => {
            SpicetifyLibrary.CollectionWrapper.removeAlbumFromCollection(collection.uri, uri);
        });
    };

    const allCollectionsLength = SpicetifyLibrary.CollectionWrapper.getCollections().length;
    const collections = SpicetifyLibrary.CollectionWrapper.getCollections({ textFilter });
    const menuItems = collections.map((collection, index) => {
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
            <MenuItem
                key="new-collection"
                leadingIcon={<LeadingIcon path={SVGIcons["plus2px"]} />}
                onClick={createCollection}
            >
                Create collection
            </MenuItem>
            {hasCollections && (
                <MenuItem
                    key="remove-collection"
                    leadingIcon={<LeadingIcon path={SVGIcons["minus"]} />}
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
            leadingIcon={<LeadingIcon path={SVGIcons["plus2px"]} />}
        >
            <CollectionSearchMenu />
        </MenuSubMenuItem>
    );
};

export default AlbumMenuItem;
