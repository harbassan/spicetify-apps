import React from "react";
import SearchBar from "../components/searchbar";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import PageContainer from "@shared/components/page_container";
import Status from "@shared/components/status";
import SettingsButton from "@shared/components/settings_button";
import { ConfigWrapperProps } from "../types/library_types";
import SpotifyCard from "@shared/components/spotify_card";

interface ShowProps {
    uri: string;
    name: string;
    publisher: string;
    images: { url: string }[];
}

const sortOptions = [
    { id: "0", name: "Name" },
    { id: "1", name: "Date Added" },
];

const ShowsPage = ({ configWrapper }: { configWrapper: ConfigWrapperProps }) => {
    const [shows, setShows] = React.useState<ShowProps[] | 100 | 200 | 300>(100);
    const [dropdown, sortOption] = useDropdownMenu(sortOptions, "library:shows");
    const [textFilter, setTextFilter] = React.useState("");

    React.useEffect(() => {
        Spicetify.Platform.LibraryAPI.getContents({
            filters: ["3"],
            sortOrder: sortOption.id,
            textFilter,
            offset: 0,
            limit: 100,
        }).then((res: any) => {
            const items = res.items.length ? res.items : textFilter ? 300 : 200;
            setShows(items);
        });
    }, [sortOption, textFilter]);

    const props = {
        title: "Shows",
        headerEls: [
            dropdown,
            <SearchBar setSearch={setTextFilter} placeholder="Shows" />,
            <SettingsButton configWrapper={configWrapper} />,
        ],
    };

    switch (shows) {
        case 100:
            return <></>;
        case 200:
            return (
                <PageContainer title="Shows">
                    <Status icon="library" heading="Nothing Here" subheading="You don't have any shows saved" />
                </PageContainer>
            );
        case 300:
            return (
                <PageContainer {...props}>
                    <Status icon="library" heading="Nothing Here" subheading="No shows match your search" />
                </PageContainer>
            );
    }

    const showCards = shows.map((show) => {
        return (
            <SpotifyCard
                type="show"
                uri={show.uri}
                header={show.name}
                subheader={show.publisher}
                imageUrl={show.images?.[0]?.url || ""}
            />
        );
    });

    return (
        <PageContainer {...props}>
            <div className={`main-gridContainer-gridContainer grid`}>{showCards}</div>
        </PageContainer>
    );
};

export default ShowsPage;
