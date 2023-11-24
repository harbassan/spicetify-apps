import React from "react";
import useDropdownMenu from "../components/hooks/useDropdownMenu";
import StatCard from "../components/cards/stat_card";
import GenresCard from "../components/cards/genres_card";
import { apiRequest, updatePageCache } from "../funcs";
import InlineGrid from "../components/inline_grid";
import Status from "../components/status";
import PageHeader from "../components/page_header";
import { topArtistsReq } from "./top_artists";
import { topTracksReq } from "./top_tracks";

const GenresPage = ({ config }: any) => {
    const [topGenres, setTopGenres] = React.useState<
        | {
              genres: [string, number][];
              features: any;
              years: [string, number][];
          }
        | 100
        | 200
        | 300
    >(100);
    const [dropdown, activeOption, setActiveOption] = useDropdownMenu(
        ["short_term", "medium_term", "long_term"],
        ["Past Month", "Past 6 Months", "All Time"],
        "top-genres"
    );

    const fetchTopGenres = async (time_range: string, force?: boolean, set: boolean = true, force_refetch?: boolean) => {
        if (!force) {
            let storedData = Spicetify.LocalStorage.get(`stats:top-genres:${time_range}`);
            if (storedData) {
                setTopGenres(JSON.parse(storedData));
                return;
            }
        }
        const start = window.performance.now();

        const cacheInfo = JSON.parse(Spicetify.LocalStorage.get("stats:cache-info") as string);

        const fetchedItems = await Promise.all(
            ["artists", "tracks"].map(async (type: string, index: number) => {
                if (cacheInfo[index] === true && !force_refetch) {
                    return await JSON.parse(Spicetify.LocalStorage.get(`stats:top-${type}:${time_range}`) as string);
                }
                const fetchedItems = await (type === "artists" ? topArtistsReq(time_range, config) : topTracksReq(time_range, config));
                cacheInfo[index] = true;
                cacheInfo[2] = true;
                Spicetify.LocalStorage.set(`stats:top-${type}:${time_range}`, JSON.stringify(fetchedItems));
                Spicetify.LocalStorage.set("stats:cache-info", JSON.stringify(cacheInfo));
                return fetchedItems;
            })
        );

        for (let i = 0; i < 2; i++) {
            if (fetchedItems[i] === 200 || fetchedItems[i] === 300) return setTopGenres(fetchedItems[i]);
        }

        const fetchedArtists = fetchedItems[0].filter((artist: any) => artist?.genres);
        const fetchedTracks = fetchedItems[1].filter((track: any) => track?.id);

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
        let releaseData: [string, number][] = [];
        const topTracks = fetchedTracks.map((track: any) => {
            trackPopularity += track.popularity;
            if (track.explicit) explicitness++;
            if (track.release_year) {
                const year = track.release_year;
                const index = releaseData.findIndex(([y]) => y === year);
                if (index !== -1) {
                    releaseData[index][1] += 1;
                } else {
                    releaseData.push([year, 1]);
                }
            }
            return track.id;
        });

        const featureData = await fetchAudioFeatures(topTracks);
        if (!featureData) {
            setTopGenres(200);
            return;
        }

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

        if (set) setTopGenres({ genres: genres, features: audioFeatures, years: releaseData });

        Spicetify.LocalStorage.set(`stats:top-genres:${time_range}`, JSON.stringify({ genres: genres, features: audioFeatures, years: releaseData }));
    };

    const fetchAudioFeatures = async (ids: string[]) => {
        ids = ids.filter(id => id.match(/^[a-zA-Z0-9]{22}$/));
        const data = await apiRequest("audioFeatures", `https://api.spotify.com/v1/audio-features?ids=${ids.join(",")}`);
        return data;
    };

    React.useEffect(() => {
        updatePageCache(2, fetchTopGenres, activeOption);
    }, []);

    React.useEffect(() => {
        fetchTopGenres(activeOption);
    }, [activeOption]);

    const props = {
        callback: () => fetchTopGenres(activeOption, true, true, true),
        config: config,
        dropdown: dropdown,
    };

    switch (topGenres) {
        case 300:
            return (
                <PageHeader title={`Top Genres`} {...props}>
                    <Status icon="error" heading="No API Key or Username" subheading="Please enter these in the settings menu" />
                </PageHeader>
            );
        case 200:
            return (
                <PageHeader title="Top Genres" {...props}>
                    <Status icon="error" heading="Failed to Fetch Top Genres" subheading="An error occurred while fetching the data" />
                </PageHeader>
            );
        case 100:
            return (
                <PageHeader title={`Top Genres`} {...props}>
                    <Status icon="library" heading="Loading" subheading="Fetching data..." />
                </PageHeader>
            );
    }

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
            <PageHeader title="Top Genres" {...props}>
                <section>
                    <GenresCard genres={topGenres.genres} total={1275} />
                    <InlineGrid special>{statCards}</InlineGrid>
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
                        <GenresCard genres={topGenres.years} total={50} />
                    </section>
                </section>
            </PageHeader>
        </>
    );
};

export default React.memo(GenresPage);
