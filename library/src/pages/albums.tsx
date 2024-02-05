import React from "react";
import SearchBar from "../components/searchbar";
import { ConfigWrapperProps } from "../types/library_types";
import SettingsButton from "@shared/components/settings_button";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import Status from "@shared/components/status";
import SpotifyCard from "@shared/components/spotify_card";

interface AlbumProps {
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

const AlbumsPage = ({ configWrapper }: { configWrapper: ConfigWrapperProps }) => {
    const [albums, setAlbums] = React.useState<AlbumProps[] | 100 | 200 | 300>(100);
    const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:albums");
    const [textFilter, setTextFilter] = React.useState("");

    React.useEffect(() => {
        Spicetify.Platform.LibraryAPI.getContents({
            filters: ["0"],
            sortOrder: sortOption.id,
            textFilter,
            offset: 0,
            limit: 100,
        }).then((res: any) => {
            const items = res.items.length ? res.items : textFilter ? 300 : 200;
            setAlbums(items);
        });
    }, [sortOption, textFilter]);

    const props = {
        title: "Albums",
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
                type="album"
                uri={album.uri}
                header={album.name}
                subheader={album.artists[0].name}
                imageUrl={album.images?.[0]?.url || ""}
            />
        );
    });

    return (
        <PageContainer {...props}>
            <div className={`main-gridContainer-gridContainer grid`}>{albumCards}</div>
        </PageContainer>
    );
};

export default AlbumsPage;
