import React from "react";
import useDropdownMenu from "../components/hooks/useDropdownMenu";
import SpotifyCard from "../components/cards/spotify_card";
import { apiRequest, updatePageCache, convertToSpotify } from "../funcs";
import Status from "../components/status";
import PageContainer from "../components/page_container";
import { Album, ConfigWrapper } from "../types/stats_types";

const { LocalStorage } = Spicetify;

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
    const [dropdown, activeOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        `top-albums`
    );

    const fetchTopAlbums = async (time_range: string, force?: boolean, set: boolean = true) => {
        if (!force) {
            let storedData = LocalStorage.get(`stats:top-albums:${time_range}`);
            if (storedData) {
                setTopAlbums(JSON.parse(storedData));
                return;
            }
        }

        const start = window.performance.now();
        const topAlbums = await topAlbumsReq(time_range, config);

        if (set) setTopAlbums(topAlbums);
        LocalStorage.set(`stats:top-albums:${time_range}`, JSON.stringify(topAlbums));
        console.log("total albums fetch time:", window.performance.now() - start);
    };

    React.useEffect(() => {
        updatePageCache(5, fetchTopAlbums, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopAlbums(activeOption);
    }, [activeOption]);

    const props = {
        refreshCallback: () => fetchTopAlbums(activeOption, true),
        config: config,
        dropdown: dropdown,
    };

    switch (topAlbums) {
        case 300:
            return (
                <PageContainer title={`Top Albums`} {...props}>
                    <Status icon="error" heading="No API Key or Username" subheading="Please enter these in the settings menu" />
                </PageContainer>
            );
        case 200:
            return (
                <PageContainer title={`Top Albums`} {...props}>
                    <Status icon="error" heading="Failed to Fetch Top Artists" subheading="An error occurred while fetching the data" />
                </PageContainer>
            );
        case 100:
            return (
                <PageContainer title={`Top Albums`} {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data..." />
                </PageContainer>
            );
    }

    const albumCards = topAlbums.map((album, index) => (
        <SpotifyCard type="lastfm" name={album.name} imageUrl={album.image} uri={album.uri} subtext={`#${index + 1} Album`} />
    ));

    return (
        <PageContainer title="Top Albums" {...props}>
            <div className={`main-gridContainer-gridContainer stats-grid`}>{albumCards}</div>
        </PageContainer>
    );
};

export default React.memo(AlbumsPage);
