import React from "react";
import useDropdownMenu from "../components/hooks/useDropdownMenu";
import Card from "../components/cards/artist_card";
import { apiRequest, updatePageCache, convertToSpotify } from "../funcs";
import Status from "../components/status";
import PageHeader from "../components/page_header";
import { Album, ConfigWrapper } from "../types/stats_types";

export const topAlbumsReq = async (time_range: string, config: ConfigWrapper) => {
    if (!config.CONFIG["api-key"] || !config.CONFIG["lastfm-user"]) {
        return 300;
    }

    const lastfmperiods: Record<string, string> = {
        short_term: "1month",
        medium_term: "6month",
        long_term: "overall",
    };

    const response = await apiRequest(
        "lastfm",
        `https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${config.CONFIG["lastfm-user"]}&api_key=${config.CONFIG["api-key"]}&format=json&period=${lastfmperiods[time_range]}`
    );

    if (!response) {
        return 200;
    }

    return await convertToSpotify(response.topalbums.album, "albums");
};

const AlbumsPage = ({ config }: { config: ConfigWrapper }) => {
    const [topAlbums, setTopAlbums] = React.useState<Album[] | 100 | 200 | 300>(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        `top-albums`
    );

    const fetchTopAlbums = async (time_range: string, force?: boolean, set: boolean = true) => {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:top-albums:${time_range}`);
            if (storedData) {
                setTopAlbums(JSON.parse(storedData));
                return;
            }
        }

        const start = window.performance.now();
        const topAlbums = await topAlbumsReq(time_range, config);

        if (set) setTopAlbums(topAlbums);
        Spicetify.LocalStorage.set(`stats:top-albums:${time_range}`, JSON.stringify(topAlbums));
        console.log("total albums fetch time:", window.performance.now() - start);
    };

    React.useEffect(() => {
        updatePageCache(5, fetchTopAlbums, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopAlbums(activeOption);
    }, [activeOption]);

    const props = {
        callback: () => fetchTopAlbums(activeOption, true),
        config: config,
        dropdown: dropdown,
    };

    switch (topAlbums) {
        case 300:
            return (
                <PageHeader title={`Top Albums`} {...props}>
                    <Status icon="error" heading="No API Key or Username" subheading="Please enter these in the settings menu" />
                </PageHeader>
            );
        case 200:
            return (
                <PageHeader title={`Top Albums`} {...props}>
                    <Status icon="error" heading="Failed to Fetch Top Artists" subheading="An error occurred while fetching the data" />
                </PageHeader>
            );
        case 100:
            return (
                <PageHeader title={`Top Albums`} {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data..." />
                </PageHeader>
            );
    }

    const albumCards = topAlbums.map((album, index) => (
        <Card key={album.id} name={album.name} image={album.image} uri={album.uri} subtext={`#${index + 1} Album`} />
    ));

    return (
        <>
            <PageHeader title="Top Albums" {...props}>
                <div className={`main-gridContainer-gridContainer stats-grid`}>{albumCards}</div>
            </PageHeader>
        </>
    );
};

export default React.memo(AlbumsPage);
