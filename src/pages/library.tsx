import React from "react";
import useDropdownMenu from "../components/useDropdownMenu";
import StatCard from "../components/stat_card";
import GenresCard from "../components/genres_card";
import ArtistCard from "../components/artist_card";
import InlineGrid from "../components/inline_grid";
import { apiRequest, updatePageCache, fetchAudioFeatures, fetchTopAlbums, fetchTopArtists } from "../funcs";
import Status from "../components/status";
import PageHeader from "../components/page_header";

interface LibraryProps {
    audioFeatures: Record<string, number>;
    trackCount: number;
    totalDuration: number;
    artistCount: number;
    artists: any[];
    genres: any[];
    genresDenominator: number;
    playlistCount: number;
    albums: any[];
    years: any[];
    yearsDenominator: number;
}

const LibraryPage = ({ config }: any) => {
    const [library, setLibrary] = React.useState<LibraryProps | null | false>(null);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(["owned", "all"], ["My Playlists", "All Playlists"], "library");

    const fetchData = async (option: string, force?: boolean, set: boolean = true) => {
        try {
            if (!force) {
                let storedData = Spicetify.LocalStorage.get(`stats:library:${option}`);
                if (storedData) {
                    setLibrary(JSON.parse(storedData));
                    return;
                }
            }
            const start = window.performance.now();

            // fetch all rootlist items
            const rootlistItems = await apiRequest("rootlist", "sp://core-playlist/v1/rootlist");

            // flatten rootlist into playlists
            const flattenPlaylists = (items: any[]) => {
                const playlists: any[] = [];

                items.forEach(row => {
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

            playlists.forEach(playlist => {
                if (playlist.totalLength === 0) return;
                if (!playlist.ownedBySelf && indexOfFirstNotOwned === -1) indexOfFirstNotOwned = playlistUris.length;
                playlistUris.push(playlist.link);
                trackCount += playlist.totalLength;
                if (playlist.ownedBySelf) ownedTrackCount += playlist.totalLength;
            }, 0);

            // fetch all playlist tracks
            const playlistsMeta = await Promise.all(
                playlistUris.map((uri: string) => {
                    return apiRequest("playlistsMetadata", `sp://core-playlist/v1/playlist/${uri}`, 5, false);
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
                    if (!track) return;

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
            const [ownedTopAlbums, ownedReleaseYears, ownedReleaseYearsTotal]: any = await fetchTopAlbums(ownedAlbums);

            const fetchedFeatures: any[] = await fetchAudioFeatures(trackIDs);

            const audioFeatures: Record<string, number> = {
                popularity: popularity,
                explicitness: explicitCount,
                danceability: 0,
                energy: 0,
                valence: 0,
                speechiness: 0,
                acousticness: 0,
                instrumentalness: 0,
                liveness: 0,
                tempo: 0,
                loudness: 0,
            };

            let ownedAudioFeatures: Record<string, number> = {};

            for (let i = 0; i < fetchedFeatures.length; i++) {
                if (i === ownedTrackCount) {
                    ownedAudioFeatures = { popularity: ownedPopularity, explicitness: ownedExplicitCount, ...audioFeatures };
                }
                if (!fetchedFeatures[i]) continue;
                const track = fetchedFeatures[i];
                audioFeatures["danceability"] += track["danceability"];
                audioFeatures["energy"] += track["energy"];
                audioFeatures["valence"] += track["valence"];
                audioFeatures["speechiness"] += track["speechiness"];
                audioFeatures["acousticness"] += track["acousticness"];
                audioFeatures["instrumentalness"] += track["instrumentalness"];
                audioFeatures["liveness"] += track["liveness"];
                audioFeatures["tempo"] += track["tempo"];
                audioFeatures["loudness"] += track["loudness"];
            }

            for (let key in audioFeatures) {
                audioFeatures[key] /= fetchedFeatures.length;
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

            if (set) {
                if (option === "all") setLibrary(allStats);
                else setLibrary(ownedStats);
            }

            Spicetify.LocalStorage.set(`stats:library:all`, JSON.stringify(allStats));
            Spicetify.LocalStorage.set(`stats:library:owned`, JSON.stringify(ownedStats));

            console.log("total library fetch time:", window.performance.now() - start);
        } catch (e) {
            console.error(e);
            setLibrary(false);
        }
    };

    React.useEffect(() => {
        updatePageCache(3, fetchData, activeOption, true);
    }, []);

    React.useEffect(() => {
        fetchData(activeOption);
    }, [activeOption]);

    const props = {
        callback: () => fetchData(activeOption),
        config: config,
        dropdown: dropdown,
    };

    // Render a status page that doesnt impede the user from using the rest of the app
    if (!library || library.trackCount === 0) {
        const heading = library === null ? "Analysing Your Library" : !library ? "Failed To Fetch Library Stats" : "No Playlists In Your Library";
        const subheading = library === null ? "This may take a while" : !library ? "Make an issue on Github" : "Try adding some playlists first";
        return (
            <>
                <PageHeader title="Library Analysis" {...props}>
                    <Status heading={heading} subheading={subheading} />
                </PageHeader>
            </>
        );
    }

    const parseVal = (obj: [string, number]) => {
        switch (obj[0]) {
            case "tempo":
                return Math.round(obj[1]) + "bpm";
            case "loudness":
                return Math.round(obj[1]) + "dB";
            case "popularity":
                return Math.round(obj[1]) + "%";
            default:
                return Math.round(obj[1] * 100) + "%";
        }
    };

    const statCards: JSX.Element[] = [];

    Object.entries(library.audioFeatures).forEach(obj => {
        statCards.push(<StatCard stat={obj[0][0].toUpperCase() + obj[0].slice(1)} value={parseVal(obj)} />);
    });

    const artistCards: JSX.Element[] = library.artists
        .slice(0, 10)
        .map((artist: any) => <ArtistCard name={artist.name} image={artist.image} uri={artist.uri} subtext={`Appears in ${artist.freq} tracks`} />);

    const albumCards: JSX.Element[] = library.albums.map(album => {
        return <ArtistCard name={album.name} image={album.image} uri={album.uri} subtext={`Appears in ${album.freq} tracks`} />;
    });

    return (
        <>
            <PageHeader title="Library Analysis" {...props}>
                <section className="stats-libraryOverview">
                    <StatCard stat="Total Playlists" value={library.playlistCount} />
                    <StatCard stat="Total Tracks" value={library.trackCount} />
                    <StatCard stat="Total Artists" value={library.artistCount} />
                    <StatCard stat="Total Minutes" value={Math.floor(library.totalDuration / 60)} />
                    <StatCard stat="Total Hours" value={(library.totalDuration / (60 * 60)).toFixed(1)} />
                </section>
                <section>
                    <div className="main-shelf-header">
                        <div className="main-shelf-topRow">
                            <div className="main-shelf-titleWrapper">
                                <h2 className="TypeElement-canon-textBase-type main-shelf-title">Most Frequent Genres</h2>
                            </div>
                        </div>
                    </div>
                    <GenresCard genres={library.genres} total={library.genresDenominator} />
                    <InlineGrid special>{statCards}</InlineGrid>
                </section>
                <section className="main-shelf-shelf Shelf">
                    <div className="main-shelf-header">
                        <div className="main-shelf-topRow">
                            <div className="main-shelf-titleWrapper">
                                <h2 className="TypeElement-canon-textBase-type main-shelf-title">Most Frequent Artists</h2>
                            </div>
                        </div>
                    </div>
                    <InlineGrid>{artistCards}</InlineGrid>
                </section>
                <section className="main-shelf-shelf Shelf">
                    <div className="main-shelf-header">
                        <div className="main-shelf-topRow">
                            <div className="main-shelf-titleWrapper">
                                <h2 className="TypeElement-canon-textBase-type main-shelf-title">Most Frequent Albums</h2>
                            </div>
                        </div>
                    </div>
                    <InlineGrid>{albumCards}</InlineGrid>
                </section>
                <section className="main-shelf-shelf Shelf">
                    <div className="main-shelf-header">
                        <div className="main-shelf-topRow">
                            <div className="main-shelf-titleWrapper">
                                <h2 className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-textBase-type main-shelf-title">Release Year Distribution</h2>
                            </div>
                        </div>
                    </div>
                    <section>
                        <GenresCard genres={library.years} total={library.yearsDenominator} />
                    </section>
                </section>
            </PageHeader>
        </>
    );
};

export default React.memo(LibraryPage);
