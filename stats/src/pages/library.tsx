import React from "react";
import useDropdownMenu from "@shared/dropdown/useDropdownMenu";
import StatCard from "../components/cards/stat_card";
import GenresCard from "../components/cards/genres_card";
import SpotifyCard from "@shared/components/spotify_card";
import InlineGrid from "../components/inline_grid";
import { apiRequest, updatePageCache, fetchAudioFeatures, fetchTopAlbums, fetchTopArtists } from "../funcs";
import Status from "@shared/components/status";
import PageContainer from "@shared/components/page_container";
import Shelf from "../components/shelf";
import { Album, ArtistCardProps, ConfigWrapper } from "../types/stats_types";
import { SPOTIFY } from "../endpoints";
import RefreshButton from "../components/buttons/refresh_button";
import SettingsButton from "@shared/components/settings_button";

interface LibraryProps {
    audioFeatures: Record<string, number>;
    trackCount: number;
    totalDuration: number;
    artistCount: number;
    artists: ArtistCardProps[];
    genres: any[];
    genresDenominator: number;
    playlistCount: number;
    albums: Album[];
    years: any[];
    yearsDenominator: number;
}

const DropdownOptions = [
    { id: "owned", name: "My Playlists" },
    { id: "all", name: "All Playlists" },
];

