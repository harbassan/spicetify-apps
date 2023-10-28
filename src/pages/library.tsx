import React from "react";
import useDropdownMenu from "../components/useDropdownMenu";
import StatCard from "../components/stat_card";
import GenresCard from "../components/genres_card";
import ArtistCard from "../components/artist_card";
import RefreshButton from "../components/refresh_button";
import { apiRequest, updatePageCache } from "../funcs";

interface LibraryProps {
    audioFeatures: Record<string, number>;
    trackCount: number;
    totalDuration: number;
    artistCount: number;
    artists: any[];
    genres: [string, number][];
    playlistCount: number;
    albums: any[];
}

const fetchAudioFeatures = async (ids: string[]) => {
    const batchSize = 100;
    const batches = [];

    ids = ids.filter(id => id.match(/^[a-zA-Z0-9]{22}$/));

    // Split ids into batches of batchSize
    for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        batches.push(batch);
    }

    // Send multiple simultaneous requests using Promise.all()
    const promises = batches.map((batch, index) => {
        const url = `https://api.spotify.com/v1/audio-features?ids=${batch.join(",")}`;
        return apiRequest("audioFeaturesBatch" + index, url);
    });

    const responses = await Promise.all(promises);

    // Merge responses from all batches into a single array
    const data = responses.reduce((acc, response) => {
        return acc.concat(response.audio_features);
    }, []);

    return data;
};

