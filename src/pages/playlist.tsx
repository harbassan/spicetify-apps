import React from "react";
import StatCard from "../components/cards/stat_card";
import GenresCard from "../components/cards/genres_card";
import ArtistCard from "../components/cards/artist_card";
import { apiRequest, fetchAudioFeatures, fetchTopArtists, fetchTopAlbums } from "../funcs";
import Status from "../components/status";
import InlineGrid from "../components/inline_grid";

interface LibraryProps {
    audioFeatures: Record<string, number>;
    trackCount: number;
    totalDuration: number;
    artistCount: number;
    genres: [string, number][];
    genresDenominator: number;
    years: [string, number][];
    yearsDenominator: number;
    artists: { name: string; uri: string; image: string; freq: number }[];
    albums: { name: string; uri: string; image: string; freq: number }[];
}

const PlaylistPage = ({ uri }: { uri: string }) => {
    const [library, setLibrary] = React.useState<LibraryProps | null | false>(null);

    const fetchData = async () => {
        const start = window.performance.now();

        const playlistMeta = await apiRequest("playlistMeta", `sp://core-playlist/v1/playlist/${uri}`);
        if (!playlistMeta) {
            setLibrary(false);
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

    if (library === null)
        return (
            <>
                <Status icon="library" heading="Analysing The Playlist" subheading="This might take a while" />
            </>
        );
    if (!library)
        return (
            <>
                <Status icon="error" heading="Failed to Fetch Playlist Stats" subheading="Make an issue on Github" />
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

    const artistCards: JSX.Element[] = library.artists.map((artist: any) => (
        <ArtistCard name={artist.name} image={artist.image} uri={artist.uri} subtext={`Appears in ${artist.freq} tracks`} />
    ));

    const albumCards: JSX.Element[] = library.albums.map(album => {
        return <ArtistCard name={album.name} image={album.image} uri={album.uri} subtext={`Appears in ${album.freq} tracks`} />;
    });

    return (
        <div className="stats-page">
            <section className="stats-libraryOverview">
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
                <GenresCard genres={library.genres} total={library.genresDenominator} />
                <InlineGrid special>{statCards}</InlineGrid>
            </section>
            <section className="main-shelf-shelf Shelf">
                <div className="main-shelf-header">
                    <div className="main-shelf-topRow">
                        <div className="main-shelf-titleWrapper">
                            <h2 className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-textBase-type main-shelf-title">Most Frequent Artists</h2>
                        </div>
                    </div>
                </div>
                <InlineGrid>{artistCards}</InlineGrid>
            </section>
            <section className="main-shelf-shelf Shelf">
                <div className="main-shelf-header">
                    <div className="main-shelf-topRow">
                        <div className="main-shelf-titleWrapper">
                            <h2 className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-textBase-type main-shelf-title">Most Frequent Albums</h2>
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
        </div>
    );
};

export default React.memo(PlaylistPage);
