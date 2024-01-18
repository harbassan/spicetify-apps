import React from "react";
import useDropdownMenu from "../components/hooks/useDropdownMenu";
import SpotifyCard from "../components/cards/spotify_card";
import { apiRequest, convertAlbumData, updatePageCache } from "../funcs";
import Status from "../components/status";
import PageContainer from "../components/page_container";
import { Album, ConfigWrapper } from "../types/stats_types";
import { LASTFM } from "../endpoints";

export const topAlbumsReq = async (time_range: string, config: ConfigWrapper) => {
    if (!config.CONFIG["api-key"] || !config.CONFIG["lastfm-user"]) return 300;

    const { ["lastfm-user"]: user, ["api-key"]: key } = config.CONFIG;
    const response = await apiRequest("lastfm", LASTFM.topalbums(user, key, time_range));

    if (!response) return 200;

    return await convertAlbumData(response.topalbums.album);
};

const AlbumsPage = ({ config }: { config: ConfigWrapper }) => {
    const { LocalStorage } = Spicetify;

    const [topAlbums, setTopAlbums] = React.useState<Album[] | 100 | 200 | 300>(100);
    const [dropdown, activeOption] = useDropdownMenu(["short_term", "medium_term", "long_term"], ["Past Month", "Past 6 Months", "All Time"], `top-albums`);

    const fetchTopAlbums = async (time_range: string, force?: boolean, set: boolean = true) => {
        if (!force) {
            let storedData = LocalStorage.get(`stats:top-albums:${time_range}`);
            if (storedData) return setTopAlbums(JSON.parse(storedData));
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

    const albumCards = topAlbums.map((album, index) => {
        const type = album.uri.startsWith("https") ? "lastfm" : "album";
        return <SpotifyCard type={type} uri={album.uri} header={album.name} subheader={`#${index + 1} Album`} imageUrl={album.image} />;
    });

    return (
        <PageContainer title="Top Albums" {...props}>
            <div className={`main-gridContainer-gridContainer stats-grid`}>{albumCards}</div>
        </PageContainer>
    );
};

export default React.memo(AlbumsPage);
