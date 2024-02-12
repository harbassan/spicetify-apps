import React from "react";
import SearchBar from "../components/searchbar";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import Status from "@shared/components/status";
import SpotifyCard from "@shared/components/spotify_card";
import SettingsButton from "@shared/components/settings_button";
import { ConfigWrapperProps } from "../types/library_types";
import LoadMoreCard from "../components/load_more_card";
import LeadingIcon from "../components/leading_icon";
import AddButton from "../components/add_button";
import TextInputDialog from "../components/text_input_dialog";

interface ArtistProps {
    uri: string;
    name: string;
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
            title: "Add Artist",
            // @ts-ignore
            content: <TextInputDialog def={""} placeholder="Artist URI" onSave={onSave} />,
        });
    };

    return (
        <Menu>
            <MenuItem onClick={addAlbum} leadingIcon={<LeadingIcon path={SVGIcons["artist"]} />}>
                Add Artist
            </MenuItem>
        </Menu>
    );
};

const ArtistsPage = ({ configWrapper }: { configWrapper: ConfigWrapperProps }) => {
    const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:artists");
    const [textFilter, setTextFilter] = React.useState("");

    const { useInfiniteQuery } = Spicetify.ReactQuery;
    const limit = 200;

    const fetchArtists = async ({ pageParam }: { pageParam: number }) => {
        const res = await Spicetify.Platform.LibraryAPI.getContents({
            filters: ["1"],
            sortOrder: sortOption.id,
            textFilter,
            offset: pageParam,
            limit,
        });
        return res;
    };

    const { data, status, hasNextPage, fetchNextPage, refetch } = useInfiniteQuery({
        queryKey: ["library:artists", sortOption.id, textFilter],
        queryFn: fetchArtists,
        initialPageParam: 0,
        getNextPageParam: (lastPage: any, _allPages: any, lastPageParam: number) => {
            return lastPage.totalLength > lastPageParam + limit ? lastPageParam + limit : undefined;
        },
    });

    React.useEffect(() => {
        const onUpdate = (e: any) => refetch();

        Spicetify.Platform.LibraryAPI.getEvents()._emitter.addListener("update", onUpdate);

        return () => Spicetify.Platform.LibraryAPI.getEvents()._emitter.removeListener("update", onUpdate);
    }, []);

    const props = {
        title: "Artists",
        headerEls: [
            <AddButton Menu={<AddMenu />} />,
            dropdown,
            <SearchBar setSearch={setTextFilter} placeholder="Artists" />,
            <SettingsButton configWrapper={configWrapper} />,
        ],
    };

    if (status === "pending") {
        return (
            <PageContainer {...props}>
                <Status icon="library" heading="Loading" subheading="Fetching your artists" />
            </PageContainer>
        );
    } else if (status === "error") {
        return (
            <PageContainer {...props}>
                <Status icon="error" heading="Error" subheading="Failed to load your artists" />
            </PageContainer>
        );
    } else if (!data.pages[0].items.length) {
        return (
            <PageContainer {...props}>
                <Status icon="library" heading="Nothing Here" subheading="You don't have any artists saved" />
            </PageContainer>
        );
    }

    const artists = data.pages.map((page: any) => page.items).flat() as ArtistProps[];

    const artistCards = artists.map((artist) => {
        return (
            <SpotifyCard
                type="artist"
                uri={artist.uri}
                header={artist.name}
                subheader={"Artist"}
                imageUrl={artist.images?.[0]?.url || ""}
            />
        );
    });

    if (hasNextPage) artistCards.push(<LoadMoreCard callback={fetchNextPage} />);

    return (
        <PageContainer {...props}>
            <div className={`main-gridContainer-gridContainer grid`}>{artistCards}</div>
        </PageContainer>
    );
};

export default ArtistsPage;