const LibraryPage = () => {
    const [library, setLibrary] = React.useState<LibraryProps | null>(null);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(["owned", "all"], ["My Playlists", "All Playlists"], "library");

    const fetchData = async (option: string, force?: boolean, set: boolean = true) => {
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

        let playlists = flattenPlaylists(rootlistItems.rows);

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
                return apiRequest("playlistsMetadata", `sp://core-playlist/v1/playlist/${uri}?responseFormat=protobufJson`);
            })
        );

        let totalDuration = 0;
        let trackUids: string[] = [];
        let artists: Record<string, number> = {};
        let totalObscurity: number = 0;
        let albums: any[] = [];
        let explicitTracks: number = 0;

        let ownedDuration = 0;
        let ownedArtists: Record<string, number> = {};
        let ownedObscurity: number = 0;
        let ownedAlbums: any[] = [];
        let ownedExplicitTracks: number = 0;

        // loop through all playlists, add up total duration and obscurity, seperate track ids and artists
        for (let i = 0; i < playlistsMeta.length; i++) {
            const playlist = playlistsMeta[i];
            if (i === indexOfFirstNotOwned) {
                ownedDuration = totalDuration;
                ownedArtists = Object.assign({}, artists);
                ownedObscurity = totalObscurity;
                ownedExplicitTracks = explicitTracks;
            }
            totalDuration += Number(playlist.duration);
            playlist.item.forEach((item: any) => {
                if (!item.trackMetadata) return;
                trackUids.push(item.trackMetadata.link.split(":")[2]);
                if (item.trackMetadata.isExplicit) explicitTracks++;
                totalObscurity += item.trackMetadata.popularity;
                const index = albums.findIndex(([g]) => g.link === item.trackMetadata.album.link);
                if (index !== -1) {
                    albums[index][1] += 1;
                    if (i < indexOfFirstNotOwned) ownedAlbums[index][1] += 1;
                } else {
                    albums.push([item.trackMetadata.album, 1]);
                    if (i < indexOfFirstNotOwned) ownedAlbums.push([item.trackMetadata.album, 1]);
                }
                item.trackMetadata.artist.forEach((artist: any) => {
                    if (!artists[artist.link.split(":")[2]]) {
                        artists[artist.link.split(":")[2]] = 1;
                    } else {
                        artists[artist.link.split(":")[2]] += 1;
                    }
                });
            });
        }

        const topAlbums = albums.sort((a, b) => b[1] - a[1]).slice(0, 10);
        const ownedTopAlbums = ownedAlbums.sort((a, b) => b[1] - a[1]).slice(0, 10);

        const topArtists = Object.keys(artists)
            .sort((a, b) => artists[b] - artists[a])
            .filter(id => id.match(/^[a-zA-Z0-9]{22}$/))
            .slice(0, 50);
        const ownedTopArtists = Object.keys(ownedArtists)
            .sort((a, b) => ownedArtists[b] - ownedArtists[a])
            .filter(id => id.match(/^[a-zA-Z0-9]{22}$/))
            .slice(0, 50);

        const artistsMeta = await apiRequest("artistsMetadata", `https://api.spotify.com/v1/artists?ids=${topArtists.join(",")}`);
        const ownedArtistsMeta = ownedTopArtists.length && await apiRequest("artistsMetadata", `https://api.spotify.com/v1/artists?ids=${ownedTopArtists.join(",")}`);

        const topGenres: [string, number][] = artistsMeta.artists.reduce((acc: [string, number][], artist: any) => {
            artist.numTracks = artists[artist.id];
            artist.genres.forEach((genre: string) => {
                const index = acc.findIndex(([g]) => g === genre);
                if (index !== -1) {
                    acc[index][1] += artist.numTracks;
                } else {
                    acc.push([genre, artist.numTracks]);
                }
            });
            return acc;
        }, []);

        const ownedTopGenres: [string, number][] = ownedArtistsMeta.artists?.reduce((acc: [string, number][], artist: any) => {
            artist.numTracks = ownedArtists[artist.id];
            artist.genres.forEach((genre: string) => {
                const index = acc.findIndex(([g]) => g === genre);
                if (index !== -1) {
                    acc[index][1] += artist.numTracks;
                } else {
                    acc.push([genre, artist.numTracks]);
                }
            });
            return acc;
        }, []);

        const fetchedFeatures: any[] = await fetchAudioFeatures(trackUids);

        const audioFeatures: Record<string, number> = {
            popularity: totalObscurity,
            explicitness: explicitTracks,
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

        const ownedAudioFeatures: Record<string, number> = {
            popularity: ownedObscurity,
            explicitness: ownedExplicitTracks,
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

        for (let i = 0; i < fetchedFeatures.length; i++) {
            if (i === ownedTrackCount) {
                for (let key in audioFeatures) {
                    ownedAudioFeatures[key] = audioFeatures[key];
                }
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
            artists: ownedArtistsMeta?.artists,
            artistCount: Object.keys(ownedArtists).length,
            genres: ownedTopGenres,
            playlistCount: indexOfFirstNotOwned > 0 ? indexOfFirstNotOwned : 0,
            albums: ownedTopAlbums,
        };

        const allStats = {
            audioFeatures: audioFeatures,
            trackCount: trackCount,
            totalDuration: totalDuration,
            artists: artistsMeta.artists,
            artistCount: Object.keys(artists).length,
            genres: topGenres,
            playlistCount: playlists.length,
            albums: topAlbums,
        };

        if (set) {
            if (option === "all") setLibrary(allStats);
            else setLibrary(ownedStats);
        }

        Spicetify.LocalStorage.set(`stats:library:all`, JSON.stringify(allStats));
        Spicetify.LocalStorage.set(`stats:library:owned`, JSON.stringify(ownedStats));

        console.log("total library fetch time:", window.performance.now() - start);
    };

    React.useEffect(() => {
        updatePageCache(3, fetchData, activeOption, true);
    }, []);

    React.useEffect(() => {
        fetchData(activeOption);
    }, [activeOption]);

    if (!library)
        return (
            <>
                <div className="stats-loadingWrapper">
                    <svg
                        role="img"
                        height="46"
                        width="46"
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        data-encore-id="icon"
                        className="Svg-sc-ytk21e-0 Svg-img-24-icon"
                    >
                        <path d="M14.5 2.134a1 1 0 0 1 1 0l6 3.464a1 1 0 0 1 .5.866V21a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V3a1 1 0 0 1 .5-.866zM16 4.732V20h4V7.041l-4-2.309zM3 22a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1zm6 0a1 1 0 0 1-1-1V3a1 1 0 0 1 2 0v18a1 1 0 0 1-1 1z"></path>
                    </svg>
                    <h1>Analysing Your Library</h1>
                </div>
            </>
        );

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
        .map((artist: any) => (
            <ArtistCard
                name={artist.name}
                image={
                    artist.images[2]
                        ? artist.images[2].url
                        : artist.images[1]
                        ? artist.images[1].url
                        : "https://images.squarespace-cdn.com/content/v1/55fc0004e4b069a519961e2d/1442590746571-RPGKIXWGOO671REUNMCB/image-asset.gif"
                }
                uri={artist.uri}
                subtext={`Appears in ${artist.numTracks} tracks`}
            />
        ));

    const albumCards: JSX.Element[] = library.albums.map(([album, frequency]) => {
        return <ArtistCard name={album.name} image={album.covers.standardLink} uri={album.link} subtext={`Appears in ${frequency} tracks`} />;
    });

    const scrollGrid = (event: any) => {
        const grid = event.target.parentNode.querySelector("div");

        grid.scrollLeft += grid.clientWidth;
    };

    const scrollGridLeft = (event: any) => {
        const grid = event.target.parentNode.querySelector("div");
        grid.scrollLeft -= grid.clientWidth;
    };

    return (
        <>
            <section className="contentSpacing">
                <div className={`collection-collection-header stats-header`}>
                    <h1 data-encore-id="type" className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-type">
                        Library Analysis
                    </h1>
                    <div className="collection-searchBar-searchBar">
                        <RefreshButton
                            refreshCallback={() => {
                                fetchData(activeOption, true);
                            }}
                        />
                        {dropdown}
                    </div>
                </div>
                <div className="stats-page">
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
                                    <h2 className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-textBase-type main-shelf-title">Most Frequent Genres</h2>
                                </div>
                            </div>
                        </div>
                        <GenresCard genres={library.genres} total={library.trackCount} />
                        <section className="stats-gridInlineSection">
                            <button className="stats-scrollButton" onClick={scrollGridLeft}>
                                {"<"}
                            </button>
                            <button className="stats-scrollButton" onClick={scrollGrid}>
                                {">"}
                            </button>
                            <div className={`main-gridContainer-gridContainer stats-gridInline stats-specialGrid`}>{statCards}</div>
                        </section>
                    </section>
                    <section className="main-shelf-shelf Shelf">
                        <div className="main-shelf-header">
                            <div className="main-shelf-topRow">
                                <div className="main-shelf-titleWrapper">
                                    <h2 className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-textBase-type main-shelf-title">Most Frequent Artists</h2>
                                </div>
                            </div>
                        </div>
                        <section className="stats-gridInlineSection">
                            <button className="stats-scrollButton" onClick={scrollGridLeft}>
                                {"<"}
                            </button>
                            <button className="stats-scrollButton" onClick={scrollGrid}>
                                {">"}
                            </button>
                            <div className={`main-gridContainer-gridContainer stats-gridInline`}>{artistCards}</div>
                        </section>
                    </section>
                    <section className="main-shelf-shelf Shelf">
                        <div className="main-shelf-header">
                            <div className="main-shelf-topRow">
                                <div className="main-shelf-titleWrapper">
                                    <h2 className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-textBase-type main-shelf-title">Most Frequent Albums</h2>
                                </div>
                            </div>
                        </div>
                        <section className="stats-gridInlineSection">
                            <button className="stats-scrollButton" onClick={scrollGridLeft}>
                                {"<"}
                            </button>
                            <button className="stats-scrollButton" onClick={scrollGrid}>
                                {">"}
                            </button>
                            <div className={`main-gridContainer-gridContainer stats-gridInline`}>{albumCards}</div>
                        </section>
                    </section>
                </div>
            </section>
        </>
    );
};

export default React.memo(LibraryPage);
