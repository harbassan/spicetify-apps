import React from "react";
import useDropdownMenu from "../components/useDropdownMenu";
import StatCard from "../components/stat_card";
import GenresCard from "../components/genres_card";
import RefreshButton from "../components/refresh_button";
import { apiRequest, updatePageCache } from "../funcs";

const GenresPage = () => {
    const [topGenres, setTopGenres] = React.useState<{
        genres: [string, number][];
        features: any;
    }>({ genres: [], features: {} });
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        "top-genres"
    );

    const fetchTopGenres = async (time_range: string, force?: boolean, set: boolean = true) => {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:top-genres:${time_range}`);
            if (storedData) {
                setTopGenres(JSON.parse(storedData));
                return;
            }
        }
        const start = window.performance.now();
        const [fetchedArtists, fetchedTracks] = await Promise.all([
            apiRequest("topArtists", `https://api.spotify.com/v1/me/top/artists?limit=50&offset=0&time_range=${time_range}`).then((res: any) => res.items),
            apiRequest("topTracks", `https://api.spotify.com/v1/me/top/tracks?limit=50&offset=0&time_range=${time_range}`).then((res: any) => res.items),
        ]);
        const genres: [string, number][] = fetchedArtists.reduce((acc: [string, number][], artist: any) => {
            artist.genres.forEach((genre: string) => {
                const index = acc.findIndex(([g]) => g === genre);
                if (index !== -1) {
                    acc[index][1] += 1 * Math.abs(fetchedArtists.indexOf(artist) - 50);
                } else {
                    acc.push([genre, 1 * Math.abs(fetchedArtists.indexOf(artist) - 50)]);
                }
            });
            return acc;
        }, []);
        let trackPopularity = 0;
        let explicitness = 0;
        const topTracks = fetchedTracks.map((track: any) => {
            trackPopularity += track.popularity;
            if (track.explicit) explicitness++;
            return track.id;
        });

        const featureData = await fetchAudioFeatures(topTracks);
        const audioFeatures = featureData.audio_features.reduce(
            (acc: { [key: string]: number }, track: any) => {
                acc["danceability"] += track["danceability"];
                acc["energy"] += track["energy"];
                acc["valence"] += track["valence"];
                acc["speechiness"] += track["speechiness"];
                acc["acousticness"] += track["acousticness"];
                acc["instrumentalness"] += track["instrumentalness"];
                acc["liveness"] += track["liveness"];
                acc["tempo"] += track["tempo"];
                acc["loudness"] += track["loudness"];
                return acc;
            },
            {
                popularity: trackPopularity,
                explicitness: explicitness,
                danceability: 0,
                energy: 0,
                valence: 0,
                speechiness: 0,
                acousticness: 0,
                instrumentalness: 0,
                liveness: 0,
                tempo: 0,
                loudness: 0,
            }
        );
        for (let key in audioFeatures) {
            audioFeatures[key] = audioFeatures[key] / 50;
        }
        console.log("total genres fetch time:", window.performance.now() - start);

        if (set) setTopGenres({ genres: genres, features: audioFeatures });

        Spicetify.LocalStorage.set(`stats:top-genres:${time_range}`, JSON.stringify({ genres: genres, features: audioFeatures }));
    };

    const fetchAudioFeatures = async (ids: string[]) => {
        const data = apiRequest("audioFeatures", `https://api.spotify.com/v1/audio-features?ids=${ids.join(",")}`);
        return data;
    };

    React.useEffect(() => {
        updatePageCache(2, fetchTopGenres, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopGenres(activeOption);
    }, [activeOption]);

    if (!topGenres.genres.length) return <></>;

    const parseVal = (key: string) => {
        switch (key) {
            case "tempo":
                return Math.round(topGenres.features[key]) + "bpm";
            case "loudness":
                return Math.round(topGenres.features[key]) + "dB";
            case "popularity":
                return Math.round(topGenres.features[key]) + "%";
            default:
                return Math.round(topGenres.features[key] * 100) + "%";
        }
    };

    const statCards = [];
    for (let key in topGenres.features) {
        statCards.push(<StatCard stat={key[0].toUpperCase() + key.slice(1)} value={parseVal(key)} />);
    }

    return (
        <>
            <section className="contentSpacing">
                <div className={`collection-collection-header stats-header`}>
                    <h1 data-encore-id="type" className="Type__TypeElement-sc-goli3j-0 TypeElement-canon-type">
                        Top Genres
                    </h1>
                    <div className="collection-searchBar-searchBar">
                        <RefreshButton
                            refreshCallback={() => {
                                fetchTopGenres(activeOption, true);
                            }}
                        />
                        {dropdown}
                    </div>
                </div>
                <div className="stats-page">
                    <section>
                        <GenresCard genres={topGenres.genres} total={1275} />
                    </section>
                    <section>
                        <div className={`main-gridContainer-gridContainer stats-grid`}>{statCards}</div>
                    </section>
                </div>
            </section>
        </>
    );
};

export default React.memo(GenresPage);
