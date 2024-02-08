import React from "react";
import SearchBar from "../components/searchbar";
import { ConfigWrapperProps } from "../types/library_types";
import SettingsButton from "@shared/components/settings_button";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import Status from "@shared/components/status";
import SpotifyCard from "@shared/components/spotify_card";
import LoadMoreCard from "../components/load_more_card";

interface AlbumProps {
    type: "album" | "collection";
    uri: string;
    name: string;
    artists: { name: string }[];
    images: { url: string }[];
}

const sortOptions = [
    { id: "0", name: "Name" },
    { id: "1", name: "Date Added" },
    { id: "2", name: "Artist Name" },
    { id: "6", name: "Recents" },
];

const AlbumsPage = ({ configWrapper, collection }: { configWrapper: ConfigWrapperProps; collection?: string }) => {
    const [albums, setAlbums] = React.useState<AlbumProps[] | 100 | 200 | 300>(100);
    const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:albums");
    const [textFilter, setTextFilter] = React.useState("");
    const [collectionName, setCollectionName] = React.useState("");

    const fetchItems = async () => {
        const collections = SpicetifyLibrary.CollectionWrapper.getCollections();
        const albums = await Spicetify.Platform.LibraryAPI.getContents({
            filters: ["0"],
            sortOrder: sortOption.id,
            textFilter,
            offset: 0,
            limit: 200,
        });

        // filter out any album in a collection
        albums.items = albums.items.filter((album: AlbumProps) => {
            return SpicetifyLibrary.CollectionWrapper.getCollectionsWithAlbum(album.uri).length === 0;
        });

        if (albums.items.length === 0 && collections.length === 0) {
            return textFilter ? setAlbums(300) : setAlbums(200);
        }

        const items = [...collections, ...albums.items];
        setAlbums(items);
    };

    const fetchCollection = async () => {
        const res = SpicetifyLibrary.CollectionWrapper.getCollection(collection);
        const collectionItems = res.items;

        if (collectionItems.length === 0) {
            return textFilter ? setAlbums(300) : setAlbums(200);
        }

        setAlbums(collectionItems);
        setCollectionName(res.name);
    };

    React.useEffect(() => {
        if (collection) fetchCollection();
        else fetchItems();
    }, [sortOption, textFilter, collection]);

    const title = collectionName || "Albums";

    const props = {
        title,
        headerEls: [
            dropdown,
            <SearchBar setSearch={setTextFilter} placeholder="Albums" />,
            <SettingsButton configWrapper={configWrapper} />,
        ],
    };

    switch (albums) {
        case 100:
            return <></>;
        case 200:
            return (
                <PageContainer title="Albums">
                    <Status icon="library" heading="Nothing Here" subheading="You don't have any albums saved" />
                </PageContainer>
            );
        case 300:
            return (
                <PageContainer {...props}>
                    <Status icon="library" heading="Nothing Here" subheading="No albums match your search" />
                </PageContainer>
            );
    }

    const albumCards = albums.map((album) => {
        return (
            <SpotifyCard
                type={album.type}
                uri={album.uri || album.id}
                header={album.name}
                subheader={album.artists?.[0]?.name || album.artist || "Collection"}
                imageUrl={album.images?.[0]?.url || album.image || ""}
            />
        );
    });

    if (albums.length % 200 === 0) {
        albumCards.push(
            <LoadMoreCard
                callback={() => {
                    Spicetify.Platform.LibraryAPI.getContents({
                        filters: ["0"],
                        sortOrder: sortOption.id,
                        textFilter,
                        offset: albums.length,
                        limit: 200,
                    }).then((res: any) => {
                        setAlbums([...albums, ...res.items]);
                    });
                }}
            />
        );
    }

    return (
        <PageContainer {...props}>
            <div className={`main-gridContainer-gridContainer grid`}>{albumCards}</div>
        </PageContainer>
    );
};

export default AlbumsPage;
