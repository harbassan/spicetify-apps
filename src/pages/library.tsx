import React from "react";
import DropdownMenu from "../components/dropdown";
import StatCard from "../components/stat_card";
import GenresCard from "../components/genres_card";
import ArtistCard from "../components/artist_card";

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

const LibraryPage = () => {
    const [library, setLibrary] = React.useState<LibraryProps | null>(null);

    const fetchData = async (option: string) => {
        const start = window.performance.now();

        // fetch all rootlist items
        let dart = window.performance.now();
        const rootlistItems = await Spicetify.CosmosAsync.get("sp://core-playlist/v1/rootlist");
        console.log("rootlist fetch time: " + (window.performance.now() - dart) + "ms");

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

        if (option === "owned") {
            playlists = playlists.filter((playlist: any) => playlist.ownedBySelf);
        }

        let playlistUris: string[] = [];
        let trackCount: number = 0;

        playlists.forEach(playlist => {
            if (playlist.totalLength === 0) return;
            playlistUris.push(playlist.link);
            trackCount += playlist.totalLength;
        }, 0);

        // fetch all playlist tracks
        dart = window.performance.now();
        const playlistsMeta = await Promise.all(
            playlistUris.map((uri: string) => {
                return Spicetify.CosmosAsync.get(`sp://core-playlist/v1/playlist/${uri}?responseFormat=protobufJson`);
                // return Spicetify.CosmosAsync.get(`sp://core-playlist/v1/playlist/${uri}/rows`);
            })
        );
        console.log("playlist fetch time: " + (window.performance.now() - dart) + "ms");

        let totalDuration = 0;
        let trackUids: string[] = [];
        let artists: Record<string, number> = {};
        let allTracks: any[] = [];
        let totalObscurity: number = 0;
        let albums: any[] = [];
        let explicitTracks: number = 0;

        // loop through all playlists, add up total duration and obscurity, seperate track ids and artists
        playlistsMeta.forEach(playlist => {
            totalDuration += Number(playlist.duration);
            playlist.item.forEach((item: any) => {
                if (!item.trackMetadata) return;
                trackUids.push(item.trackMetadata.link.split(":")[2]);
                allTracks.push(item);
                if (item.trackMetadata.isExplicit) explicitTracks++;
                totalObscurity += item.trackMetadata.popularity;
                const index = albums.findIndex(([g]) => g.link === item.trackMetadata.album.link);
                if (index !== -1) {
                    albums[index][1] += 1;
                } else {
                    albums.push([item.trackMetadata.album, 1]);
                }
                item.trackMetadata.artist.forEach((artist: any) => {
                    if (!artists[artist.link.split(":")[2]]) {
                        artists[artist.link.split(":")[2]] = 1;
                    } else {
                        artists[artist.link.split(":")[2]] += 1;
                    }
                });
            });
        });

        const topAlbums = albums.sort((a, b) => b[1] - a[1]).slice(0, 10);

        const topArtists = Object.keys(artists)
            .sort((a, b) => artists[b] - artists[a])
            .slice(0, 50);

        dart = window.performance.now();
        const artistsMeta = await Spicetify.CosmosAsync.get(`https://api.spotify.com/v1/artists?ids=${topArtists.join(",")}`);
        console.log("artists fetch time: " + (window.performance.now() - dart) + "ms");

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

        dart = window.performance.now();
        const fetchedFeatures: any[] = await fetchAudioFeatures(trackUids);
        console.log("audio features fetch time: " + (window.performance.now() - dart) + "ms");

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

        for (let i = 0; i < fetchedFeatures.length; i++) {
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

        setLibrary({
            audioFeatures: audioFeatures,
            trackCount: trackCount,
            totalDuration: totalDuration,
            artists: artistsMeta.artists,
            artistCount: Object.keys(artists).length,
            genres: topGenres,
            playlistCount: playlists.length,
            albums: topAlbums,
        });

        console.log("total fetch time: " + (window.performance.now() - start) + "ms");
    };

    const fetchAudioFeatures = async (ids: string[]) => {
        const batchSize = 100;
        const batches = [];

        // Split ids into batches of batchSize
        for (let i = 0; i < ids.length; i += batchSize) {
            const batch = ids.slice(i, i + batchSize);
            batches.push(batch);
        }

        // Send multiple simultaneous requests using Promise.all()
        const promises = batches.map(batch => {
            const url = `https://api.spotify.com/v1/audio-features?ids=${batch.join(",")}`;
            return Spicetify.CosmosAsync.get(url);
        });

        const responses = await Promise.all(promises);

        // Merge responses from all batches into a single array
        const data = responses.reduce((acc, response) => {
            return acc.concat(response.audio_features);
        }, []);

        return data;
    };

    React.useEffect(() => {
        fetchData("all");
    }, []);

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
            <ArtistCard name={artist.name} image={artist.images[2].url} uri={artist.uri} subtext={`Appears in ${artist.numTracks} tracks`} />
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

    const handleDropdownChange = (option: string) => {
        fetchData(option === "My Playlists" ? "owned" : "all");
    };

    return (
        <>
            <section className="contentSpacing">
                <div className={`collection-collection-header stats-header`}>
                    <h1 data-encore-id="type" className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-type">
                        Library Analysis
                    </h1>
                    <div className="collection-searchBar-searchBar">
                        <DropdownMenu links={["Whole Library", "My Playlists"]} switchCallback={handleDropdownChange} />
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
