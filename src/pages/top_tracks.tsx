import React from "react";
import TrackRow from "../components/track_row";
import useDropdownMenu from "../components/useDropdownMenu";
import Status from "../components/status";
import { apiRequest, updatePageCache } from "../funcs";
import PageHeader from "../components/page_header";
import Tracklist from "../components/tracklist";

const checkLiked = async (tracks: string[]) => {
    return apiRequest("checkLiked", `https://api.spotify.com/v1/me/tracks/contains?ids=${tracks.join(",")}`);
};

const TracksPage = ({ config }: any) => {
    const [topTracks, setTopTracks] = React.useState<Record<string, any>[] | false>([]);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        "top-tracks"
    );

    const fetchTopTracks = async (time_range: string, force?: boolean, set: boolean = true) => {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:top-tracks:${time_range}`);
            if (storedData) {
                setTopTracks(JSON.parse(storedData));
                return;
            }
        }

        const start = window.performance.now();
        if (!time_range) return;

        const { items: fetchedTracks } = (await apiRequest(
            "topTracks",
            `https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0&time_range=${time_range}`
        )) as any;

        const fetchedLikedArray = await checkLiked(fetchedTracks.map((track: { id: string }) => track.id));
        if (!fetchedLikedArray) {
            setTopTracks(false);
            return;
        }

        const topTracksMinified = fetchedTracks.map((track: any, index: number) => {
            return {
                liked: fetchedLikedArray[index],
                name: track.name,
                image: track.album.images[2]
                    ? track.album.images[2].url
                    : track.album.images[1]
                    ? track.album.images[1].url
                    : "https://images.squarespace-cdn.com/content/v1/55fc0004e4b069a519961e2d/1442590746571-RPGKIXWGOO671REUNMCB/image-asset.gif",
                uri: track.uri,
                artists: track.artists.map((artist: any) => ({ name: artist.name, uri: artist.uri })),
                duration: track.duration_ms,
                album: track.album.name,
                album_uri: track.album.uri,
                popularity: track.popularity,
                explicit: track.explicit,
                index: index + 1,
            };
        });

        if (set) setTopTracks(topTracksMinified);

        Spicetify.LocalStorage.set(`stats:top-tracks:${time_range}`, JSON.stringify(topTracksMinified));
        console.log("total tracks fetch time:", window.performance.now() - start);
    };

    React.useEffect(() => {
        updatePageCache(1, fetchTopTracks, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopTracks(activeOption);
    }, [activeOption]);

    const props = {
        callback: () => fetchTopTracks(activeOption, true),
        config: config,
        dropdown: dropdown,
    };

    if (!topTracks) {
        return (
            <>
                <PageHeader title="Top Tracks" {...props}>
                    <Status heading="Failed to Fetch Top Tracks" subheading="Make an issue on Github" />
                </PageHeader>
            </>
        );
    }

    if (!topTracks.length) return <></>;

    topTracks as Record<string, any>[];

    const createPlaylist = async () => {
        await Spicetify.CosmosAsync.post("sp://core-playlist/v1/rootlist", {
            operation: "create",
            name: `Top Songs - ${activeOption}`,
            playlist: true,
            public: false,
            uris: topTracks.map(track => track.uri),
        });
    };

    const trackRows = topTracks.map((track: any, index) => <TrackRow index={index} {...track} />);

    // <button className="stats-createPlaylistButton" data-encore-id="buttonSecondary" aria-expanded="false" onClick={createPlaylist}>
    //     Turn Into Playlist
    // </button>;

    return (
        <>
            <PageHeader title="Top Tracks" {...props}>
                <Tracklist>{trackRows}</Tracklist>
            </PageHeader>
        </>
    );
};

export default React.memo(TracksPage);
