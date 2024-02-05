import React from "react";

import Status from "@shared/components/status";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import { apiRequest, checkLiked, convertArtistData, convertTrackData, updatePageCache } from "../funcs";
import SpotifyCard from "@shared/components/spotify_card";
import TrackRow from "../components/track_row";
import Tracklist from "../components/tracklist";
import PageContainer from "@shared/components/page_container";
import { ArtistCardProps, ConfigWrapper, Track } from "../types/stats_types";
import { LASTFM } from "../endpoints";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";

const DropdownOptions = [
    { id: "artists", name: "Top Artists" },
    { id: "tracks", name: "Top Tracks" },
];

const ChartsPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
    const [chartData, setChartData] = React.useState<Track[] | ArtistCardProps[] | 100 | 200 | 500>(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(DropdownOptions, "stats:charts");

    async function fetchChartData(type: string, force?: boolean, set: boolean = true) {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:charts:${type}`);
            if (storedData) return setChartData(JSON.parse(storedData));
        }

        const api_key = configWrapper.config["api-key"];
        if (!api_key) return setChartData(200);

        const response = await apiRequest("charts", LASTFM.charts(api_key, type));
        if (!response) return setChartData(500);

        const data = response[type].track || response[type].artist;
        const cardData = await (type == "artists" ? convertArtistData(data) : convertTrackData(data));

        if (type === "tracks") {
            const likedArray = await checkLiked(cardData.map((track) => track.id));
            if (!likedArray) return setChartData(200);

            cardData.forEach((track: any, index: number) => {
                track.liked = likedArray[index];
            });
        }

        if (set) setChartData(cardData);

        Spicetify.LocalStorage.set(`stats:charts:${type}`, JSON.stringify(cardData));
    }

    React.useEffect(() => {
        updatePageCache(4, fetchChartData, activeOption.id, "charts");
    }, []);

    React.useEffect(() => {
        fetchChartData(activeOption.id);
    }, [activeOption]);

    const refresh = () => {
        fetchChartData(activeOption.id, true);
    };

    const props = {
        title: "Top Albums",
        headerEls: [dropdown, <RefreshButton callback={refresh} />, <SettingsButton configWrapper={configWrapper} />],
    };
    switch (chartData) {
        case 200:
            return (
                <PageContainer {...props}>
                    <Status
                        icon="error"
                        heading="No API Key"
                        subheading="Please enter your Last.fm API key in the settings menu."
                    />
                </PageContainer>
            );
        case 500:
            return (
                <PageContainer {...props}>
                    <Status icon="error" heading="Error" subheading="An error occurred while fetching the data." />
                </PageContainer>
            );
        case 100:
            return (
                <PageContainer {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data from Last.fm..." />
                </PageContainer>
            );
    }

    // @ts-ignore
    if (!chartData[0]?.album) {
        const artistCards = chartData.map((artist, index) => {
            const type = artist.uri.startsWith("https") ? "lastfm" : "artist";
            return (
                <SpotifyCard
                    type={type}
                    uri={artist.uri}
                    header={artist.name}
                    subheader={`#${index + 1} Artist`}
                    imageUrl={artist.image}
                />
            );
        });
        props.title = `Charts - Top Artists`;
        return (
            <PageContainer {...props}>
                <div className={`main-gridContainer-gridContainer grid`}>{artistCards}</div>
            </PageContainer>
        );
    } else {
        const date = new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        const infoToCreatePlaylist = {
            playlistName: `Charts - Top Tracks - ${date}`,
            itemsUris: chartData.map((track) => track.uri),
        };

        const trackRows = chartData.map((track: any, index) => (
            <TrackRow index={index + 1} {...track} uris={chartData.map((track) => track.uri)} />
        ));

        props.title = `Charts - Top Tracks`;
        return (
            <PageContainer {...props} infoToCreatePlaylist={infoToCreatePlaylist}>
                <Tracklist>{trackRows}</Tracklist>
            </PageContainer>
        );
    }
};

export default React.memo(ChartsPage);
