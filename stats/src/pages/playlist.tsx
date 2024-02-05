import React from "react";

import StatCard from "../components/cards/stat_card";
import GenresCard from "../components/cards/genres_card";
import SpotifyCard from "@shared/components/spotify_card";
import Status from "@shared/components/status";
import InlineGrid from "../components/inline_grid";
import Shelf from "../components/shelf";
import { apiRequest, fetchAudioFeatures, fetchTopArtists, fetchTopAlbums } from "../funcs";
import { Album, ArtistCardProps } from "../types/stats_types";
import { SPOTIFY } from "../endpoints";

interface LibraryProps {
    audioFeatures: Record<string, number>;
    trackCount: number;
    totalDuration: number;
    artistCount: number;
    genres: [string, number][];
    genresDenominator: number;
    years: [string, number][];
    yearsDenominator: number;
    artists: ArtistCardProps[];
    albums: Album[];
}

const PlaylistPage = ({ uri }: { uri: string }) => {
    // @ts-expect-error
    const { ReactComponent, ReactQuery, Platform, _platform } = Spicetify;
    const { History, ReduxStore } = Platform;
    const { QueryClientProvider, QueryClient } = ReactQuery;
    // @ts-expect-error
    const { Router, Route, Routes, PlatformProvider, StoreProvider } = ReactComponent;

    const [library, setLibrary] = React.useState<LibraryProps | 100 | 200>(100);

    const fetchData = async () => {
        const start = window.performance.now();

        const playlistMeta = await apiRequest("playlistMeta", SPOTIFY.playlist(uri));
        if (!playlistMeta) {
            setLibrary(200);
            return;
        }

        let duration = playlistMeta.playlist.duration;
        let trackCount = playlistMeta.playlist.length;
        let explicitCount: number = 0;
        let trackIDs: string[] = [];
        let popularity: number = 0;
        let albums: Record<string, number> = {};
        let artists: Record<string, number> = {};

        playlistMeta.items.forEach((track: any) => {
            popularity += track.popularity;

            trackIDs.push(track.link.split(":")[2]);

            if (track.isExplicit) explicitCount++;

            const albumID = track.album.link.split(":")[2];
            albums[albumID] = albums[albumID] ? albums[albumID] + 1 : 1;

            track.artists.forEach((artist: any) => {
                const artistID = artist.link.split(":")[2];
                artists[artistID] = artists[artistID] ? artists[artistID] + 1 : 1;
            });
        });

        const [topAlbums, releaseYears, releaseYearsTotal]: any = await fetchTopAlbums(albums);
        const [topArtists, topGenres, topGenresTotal]: any = await fetchTopArtists(artists);

        const fetchedFeatures: any[] = await fetchAudioFeatures(trackIDs);

        let audioFeatures: Record<string, number> = {
            danceability: 0,
            energy: 0,
            valence: 0,
            speechiness: 0,
            acousticness: 0,
            instrumentalness: 0,
            liveness: 0,
            tempo: 0,
        };

        for (let i = 0; i < fetchedFeatures.length; i++) {
            if (!fetchedFeatures[i]) continue;
            const track = fetchedFeatures[i];
            Object.keys(audioFeatures).forEach((feature) => {
                audioFeatures[feature] += track[feature];
            });
        }

        audioFeatures = {
            popularity,
            explicitness: explicitCount,
            ...audioFeatures,
        };

        for (let key in audioFeatures) {
            audioFeatures[key] /= fetchedFeatures.length;
        }

        const stats = {
            audioFeatures: audioFeatures,
            trackCount: trackCount,
            totalDuration: duration,
            artistCount: Object.keys(artists).length,
            artists: topArtists,
            genres: topGenres,
            genresDenominator: topGenresTotal,
            albums: topAlbums,
            years: releaseYears,
            yearsDenominator: releaseYearsTotal,
        };

        setLibrary(stats);

        console.log("total playlist stats fetch time:", window.performance.now() - start);
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    switch (library) {
        case 200:
            return <Status icon="error" heading="Failed to Fetch Stats" subheading="Make an issue on Github" />;
        case 100:
            return <Status icon="library" heading="Analysing the Playlist" subheading="This may take a while" />;
    }

    const statCards = Object.entries(library.audioFeatures).map(([key, value]) => {
        return <StatCard label={key} value={value} />;
    });

    const artistCards = library.artists.map((artist) => {
        return (
            <SpotifyCard
                type="artist"
                uri={artist.uri}
                header={artist.name}
                subheader={`Appears in ${artist.freq} tracks`}
                imageUrl={artist.image}
            />
        );
    });

    const albumCards = library.albums.map((album) => {
        return (
            <SpotifyCard
                type="album"
                uri={album.uri}
                header={album.name}
                subheader={`Appears in ${album.freq} tracks`}
                imageUrl={album.image}
            />
        );
    });

    return (
        <QueryClientProvider client={new QueryClient()}>
            <Router
                location={{
                    pathname: "/",
                }}
                navigator={History}
            >
                <StoreProvider store={ReduxStore}>
                    <PlatformProvider platform={_platform}>
                        <Routes>
                            <Route
                                path="/"
                                element={
                                    <div className="page-content encore-dark-theme encore-base-set">
                                        <section className="stats-libraryOverview">
                                            <StatCard label="Total Tracks" value={library.trackCount.toString()} />
                                            <StatCard label="Total Artists" value={library.artistCount.toString()} />
                                            <StatCard
                                                label="Total Minutes"
                                                value={Math.floor(library.totalDuration / 60).toString()}
                                            />
                                            <StatCard
                                                label="Total Hours"
                                                value={(library.totalDuration / (60 * 60)).toFixed(1)}
                                            />
                                        </section>
                                        <Shelf title="Most Frequent Genres">
                                            <GenresCard genres={library.genres} total={library.genresDenominator} />
                                            <InlineGrid special>{statCards}</InlineGrid>
                                        </Shelf>
                                        <Shelf title="Most Frequent Artists">
                                            <InlineGrid>{artistCards}</InlineGrid>
                                        </Shelf>
                                        <Shelf title="Most Frequent Albums">
                                            <InlineGrid>{albumCards}</InlineGrid>
                                        </Shelf>
                                        <Shelf title="Release Year Distribution">
                                            <GenresCard genres={library.years} total={library.yearsDenominator} />
                                        </Shelf>
                                    </div>
                                }
                            />
                        </Routes>
                    </PlatformProvider>
                </StoreProvider>
            </Router>
        </QueryClientProvider>
    );
};

export default React.memo(PlaylistPage);