const LibraryPage = ({ configWrapper }: { configWrapper: ConfigWrapper }) => {
    const [library, setLibrary] = React.useState<LibraryProps | 100 | 200 | 300>(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(DropdownOptions, "stats:library");

    const fetchData = async (option: string, force?: boolean, set: boolean = true) => {
        try {
            if (!force) {
                let storedData = Spicetify.LocalStorage.get(`stats:library:${option}`);
                if (storedData) return setLibrary(JSON.parse(storedData));
            }
            const start = window.performance.now();

            // fetch all rootlist items
            const rootlistItems = await apiRequest("rootlist", SPOTIFY.rootlist);

            // flatten rootlist into playlists
            const flattenPlaylists = (items: any[]) => {
                const playlists: any[] = [];

                items.forEach((row) => {
                    if (row.type === "playlist") {
                        // add the playlist to the result list
                        playlists.push(row);
                    } else if (row.type === "folder") {
                        // recursively flatten playlists in the folder
                        if (!row.rows) return;
                        const folderPlaylists = flattenPlaylists(row.rows);
                        // add the flattened playlists to the result list
                        playlists.push(...folderPlaylists);
                    }
                });

                return playlists;
            };

            let playlists = flattenPlaylists(rootlistItems?.rows);

            playlists = playlists.sort((a, b) => (a.ownedBySelf === b.ownedBySelf ? 0 : a.ownedBySelf ? -1 : 1));
            let indexOfFirstNotOwned = -1;

            let playlistUris: string[] = [];

            let trackCount: number = 0;
            let ownedTrackCount: number = 0;

            playlists.forEach((playlist) => {
                if (playlist.totalLength === 0) return;
                if (!playlist.ownedBySelf && indexOfFirstNotOwned === -1) indexOfFirstNotOwned = playlistUris.length;
                playlistUris.push(playlist.link);
                trackCount += playlist.totalLength;
                if (playlist.ownedBySelf) ownedTrackCount += playlist.totalLength;
            }, 0);

            // fetch all playlist tracks
            const playlistsMeta = await Promise.all(
                playlistUris.map((uri: string) => {
                    return apiRequest("playlistsMetadata", SPOTIFY.playlist(uri), 5, false);
                })
            );

            let duration = 0;
            let trackIDs: string[] = [];
            let popularity: number = 0;
            let albums: Record<string, number> = {};
            let artists: Record<string, number> = {};
            let explicitCount: number = 0;

            let ownedDuration = 0;
            let ownedArtists: Record<string, number> = {};
            let ownedPopularity: number = 0;
            let ownedAlbums: Record<string, number> = {};
            let ownedExplicitCount: number = 0;

            // loop through all playlists, add up total duration and obscurity, seperate track ids and artists
            for (let i = 0; i < playlistsMeta.length; i++) {
                const playlist = playlistsMeta[i];
                if (!playlist) continue;
                if (i === indexOfFirstNotOwned) {
                    ownedDuration = duration;
                    ownedArtists = Object.assign({}, artists);
                    ownedPopularity = popularity;
                    ownedExplicitCount = explicitCount;
                    ownedAlbums = Object.assign({}, albums);
                }
                duration += playlist.playlist.duration;
                playlist.items.forEach((track: any) => {
                    if (!track?.album) return;
                    if (track.link.includes("local")) return;

                    trackIDs.push(track.link.split(":")[2]);

                    if (track.isExplicit) explicitCount++;

                    popularity += track.popularity;

                    const albumID = track.album.link.split(":")[2];
                    albums[albumID] = albums[albumID] ? albums[albumID] + 1 : 1;

                    track.artists.forEach((artist: any) => {
                        const artistID = artist.link.split(":")[2];
                        artists[artistID] = artists[artistID] ? artists[artistID] + 1 : 1;
                    });
                });
            }

            const [topArtists, topGenres, topGenresTotal]: any = await fetchTopArtists(artists);
            const [ownedTopArtists, ownedTopGenres, ownedTopGenresTotal]: any = await fetchTopArtists(ownedArtists);

            const [topAlbums, releaseYears, releaseYearsTotal]: any = await fetchTopAlbums(albums);
            const [ownedTopAlbums, ownedReleaseYears, ownedReleaseYearsTotal]: any = await fetchTopAlbums(
                ownedAlbums,
                topAlbums
            );

            const fetchedFeatures: any[] = await fetchAudioFeatures(trackIDs);

            const audioFeatures: Record<string, number> = {
                danceability: 0,
                energy: 0,
                valence: 0,
                speechiness: 0,
                acousticness: 0,
                instrumentalness: 0,
                liveness: 0,
                tempo: 0,
            };

            let ownedAudioFeatures: Record<string, number> = {};

            for (let i = 0; i < fetchedFeatures.length; i++) {
                if (i === ownedTrackCount) {
                    ownedAudioFeatures = {
                        popularity: ownedPopularity,
                        explicitness: ownedExplicitCount,
                        ...audioFeatures,
                    };
                }
                if (!fetchedFeatures[i]) continue;
                const track = fetchedFeatures[i];
                Object.keys(audioFeatures).forEach((feature) => {
                    audioFeatures[feature] += track[feature];
                });
            }

            const allAudioFeatures: Record<string, any> = {
                popularity,
                explicitness: explicitCount,
                ...audioFeatures,
            };

            for (let key in allAudioFeatures) {
                allAudioFeatures[key] /= fetchedFeatures.length;
            }

            for (let key in ownedAudioFeatures) {
                ownedAudioFeatures[key] /= ownedTrackCount;
            }

            const ownedStats = {
                audioFeatures: ownedAudioFeatures,
                trackCount: ownedTrackCount,
                totalDuration: ownedDuration,
                artists: ownedTopArtists,
                artistCount: Object.keys(ownedArtists).length,
                genres: ownedTopGenres,
                genresDenominator: ownedTopGenresTotal,
                playlistCount: indexOfFirstNotOwned > 0 ? indexOfFirstNotOwned : 0,
                albums: ownedTopAlbums,
                years: ownedReleaseYears,
                yearsDenominator: ownedReleaseYearsTotal,
            };

            const allStats = {
                playlistCount: playlists.length,
                audioFeatures: allAudioFeatures,
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

            if (set) {
                if (option === "all" && allStats.playlistCount) setLibrary(allStats);
                else if (option === "owned" && ownedStats.playlistCount) setLibrary(ownedStats);
                else return setLibrary(300);
            }

            Spicetify.LocalStorage.set(`stats:library:all`, JSON.stringify(allStats));
            Spicetify.LocalStorage.set(`stats:library:owned`, JSON.stringify(ownedStats));

            console.log("total library fetch time:", window.performance.now() - start);
        } catch (e) {
            console.error(e);
            setLibrary(200);
        }
    };

    React.useEffect(() => {
        updatePageCache(3, fetchData, activeOption.id, true);
    }, []);

    React.useEffect(() => {
        fetchData(activeOption.id);
    }, [activeOption]);

    const refresh = () => {
        fetchData(activeOption.id, true);
    };

    const props = {
        title: "Library Analysis",
        headerEls: [dropdown, <RefreshButton callback={refresh} />, <SettingsButton configWrapper={configWrapper} />],
    };
    switch (library) {
        case 300:
            return (
                <PageContainer {...props}>
                    <Status
                        icon="error"
                        heading="No Playlists In Your Library"
                        subheading="Try adding some playlists first"
                    />
                </PageContainer>
            );
        case 200:
            return (
                <PageContainer {...props}>
                    <Status icon="error" heading="Failed to Fetch Stats" subheading="Make an issue on Github" />
                </PageContainer>
            );
        case 100:
            return (
                <PageContainer {...props}>
                    <Status icon="library" heading="Analysing your Library" subheading="This may take a while" />
                </PageContainer>
            );
    }

    const statCards = Object.entries(library.audioFeatures).map(([key, value]) => {
        return <StatCard label={key} value={value} />;
    });

    const artistCards = library.artists.slice(0, 10).map((artist) => {
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
        <PageContainer {...props}>
            <section className="stats-libraryOverview">
                <StatCard label="Total Playlists" value={library.playlistCount.toString()} />
                <StatCard label="Total Tracks" value={library.trackCount.toString()} />
                <StatCard label="Total Artists" value={library.artistCount.toString()} />
                <StatCard label="Total Minutes" value={Math.floor(library.totalDuration / 60).toString()} />
                <StatCard label="Total Hours" value={(library.totalDuration / (60 * 60)).toFixed(1)} />
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
        </PageContainer>
    );
};

export default React.memo(LibraryPage);
