import React from "react";

import TrackRow from "../components/track_row";
import Status from "../components/status";
import PageContainer from "../components/page_container";
import Tracklist from "../components/tracklist";
import useDropdownMenu from "../components/hooks/useDropdownMenu";
import { apiRequest, updatePageCache, convertToSpotify, checkLiked } from "../funcs";
import { ConfigWrapper, Track } from "../types/stats_types";

export const topTracksReq = async (time_range: string, config: ConfigWrapper) => {
    if (config.CONFIG["use-lastfm"] === true) {
        if (!config.CONFIG["api-key"] || !config.CONFIG["lastfm-user"]) {
            return 300;
        }

        const lastfmperiods: Record<string, string> = {
            short_term: "1month",
            medium_term: "6month",
            long_term: "overall",
        };

        const lastfmData = await apiRequest(
            "lastfm",
            `https://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${config.CONFIG["lastfm-user"]}&api_key=${config.CONFIG["api-key"]}&format=json&period=${lastfmperiods[time_range]}`
        );

        if (!lastfmData) {
            return 200;
        }

        const spotifyData = await convertToSpotify(lastfmData.toptracks.track, "tracks");

        const fetchedLikedArray = await checkLiked(spotifyData.map(track => track.id));
        if (!fetchedLikedArray) {
            return 200;
        }
        spotifyData.forEach((track: any, index: number) => {
            track.liked = fetchedLikedArray[index];
        });

        return spotifyData;
    } else {
        const response = await apiRequest("topTracks", `https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0&time_range=${time_range}`);

        if (!response) {
            return 200;
        }

        const fetchedLikedArray = await checkLiked(response.items.map((track: { id: string }) => track.id));
        if (!fetchedLikedArray) {
            return 200;
        }

        return response.items.map((track: any, index: number) => {
            return {
                liked: fetchedLikedArray[index],
                name: track.name,
                image: track.album.images[2]
                    ? track.album.images[2].url
                    : track.album.images[1]
                        ? track.album.images[1].url
                        : "https://images.squarespace-cdn.com/content/v1/55fc0004e4b069a519961e2d/1442590746571-RPGKIXWGOO671REUNMCB/image-asset.gif",
                uri: track.uri,
                id: track.id,
                artists: track.artists.map((artist: any) => ({ name: artist.name, uri: artist.uri })),
                duration: track.duration_ms,
                album: track.album.name,
                album_uri: track.album.uri,
                popularity: track.popularity,
                explicit: track.explicit,
                release_year: track.album.release_date.slice(0, 4),
            };
        });
    }
};

const TracksPage = ({ config }: { config: ConfigWrapper }) => {
    const { LocalStorage } = Spicetify;

    const [topTracks, setTopTracks] = React.useState<Track[] | 100 | 200 | 300>(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        "top-tracks"
    );

    const fetchTopTracks = async (time_range: string, force?: boolean, set: boolean = true) => {
        if (!force) {
            let storedData = LocalStorage.get(`stats:top-tracks:${time_range}`);
            if (storedData) {
                setTopTracks(JSON.parse(storedData));
                return;
            }
        }

        const start = window.performance.now();
        if (!time_range) return;

        const topTracks = await topTracksReq(time_range, config);

        if (set) setTopTracks(topTracks);

        LocalStorage.set(`stats:top-tracks:${time_range}`, JSON.stringify(topTracks));
        console.log("total tracks fetch time:", window.performance.now() - start);
    };

    React.useEffect(() => {
        updatePageCache(1, fetchTopTracks, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopTracks(activeOption);
    }, [activeOption]);

    const props = {
        title: "Top Tracks",
        refreshCallback: () => fetchTopTracks(activeOption, true),
        config: config,
        dropdown: dropdown,
    };

    switch (topTracks) {
        case 300:
            return (
                <PageContainer {...props}>
                    <Status icon="error" heading="No API Key or Username" subheading="Please enter these in the settings menu" />
                </PageContainer>
            );
        case 200:
            return (
                <PageContainer {...props}>
                    <Status icon="error" heading="Failed to Fetch Top Tracks" subheading="An error occurred while fetching the data" />
                </PageContainer>
            );
        case 100:
            return (
                <PageContainer {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data..." />
                </PageContainer>
            );
    }

    const infoToCreatePlaylist = {
        playlistName: `Top Songs - ${activeOption}`,
        itemsUris: topTracks.map(track => track.uri),
    };
    const trackRows = topTracks.map((track: Track, index) => <TrackRow index={index + 1} {...track} uris={topTracks.map(track => track.uri)} />);

    return (
        <PageContainer {...props} infoToCreatePlaylist={infoToCreatePlaylist}>
            <Tracklist>{trackRows}</Tracklist>
        </PageContainer>
    );
};

export default React.memo(TracksPage);
