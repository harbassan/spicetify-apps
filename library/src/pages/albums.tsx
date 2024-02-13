import React from "react";
import SearchBar from "../components/searchbar";
import { ConfigWrapperProps } from "../types/library_types";
import SettingsButton from "@shared/components/settings_button";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import Status from "@shared/components/status";
import SpotifyCard from "@shared/components/spotify_card";
import LoadMoreCard from "../components/load_more_card";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";
import LeadingIcon from "../components/leading_icon";

interface AlbumProps {
    type: "album";
    uri: string;
    name: string;
    artists: { name: string }[];
    images: { url: string }[];
}

interface CollectionProps {
    type: "collection";
    name: string;
    uri: string;
    items: RootlistItemProps[];
    totalLength: number;
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
            SpicetifyLibrary.CollectionWrapper.createCollection(value);
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
            <MenuItem onClick={addAlbum} leadingIcon={<LeadingIcon path={SVGIcons["album"]} />}>
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
        if (!collection) {
            const collections = SpicetifyLibrary.CollectionWrapper.getCollections({ textFilter });
            const res = await Spicetify.Platform.LibraryAPI.getContents({
                filters: ["0"],
                sortOrder: sortOption.id,
                textFilter,
                offset: pageParam,
                limit,
            });

            // filter out any album in a collection
            const albums = res.items.filter((album: AlbumProps) => {
                return SpicetifyLibrary.CollectionWrapper.getCollectionsWithAlbum(album.uri).length === 0;
            });

            return { items: [...collections, ...albums], name: "", totalLength: res.totalLength };
        }

        return SpicetifyLibrary.CollectionWrapper.getCollection(collection);
    };

    const { data, status, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
        queryKey: ["library:albums", sortOption.id, textFilter, collection],
        queryFn: fetchRootlist,
        initialPageParam: 0,
        getNextPageParam: (lastPage: any, _allPages: any, lastPageParam: number) => {
            return lastPage.totalLength > lastPageParam + limit ? lastPageParam + limit : undefined;
        },
    });

    React.useEffect(() => {
        const onUpdate = (e: any) => refetch();

        Spicetify.Platform.LibraryAPI.getEvents()._emitter.addListener("update", onUpdate);
        SpicetifyLibrary.CollectionWrapper.addEventListener("update", onUpdate);

        return () => {
            Spicetify.Platform.LibraryAPI.getEvents()._emitter.removeListener("update", onUpdate);
            SpicetifyLibrary.CollectionWrapper.removeEventListener("update", onUpdate);
        };
    }, []);

    const props = {
        title: data?.pages[0].name || "Albums",
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
    } else if (status === "error") {
        return (
            <PageContainer {...props}>
                <Status icon="error" heading="Error" subheading="Failed to load your albums" />
            </PageContainer>
        );
    } else if (!data.pages[0].items.length) {
        return (
            <PageContainer {...props}>
                <Status icon="library" heading="Nothing Here" subheading="You don't have any albums saved" />
            </PageContainer>
        );
    }

    const rootlistItems = data.pages.map((page: any) => page.items).flat() as RootlistItemProps[];

    const rootlistCards = rootlistItems.map((album) => {
        const isAlbum = album.type === "album";
        return (
            <SpotifyCard
                type={album.type}
                uri={album.uri}
                header={album.name}
                subheader={isAlbum ? album.artists?.[0]?.name : "Collection"}
                imageUrl={isAlbum ? album.images?.[0]?.url : ""}
            />
        );
    });

    if (hasNextPage) rootlistCards.push(<LoadMoreCard callback={fetchNextPage} />);

    return (
        <PageContainer {...props}>
            <div className={`main-gridContainer-gridContainer grid`}>{rootlistCards}</div>
        </PageContainer>
    );
};

export default AlbumsPage;
