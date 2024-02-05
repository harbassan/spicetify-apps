import React from "react";
import SearchBar from "../components/searchbar";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import Status from "@shared/components/status";
import SpotifyCard from "@shared/components/spotify_card";
import SettingsButton from "@shared/components/settings_button";
import { ConfigWrapperProps } from "../types/library_types";

interface ArtistProps {
    uri: string;
    name: string;
    images: { url: string }[];
}

const sortOptions = [
    { id: "0", name: "Name" },
    { id: "1", name: "Date Added" },
];

const ArtistsPage = ({ configWrapper }: { configWrapper: ConfigWrapperProps }) => {
    const [artists, setArtists] = React.useState<ArtistProps[] | 100 | 200 | 300>(100);
    const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:artists");
    const [textFilter, setTextFilter] = React.useState("");

    React.useEffect(() => {
        Spicetify.Platform.LibraryAPI.getContents({
            filters: ["1"],
            sortOrder: sortOption.id,
            textFilter,
            offset: 0,
            limit: 100,
        }).then((res: any) => {
            const items = res.items.length ? res.items : textFilter ? 300 : 200;
            setArtists(items);
        });
    }, [sortOption, textFilter]);

    const props = {
        title: "Artists",
        headerEls: [
            dropdown,
            <SearchBar setSearch={setTextFilter} placeholder="Artists" />,
            <SettingsButton configWrapper={configWrapper} />,
        ],
    };

    switch (artists) {
        case 100:
            return <></>;
        case 200:
            return (
                <PageContainer title="Artists">
                    <Status icon="library" heading="Nothing Here" subheading="You don't have any artists saved" />
                </PageContainer>
            );
        case 300:
            return (
                <PageContainer {...props}>
                    <Status icon="library" heading="Nothing Here" subheading="No artists match your search" />
                </PageContainer>
            );
    }

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

    return (
        <PageContainer {...props}>
            <div className={`main-gridContainer-gridContainer grid`}>{artistCards}</div>
        </PageContainer>
    );
};

export default ArtistsPage;
