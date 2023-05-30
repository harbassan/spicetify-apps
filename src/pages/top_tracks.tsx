import React from "react";
import TrackRow from "../components/track_row";
import useDropdownMenu from "../components/useDropdownMenu";
import RefreshButton from "../components/refresh_button";

const checkLiked = async (tracks: string[]) => {
    return Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/tracks/contains?ids=${tracks.join(",")}`);
};

const TracksPage = () => {
    const [topTracks, setTopTracks] = React.useState<any[]>([]);
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

        const { items: fetchedTracks } = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0&time_range=${time_range}`);

        const fetchedLikedArray = await checkLiked(fetchedTracks.map((track: { id: string }) => track.id));

        console.log(fetchedTracks);

        const topTracksMinified = fetchedTracks.map((track: any, index: number) => {
            return {
                liked: fetchedLikedArray[index],
                name: track.name,
                image: track.album.images[2].url,
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
        console.log(window.performance.now() - start);
    };

    React.useEffect(() => {
        let cacheInfo = Spicetify.LocalStorage.get("stats:cache-info");
        if (cacheInfo && cacheInfo[1] === "0") {
            ["short_term", "medium_term", "long_term"].filter(option => option !== activeOption).forEach(option => fetchTopTracks(option, true, false));
            fetchTopTracks(activeOption, true);
            Spicetify.LocalStorage.set("stats:cache-info", cacheInfo[0] + "1" + cacheInfo.slice(2));
        }
    }, []);

    React.useEffect(() => {
        fetchTopTracks(activeOption);
    }, [activeOption]);

    if (!topTracks.length) return <></>;

    const createPlaylist = async () => {
        const newPlaylist = await Spicetify.CosmosAsync.post("sp://core-playlist/v1/rootlist", {
            operation: "create",
            name: `Top Songs - ${activeOption}`,
            playlist: true,
            public: false,
            uris: topTracks.map(track => track.uri),
        });
    };

    const trackRows = topTracks.map((track, index) => <TrackRow index={index} {...track} />);

    return (
        <>
            <section className="contentSpacing">
                <div className={`collection-collection-header stats-header`}>
                    <div className="stats-trackPageTitle">
                        <h1 data-encore-id="type" className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-type">
                            Top Tracks
                        </h1>
                        <button className="stats-createPlaylistButton" data-encore-id="buttonSecondary" aria-expanded="false" onClick={createPlaylist}>
                            Turn Into Playlist
                        </button>
                    </div>

                    <div className="collection-searchBar-searchBar">
                        <RefreshButton
                            refreshCallback={() => {
                                fetchTopTracks(activeOption, true);
                            }}
                        />
                        {dropdown}
                    </div>
                </div>
                <div>
                    <div role="grid" aria-rowcount={50} aria-colcount={4} className="main-trackList-trackList main-trackList-indexable" tabIndex={0}>
                        <div className="main-trackList-trackListHeader" role="presentation">
                            <div className="main-trackList-trackListHeaderRow main-trackList-trackListRowGrid" role="row" aria-rowindex={1}>
                                <div className="main-trackList-rowSectionIndex" role="columnheader" aria-colindex={1} aria-sort="none" tabIndex={-1}>
                                    #
                                </div>
                                <div className="main-trackList-rowSectionStart" role="columnheader" aria-colindex={2} aria-sort="none" tabIndex={-1}>
                                    <button className="main-trackList-column main-trackList-sortable" tabIndex={-1}>
                                        <span
                                            className="Type__TypeElement-sc-goli3j-0 TypeElement-mesto-type standalone-ellipsis-one-line"
                                            data-encore-id="type"
                                        >
                                            Title
                                        </span>
                                    </button>
                                </div>
                                <div className="main-trackList-rowSectionVariable" role="columnheader" aria-colindex={3} aria-sort="none" tabIndex={-1}>
                                    <button className="main-trackList-column main-trackList-sortable" tabIndex={-1}>
                                        <span
                                            className="Type__TypeElement-sc-goli3j-0 TypeElement-mesto-type standalone-ellipsis-one-line"
                                            data-encore-id="type"
                                        >
                                            Album
                                        </span>
                                    </button>
                                </div>
                                <div className="main-trackList-rowSectionEnd" role="columnheader" aria-colindex={5} aria-sort="none" tabIndex={-1}>
                                    <button
                                        aria-label="Duration"
                                        className="main-trackList-column main-trackList-durationHeader main-trackList-sortable"
                                        tabIndex={-1}
                                    >
                                        <svg
                                            role="img"
                                            height="16"
                                            width="16"
                                            aria-hidden="true"
                                            viewBox="0 0 16 16"
                                            data-encore-id="icon"
                                            className="Svg-sc-ytk21e-0 Svg-img-16-icon"
                                        >
                                            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path>
                                            <path d="M8 3.25a.75.75 0 0 1 .75.75v3.25H11a.75.75 0 0 1 0 1.5H7.25V4A.75.75 0 0 1 8 3.25z"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="main-rootlist-wrapper" role="presentation" style={{ height: 50 * 56 }}>
                            <div role="presentation">{trackRows}</div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default React.memo(TracksPage);
